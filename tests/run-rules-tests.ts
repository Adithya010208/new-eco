/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
  RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  getDocs,
  deleteField,
} from 'firebase/firestore';
import fs from 'node:fs';
import { FirestoreAdapter } from '../src/services/firestoreAdapter';

const PROJECT_ID = 'eco-build-aa966';

async function runSecurityTests() {
  console.log('=== Initializing Firebase Emulator Security Test Suite (Phase 4A & Findings 1-11) ===');
  console.log(`Target Project: ${PROJECT_ID}`);

  const rulesContent = fs.readFileSync('firestore.rules', 'utf8');

  const testEnv: RulesTestEnvironment = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      rules: rulesContent,
      host: '127.0.0.1',
      port: 8080,
    },
  });

  let passedCount = 0;
  let failedCount = 0;

  async function testCase(name: string, fn: () => Promise<void>) {
    try {
      await fn();
      console.log(`  [PASS] ${name}`);
      passedCount++;
    } catch (err: any) {
      console.error(`  [FAIL] ${name}: ${err?.message || err}`);
      failedCount++;
    }
  }

  // Clear before testing
  await testEnv.clearFirestore();

  console.log('\n--- 1. Testing Unauthenticated Access Rejection ---');
  const unauthDb = testEnv.unauthenticatedContext().firestore();

  await testCase('Unauthenticated read of user profile is denied', async () => {
    await assertFails(getDoc(doc(unauthDb, 'users', 'alice')));
  });

  await testCase('Unauthenticated read of private inventory is denied', async () => {
    await assertFails(getDoc(doc(unauthDb, 'users', 'alice', 'inventory', 'item1')));
  });

  await testCase('Unauthenticated listing of private inventory is denied', async () => {
    await assertFails(getDocs(collection(unauthDb, 'users', 'alice', 'inventory')));
  });

  await testCase('Unauthenticated read of saved projects is denied', async () => {
    await assertFails(getDoc(doc(unauthDb, 'users', 'alice', 'savedProjects', 'proj1')));
  });

  await testCase('Unauthenticated read of guide progress is denied', async () => {
    await assertFails(getDoc(doc(unauthDb, 'users', 'alice', 'guideProgress', 'proj-smart-dustbin_v1')));
  });

  console.log('\n--- 2. Testing User A (Alice) Permitted Operations ---');
  const aliceDb = testEnv.authenticatedContext('alice').firestore();

  await testCase('Alice can create her own valid user profile', async () => {
    await assertSucceeds(
      setDoc(doc(aliceDb, 'users', 'alice'), {
        displayName: 'Alice Maker',
        experience: 'Beginner',
        interests: ['robotics'],
        skills: ['soldering'],
        preferredDifficulty: 'Beginner',
        availableTime: '1-2 hours / week',
        collaborationPreference: 'Solo maker',
        bio: 'Sustainable maker.',
      })
    );
  });

  await testCase('Alice can read her own user profile', async () => {
    await assertSucceeds(getDoc(doc(aliceDb, 'users', 'alice')));
  });

  await testCase('Alice can update her own user profile', async () => {
    await assertSucceeds(
      updateDoc(doc(aliceDb, 'users', 'alice'), {
        experience: 'Intermediate',
      })
    );
  });

  const validItem = {
    id: 'item_uno',
    ownerId: 'alice',
    catalogId: 'comp-arduino-uno',
    name: 'Arduino Uno R3',
    category: 'microcontroller',
    totalQuantity: 2, // int
    reservedQuantity: 0, // int
    installedQuantity: 0, // int
    condition: 'working',
    source: 'purchased',
    unitMassGrams: 25.5, // float/number permitted
    verificationStatus: 'user-reported-working',
    lastUpdated: new Date().toISOString(),
  };

  await testCase('Alice can create a working item with integer quantities and float mass in inventory', async () => {
    await assertSucceeds(
      setDoc(doc(aliceDb, 'users', 'alice', 'inventory', 'item_uno'), validItem)
    );
  });

  const unsafeItem = {
    id: 'item_swollen_lipo',
    ownerId: 'alice',
    catalogId: 'comp-battery-pack',
    name: 'Swollen LiPo 3.7V Cell',
    category: 'power',
    totalQuantity: 1, // int
    reservedQuantity: 0, // int
    installedQuantity: 0, // int
    condition: 'unsafe', // Explicit domain model condition for hazardous/quarantined parts
    source: 'salvaged',
    unitMassGrams: 45.2,
    notes: 'Quarantined in flame-retardant pouch. Do not charge or puncture.',
    verificationStatus: 'untested',
    lastUpdated: new Date().toISOString(),
  };

  await testCase('Alice can log an unsafe/quarantined component in inventory', async () => {
    await assertSucceeds(
      setDoc(doc(aliceDb, 'users', 'alice', 'inventory', 'item_swollen_lipo'), unsafeItem)
    );
  });

  await testCase('Alice can read items in her private inventory', async () => {
    await assertSucceeds(
      getDoc(doc(aliceDb, 'users', 'alice', 'inventory', 'item_uno'))
    );
    await assertSucceeds(
      getDoc(doc(aliceDb, 'users', 'alice', 'inventory', 'item_swollen_lipo'))
    );
  });

  await testCase('Alice can list items in her private inventory', async () => {
    await assertSucceeds(
      getDocs(collection(aliceDb, 'users', 'alice', 'inventory'))
    );
  });

  await testCase('Alice can update an item in her private inventory', async () => {
    await assertSucceeds(
      updateDoc(doc(aliceDb, 'users', 'alice', 'inventory', 'item_uno'), {
        condition: 'partially-working',
      })
    );
  });

  await testCase('Alice can create a saved project bookmark', async () => {
    await assertSucceeds(
      setDoc(doc(aliceDb, 'users', 'alice', 'savedProjects', 'proj-smart-dustbin'), {
        projectId: 'proj-smart-dustbin',
        savedAt: new Date().toISOString(),
      })
    );
  });

  await testCase('Alice can read her saved project bookmarks', async () => {
    await assertSucceeds(
      getDocs(collection(aliceDb, 'users', 'alice', 'savedProjects'))
    );
  });

  await testCase('Alice can save valid standalone 3D guide progress matching supported recipe (proj-smart-dustbin / v1)', async () => {
    await assertSucceeds(
      setDoc(doc(aliceDb, 'users', 'alice', 'guideProgress', 'proj-smart-dustbin_v1'), {
        progressId: 'proj-smart-dustbin_v1',
        projectId: 'proj-smart-dustbin',
        recipeVersion: 'v1',
        currentStepIndex: 2, // int
        completedStepIndices: [0, 1], // valid indices in [0..5]
        playbackSpeed: 1.5, // number/float permitted
        isLearningCompleted: false,
        lastUpdated: new Date().toISOString(),
      })
    );
  });

  await testCase('Alice can read her standalone 3D guide progress', async () => {
    await assertSucceeds(
      getDoc(doc(aliceDb, 'users', 'alice', 'guideProgress', 'proj-smart-dustbin_v1'))
    );
  });

  console.log('\n--- 3. Testing User B (Bob) Cross-Account Access Denials ---');
  const bobDb = testEnv.authenticatedContext('bob').firestore();

  await testCase('Bob cannot read Alice’s profile', async () => {
    await assertFails(getDoc(doc(bobDb, 'users', 'alice')));
  });

  await testCase('Bob cannot list users', async () => {
    await assertFails(getDocs(collection(bobDb, 'users')));
  });

  await testCase('Bob cannot overwrite Alice’s profile', async () => {
    await assertFails(
      setDoc(doc(bobDb, 'users', 'alice'), {
        displayName: 'Bob Hacked Alice',
        experience: 'Beginner',
      })
    );
  });

  await testCase('Bob cannot delete Alice’s profile', async () => {
    await assertFails(deleteDoc(doc(bobDb, 'users', 'alice')));
  });

  await testCase('Bob cannot read Alice’s private inventory items', async () => {
    await assertFails(
      getDoc(doc(bobDb, 'users', 'alice', 'inventory', 'item_uno'))
    );
  });

  await testCase('Bob cannot list Alice’s private inventory', async () => {
    await assertFails(
      getDocs(collection(bobDb, 'users', 'alice', 'inventory'))
    );
  });

  await testCase('Bob cannot create an item in Alice’s inventory', async () => {
    await assertFails(
      setDoc(doc(bobDb, 'users', 'alice', 'inventory', 'hacked_item'), {
        id: 'hacked_item',
        ownerId: 'alice',
        catalogId: 'comp-arduino-uno',
        name: 'Injected Component',
        category: 'microcontroller',
        totalQuantity: 1,
        condition: 'working',
        source: 'salvaged',
        verificationStatus: 'untested',
        lastUpdated: new Date().toISOString(),
      })
    );
  });

  await testCase('Bob cannot update Alice’s inventory item', async () => {
    await assertFails(
      updateDoc(doc(bobDb, 'users', 'alice', 'inventory', 'item_uno'), {
        condition: 'faulty',
      })
    );
  });

  await testCase('Bob cannot delete Alice’s inventory item', async () => {
    await assertFails(
      deleteDoc(doc(bobDb, 'users', 'alice', 'inventory', 'item_uno'))
    );
  });

  await testCase('Bob cannot read Alice’s saved projects', async () => {
    await assertFails(
      getDoc(doc(bobDb, 'users', 'alice', 'savedProjects', 'proj-smart-dustbin'))
    );
  });

  await testCase('Bob cannot list Alice’s saved projects', async () => {
    await assertFails(
      getDocs(collection(bobDb, 'users', 'alice', 'savedProjects'))
    );
  });

  await testCase('Bob cannot delete Alice’s saved project', async () => {
    await assertFails(
      deleteDoc(doc(bobDb, 'users', 'alice', 'savedProjects', 'proj-smart-dustbin'))
    );
  });

  await testCase('Bob cannot read Alice’s guide progress', async () => {
    await assertFails(
      getDoc(doc(bobDb, 'users', 'alice', 'guideProgress', 'proj-smart-dustbin_v1'))
    );
  });

  await testCase('Bob cannot update or delete Alice’s guide progress', async () => {
    await assertFails(
      deleteDoc(doc(bobDb, 'users', 'alice', 'guideProgress', 'proj-smart-dustbin_v1'))
    );
  });

  console.log('\n--- 4. Testing Strict hasOnly() Field Allowlists & Anti-Tampering ---');

  await testCase('Profile with unexpected field is rejected by hasOnly()', async () => {
    await assertFails(
      setDoc(doc(aliceDb, 'users', 'alice'), {
        displayName: 'Alice Maker',
        experience: 'Beginner',
        unexpectedInjectedField: 'malicious_payload',
      })
    );
  });

  await testCase('Profile with isAdmin privilege field is rejected', async () => {
    await assertFails(
      setDoc(doc(aliceDb, 'users', 'alice'), {
        displayName: 'Alice Root',
        experience: 'Advanced',
        isAdmin: true,
      })
    );
  });

  await testCase('Profile with role field is rejected', async () => {
    await assertFails(
      setDoc(doc(aliceDb, 'users', 'alice'), {
        displayName: 'Alice Root',
        experience: 'Advanced',
        role: 'superadmin',
      })
    );
  });

  await testCase('Inventory item with unexpected field is rejected by hasOnly()', async () => {
    await assertFails(
      setDoc(doc(aliceDb, 'users', 'alice', 'inventory', 'item_injected'), {
        ...validItem,
        id: 'item_injected',
        unregisteredField: 'malicious',
      })
    );
  });

  await testCase('Saved project with unexpected field is rejected by hasOnly()', async () => {
    await assertFails(
      setDoc(doc(aliceDb, 'users', 'alice', 'savedProjects', 'proj_extra'), {
        projectId: 'proj_extra',
        savedAt: new Date().toISOString(),
        extraTrackingField: 'not_allowed',
      })
    );
  });

  console.log('\n--- 5. Testing Guide Progress Recipe Scope & Integer Validation ---');

  await testCase('Guide progress with unsupported projectId is rejected', async () => {
    await assertFails(
      setDoc(doc(aliceDb, 'users', 'alice', 'guideProgress', 'proj-solar-tracker_v1'), {
        progressId: 'proj-solar-tracker_v1',
        projectId: 'proj-solar-tracker', // Unsupported project in Phase 4A
        recipeVersion: 'v1',
        currentStepIndex: 1,
      })
    );
  });

  await testCase('Guide progress with unsupported recipeVersion is rejected', async () => {
    await assertFails(
      setDoc(doc(aliceDb, 'users', 'alice', 'guideProgress', 'proj-smart-dustbin_v2'), {
        progressId: 'proj-smart-dustbin_v2',
        projectId: 'proj-smart-dustbin',
        recipeVersion: 'v2', // Unsupported recipe version
        currentStepIndex: 1,
      })
    );
  });

  await testCase('Guide progress with fractional currentStepIndex (e.g. 2.5) is rejected', async () => {
    await assertFails(
      setDoc(doc(aliceDb, 'users', 'alice', 'guideProgress', 'proj-smart-dustbin_v1'), {
        progressId: 'proj-smart-dustbin_v1',
        projectId: 'proj-smart-dustbin',
        recipeVersion: 'v1',
        currentStepIndex: 2.5, // Fractional float, must be int
      })
    );
  });

  await testCase('Guide progress currentStepIndex > 5 (exceeding recipe bounds) is rejected', async () => {
    await assertFails(
      setDoc(doc(aliceDb, 'users', 'alice', 'guideProgress', 'proj-smart-dustbin_v1'), {
        progressId: 'proj-smart-dustbin_v1',
        projectId: 'proj-smart-dustbin',
        recipeVersion: 'v1',
        currentStepIndex: 9, // Recipe has steps 0..5
      })
    );
  });

  await testCase('Alice can save standalone guide progress for proj-night-light v1 (steps 0..3)', async () => {
    await assertSucceeds(
      setDoc(doc(aliceDb, 'users', 'alice', 'guideProgress', 'proj-night-light_v1'), {
        progressId: 'proj-night-light_v1',
        projectId: 'proj-night-light',
        recipeVersion: 'v1',
        currentStepIndex: 2,
        completedStepIndices: [0, 1],
        playbackSpeed: 1.0,
        isLearningCompleted: false,
        lastUpdated: new Date().toISOString(),
      })
    );
  });

  console.log('\n--- 6. Testing Inventory Quantities & Cross-Subcollection Isolation ---');

  await testCase('Inventory item with fractional totalQuantity is rejected', async () => {
    await assertFails(
      setDoc(doc(aliceDb, 'users', 'alice', 'inventory', 'item_frac_total'), {
        ...validItem,
        id: 'item_frac_total',
        totalQuantity: 2.5, // Must be int
      })
    );
  });

  await testCase('Bob cannot forge Alice’s ownerId in his own subcollection', async () => {
    await assertFails(
      setDoc(doc(bobDb, 'users', 'bob', 'inventory', 'forged_item'), {
        id: 'forged_item',
        ownerId: 'alice',
        catalogId: 'comp-arduino-uno',
        name: 'Forged Ownership Part',
        category: 'microcontroller',
        totalQuantity: 1,
        reservedQuantity: 0,
        installedQuantity: 0,
        condition: 'working',
        source: 'purchased',
        verificationStatus: 'untested',
        lastUpdated: new Date().toISOString(),
      })
    );
  });

  await testCase('Alice cannot reassign item ownerId to Bob during update', async () => {
    await assertFails(
      updateDoc(doc(aliceDb, 'users', 'alice', 'inventory', 'item_uno'), {
        ownerId: 'bob',
      })
    );
  });

  // Setup inventory item for sharing tests
  const shareableItem = {
    id: 'item_servo_shareable',
    ownerId: 'alice',
    catalogId: 'comp-sg90-servo',
    name: 'SG90 Micro Servo',
    category: 'actuator',
    totalQuantity: 4,
    reservedQuantity: 0,
    installedQuantity: 0,
    condition: 'working',
    source: 'purchased',
    unitMassGrams: 14.0,
    verificationStatus: 'user-reported-working',
    lastUpdated: new Date().toISOString(),
  };

  await testCase('Alice sets up shareable inventory item', async () => {
    await assertSucceeds(
      setDoc(doc(aliceDb, 'users', 'alice', 'inventory', 'item_servo_shareable'), shareableItem)
    );
  });

  // ========================================================
  // FINDING 1: Shared Components
  // ========================================================
  console.log('\n--- Finding 1: Shared Components Permissions & Ownership ---');
  const shareId = 'alice_comp_servo_share';

  await testCase('Alice can share component referencing her existing inventory item', async () => {
    await assertSucceeds(
      setDoc(doc(aliceDb, 'shared_components', shareId), {
        id: shareId,
        ownerId: 'alice',
        ownerDisplayName: 'Alice Maker',
        inventoryItemId: 'item_servo_shareable',
        catalogId: 'comp-sg90-servo',
        name: 'SG90 Micro Servo',
        category: 'actuator',
        quantity: 2,
        condition: 'working',
        verificationStatus: 'user-reported-working',
        unitMassGrams: 14.0,
        isShared: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
    );
  });

  await testCase('Sharing component referencing non-existent inventory is rejected', async () => {
    await assertFails(
      setDoc(doc(aliceDb, 'shared_components', 'alice_fake_share'), {
        id: 'alice_fake_share',
        ownerId: 'alice',
        ownerDisplayName: 'Alice Maker',
        inventoryItemId: 'item_does_not_exist',
        catalogId: 'comp-sg90-servo',
        name: 'Fake Servo',
        category: 'actuator',
        quantity: 1,
        condition: 'working',
        verificationStatus: 'untested',
        isShared: true,
      })
    );
  });

  await testCase('Owner takeover attempt (Bob trying to update Alice’s shared component) is rejected', async () => {
    await assertFails(
      updateDoc(doc(bobDb, 'shared_components', shareId), {
        ownerId: 'bob',
        quantity: 10,
      })
    );
  });

  await testCase('Alice can update her own shared component quantity', async () => {
    await assertSucceeds(
      updateDoc(doc(aliceDb, 'shared_components', shareId), {
        quantity: 3,
        updatedAt: new Date().toISOString(),
      })
    );
  });

  await testCase('Alice cannot reassign ownerId during update of shared component', async () => {
    await assertFails(
      updateDoc(doc(aliceDb, 'shared_components', shareId), {
        ownerId: 'bob',
      })
    );
  });

  await testCase('Alice cannot modify inventoryItemId during update of shared component', async () => {
    await assertFails(
      updateDoc(doc(aliceDb, 'shared_components', shareId), {
        inventoryItemId: 'item_uno',
      })
    );
  });

  // ========================================================
  // FINDING 8: Discovery (Privacy-aligned reads)
  // ========================================================
  console.log('\n--- Finding 8: Discovery & Publication-Aware Rules ---');

  await testCase('Alice publishes discoverable profile with isDiscoverable: true', async () => {
    await assertSucceeds(
      setDoc(doc(aliceDb, 'discoverable_profiles', 'alice'), {
        uid: 'alice',
        displayName: 'Alice Maker',
        bio: 'Sustainable maker.',
        experience: 'Intermediate',
        interests: ['robotics'],
        skills: ['soldering'],
        collaborationPreference: 'Open to team builds',
        isDiscoverable: true,
        isMentor: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
    );
  });

  await testCase('Bob can read Alice’s published discoverable profile', async () => {
    await assertSucceeds(getDoc(doc(bobDb, 'discoverable_profiles', 'alice')));
  });

  await testCase('Alice opts out by setting isDiscoverable: false', async () => {
    await assertSucceeds(
      updateDoc(doc(aliceDb, 'discoverable_profiles', 'alice'), {
        isDiscoverable: false,
        updatedAt: new Date().toISOString(),
      })
    );
  });

  await testCase('Bob cannot read Alice’s unpublished profile directly (Direct read denied)', async () => {
    await assertFails(getDoc(doc(bobDb, 'discoverable_profiles', 'alice')));
  });

  await testCase('Alice can still read her own unpublished profile', async () => {
    await assertSucceeds(getDoc(doc(aliceDb, 'discoverable_profiles', 'alice')));
  });

  // Re-publish Alice and publish Bob as an eligible mentor
  await testCase('Setup: Alice re-publishes, Bob publishes as an eligible mentor', async () => {
    await assertSucceeds(
      updateDoc(doc(aliceDb, 'discoverable_profiles', 'alice'), {
        isDiscoverable: true,
        updatedAt: new Date().toISOString(),
      })
    );
    await assertSucceeds(
      setDoc(doc(bobDb, 'discoverable_profiles', 'bob'), {
        uid: 'bob',
        displayName: 'Bob Builder',
        bio: 'Senior hardware tutor.',
        experience: 'Advanced',
        interests: ['robotics'],
        skills: ['firmware', 'circuit-design'],
        collaborationPreference: 'Open to team builds',
        isDiscoverable: true,
        isMentor: true,
        mentorTopics: ['understanding-circuit', 'troubleshooting'],
        mentorAvailabilityNotes: 'Available weekends',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
    );
  });

  // ========================================================
  // FINDING 4: Mentorship Tickets & Role Transitions
  // ========================================================
  console.log('\n--- Finding 4: Mentorship Role Transitions & Eligibility ---');
  const ticketId = 'ticket_alice_bob_mentorship';
  const charlieDb = testEnv.authenticatedContext('charlie').firestore();

  await testCase('Creating ticket referencing non-mentor Charlie is rejected', async () => {
    await assertFails(
      setDoc(doc(aliceDb, 'mentorship_tickets', 'ticket_invalid_mentor'), {
        id: 'ticket_invalid_mentor',
        requesterId: 'alice',
        requesterDisplayName: 'Alice Maker',
        mentorId: 'charlie', // Charlie has no mentor profile
        mentorDisplayName: 'Charlie Outsider',
        projectId: 'proj-smart-dustbin',
        projectTitle: 'Smart Dustbin',
        question: 'Help with servo?',
        status: 'open',
        createdAt: new Date().toISOString(),
      })
    );
  });

  await testCase('Alice creates valid open ticket for eligible mentor Bob', async () => {
    await assertSucceeds(
      setDoc(doc(aliceDb, 'mentorship_tickets', ticketId), {
        id: ticketId,
        requesterId: 'alice',
        requesterDisplayName: 'Alice Maker',
        mentorId: 'bob',
        mentorDisplayName: 'Bob Builder',
        projectId: 'proj-smart-dustbin',
        projectTitle: 'Smart Dustbin',
        question: 'How do I bridge the external 5V supply ground to Uno GND?',
        status: 'open',
        responses: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
    );
  });

  await testCase('Requester Alice cannot accept her own ticket (mentor role transition enforced)', async () => {
    await assertFails(
      updateDoc(doc(aliceDb, 'mentorship_tickets', ticketId), {
        status: 'accepted',
      })
    );
  });

  await testCase('Third-party Charlie is denied reading or replying to ticket', async () => {
    await assertFails(getDoc(doc(charlieDb, 'mentorship_tickets', ticketId)));
    await assertFails(
      updateDoc(doc(charlieDb, 'mentorship_tickets', ticketId), {
        status: 'accepted',
      })
    );
  });

  await testCase('Assigned mentor Bob legitimately accepts ticket and posts reply', async () => {
    await assertSucceeds(
      updateDoc(doc(bobDb, 'mentorship_tickets', ticketId), {
        status: 'accepted',
        responses: [
          {
            id: 'resp_1',
            authorId: 'bob',
            authorDisplayName: 'Bob Builder',
            content: 'Tie Uno GND to the battery ground rail on your breadboard.',
            createdAt: new Date().toISOString(),
          },
        ],
        updatedAt: new Date().toISOString(),
      })
    );
  });

  await testCase('Ticket context tampering (altering question during update) is rejected', async () => {
    await assertFails(
      updateDoc(doc(bobDb, 'mentorship_tickets', ticketId), {
        question: 'Altered question content without permission',
      })
    );
  });

  await testCase('Alice can mark accepted ticket as resolved', async () => {
    await assertSucceeds(
      updateDoc(doc(aliceDb, 'mentorship_tickets', ticketId), {
        status: 'resolved',
        resolvedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
    );
  });

  await testCase('Reopening resolved ticket back to open is rejected', async () => {
    await assertFails(
      updateDoc(doc(aliceDb, 'mentorship_tickets', ticketId), {
        status: 'open',
      })
    );
  });

  // ========================================================
  // FINDING 2 & 9: Collaboration Proposals & Reservation Protocol
  // ========================================================
  console.log('\n--- Findings 2 & 9: Collaboration Proposals & Reservation Protocol ---');
  const proposalId = 'prop_collab_alpha';

  await testCase('Alice sends collaboration proposal to Bob with agreed contributions', async () => {
    await assertSucceeds(
      setDoc(doc(aliceDb, 'collaboration_proposals', proposalId), {
        id: proposalId,
        projectId: 'proj-smart-dustbin',
        projectTitle: 'Smart Dustbin',
        senderId: 'alice',
        senderDisplayName: 'Alice Maker',
        receiverId: 'bob',
        receiverDisplayName: 'Bob Builder',
        senderContributions: [{ catalogId: 'comp-arduino-uno', name: 'Arduino Uno', quantity: 1 }],
        receiverContributions: [{ catalogId: 'comp-sg90-servo', name: 'Micro Servo', quantity: 1 }],
        status: 'pending',
        createdAt: new Date().toISOString(),
      })
    );
  });

  await testCase('Forged acceptance (Sender Alice trying to accept own proposal) is rejected', async () => {
    await assertFails(
      updateDoc(doc(aliceDb, 'collaboration_proposals', proposalId), {
        status: 'accepted',
      })
    );
  });

  await testCase('Third-party Charlie cannot accept proposal', async () => {
    await assertFails(
      updateDoc(doc(charlieDb, 'collaboration_proposals', proposalId), {
        status: 'accepted',
      })
    );
  });

  await testCase('Contribution rewriting by receiver during acceptance is rejected', async () => {
    await assertFails(
      updateDoc(doc(bobDb, 'collaboration_proposals', proposalId), {
        status: 'accepted',
        senderContributions: [{ catalogId: 'comp-arduino-uno', name: 'Arduino Uno', quantity: 5 }], // Rewritten!
      })
    );
  });

  await testCase('Receiver Bob legitimately accepts proposal with workspaceId', async () => {
    await assertSucceeds(
      updateDoc(doc(bobDb, 'collaboration_proposals', proposalId), {
        status: 'accepted',
        workspaceId: 'ws_dustbin_collab_alpha',
        respondedAt: new Date().toISOString(),
      })
    );
  });

  await testCase('Client deleting senderContributions via deleteField() is rejected', async () => {
    await assertFails(
      updateDoc(doc(bobDb, 'collaboration_proposals', proposalId), {
        senderContributions: deleteField(),
      })
    );
  });

  await testCase('Client deleting receiverContributions via deleteField() is rejected', async () => {
    await assertFails(
      updateDoc(doc(bobDb, 'collaboration_proposals', proposalId), {
        receiverContributions: deleteField(),
      })
    );
  });

  await testCase('Reopening terminal proposal (accepted -> pending) is rejected', async () => {
    await assertFails(
      updateDoc(doc(bobDb, 'collaboration_proposals', proposalId), {
        status: 'pending',
      })
    );
  });

  const propCancelId = 'prop_to_be_cancelled';
  await testCase('Sender Alice can cancel pending proposal, and terminal cancelled state cannot reopen', async () => {
    await assertSucceeds(
      setDoc(doc(aliceDb, 'collaboration_proposals', propCancelId), {
        id: propCancelId,
        projectId: 'proj-smart-dustbin',
        projectTitle: 'Smart Dustbin',
        senderId: 'alice',
        receiverId: 'bob',
        senderContributions: [{ catalogId: 'comp-arduino-uno', name: 'Arduino Uno', quantity: 1 }],
        receiverContributions: [],
        status: 'pending',
        createdAt: new Date().toISOString(),
      })
    );
    await assertSucceeds(
      updateDoc(doc(aliceDb, 'collaboration_proposals', propCancelId), {
        status: 'cancelled',
        respondedAt: new Date().toISOString(),
      })
    );
    await assertFails(
      updateDoc(doc(aliceDb, 'collaboration_proposals', propCancelId), {
        status: 'pending',
      })
    );
  });

  // Competing stock reservation bounds test
  await testCase('Concurrent proposal stock competition: updating reservedQuantity exceeding total is rejected', async () => {
    // Alice's item_uno has totalQuantity: 2.
    await assertFails(
      updateDoc(doc(aliceDb, 'users', 'alice', 'inventory', 'item_uno'), {
        reservedQuantity: 3, // 3 > 2! Violates reservedQuantity + installedQuantity <= totalQuantity
      })
    );
  });

  // ========================================================
  // FINDINGS 1, 2, 3, 11: Workspaces, Self-Removal & Consent
  // ========================================================
  console.log('\n--- Finding 1, 2, 3 & 11: Workspaces, Exact Self-Removal & Consent Model ---');
  const workspaceId = 'ws_dustbin_collab_alpha';

  await testCase('Creator Alice creates project workspace with members [alice, bob]', async () => {
    await assertSucceeds(
      setDoc(doc(aliceDb, 'project_workspaces', workspaceId), {
        id: workspaceId,
        projectId: 'proj-smart-dustbin',
        projectTitle: 'Smart Dustbin',
        creatorId: 'alice',
        memberIds: ['alice', 'bob'],
        memberRoles: { alice: 'Circuit Assembly', bob: 'Firmware Calibration' },
        status: 'active',
        reservations: [],
        tasks: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
    );
  });

  await testCase('Ordinary member Bob attempting to delete reservations via deleteField() is rejected', async () => {
    await assertFails(
      updateDoc(doc(bobDb, 'project_workspaces', workspaceId), {
        reservations: deleteField(),
      })
    );
  });

  await testCase('Ordinary member Bob attempting to alter reservations is rejected', async () => {
    await assertFails(
      updateDoc(doc(bobDb, 'project_workspaces', workspaceId), {
        reservations: [{ id: 'res_fake', quantity: 99 }],
      })
    );
  });

  await testCase('Unauthorized member injection (Ordinary member Bob injecting Charlie) is rejected', async () => {
    await assertFails(
      updateDoc(doc(bobDb, 'project_workspaces', workspaceId), {
        memberIds: ['alice', 'bob', 'charlie'],
      })
    );
  });

  await testCase('Unauthorized member eviction (Ordinary member Bob evicting creator Alice) is rejected', async () => {
    await assertFails(
      updateDoc(doc(bobDb, 'project_workspaces', workspaceId), {
        memberIds: ['bob'],
      })
    );
  });

  await testCase('Ordinary member Bob rewriting creatorId is rejected', async () => {
    await assertFails(
      updateDoc(doc(bobDb, 'project_workspaces', workspaceId), {
        creatorId: 'bob',
      })
    );
  });

  await testCase('Ordinary member Bob changing workspace lifecycle state to completed is rejected', async () => {
    await assertFails(
      updateDoc(doc(bobDb, 'project_workspaces', workspaceId), {
        status: 'completed',
      })
    );
  });

  // Issue 1: Exact self-removal invariants vs replacements, duplicates, and creator self-removal
  await testCase('Self-removal with member replacement (Bob replacing himself with Charlie [alice, charlie]) is rejected', async () => {
    await assertFails(
      updateDoc(doc(bobDb, 'project_workspaces', workspaceId), {
        memberIds: ['alice', 'charlie'],
      })
    );
  });

  await testCase('Self-removal with duplicate injection (Bob sending [alice, alice]) is rejected', async () => {
    await assertFails(
      updateDoc(doc(bobDb, 'project_workspaces', workspaceId), {
        memberIds: ['alice', 'alice'],
      })
    );
  });

  await testCase('Creator Alice attempting self-removal ([bob]) is rejected', async () => {
    await assertFails(
      updateDoc(doc(aliceDb, 'project_workspaces', workspaceId), {
        memberIds: ['bob'],
      })
    );
  });

  await testCase('Creator Alice adding Charlie WITHOUT accepted invitation proposal is rejected', async () => {
    await assertFails(
      updateDoc(doc(aliceDb, 'project_workspaces', workspaceId), {
        memberIds: ['alice', 'bob', 'charlie'],
      })
    );
  });

  await testCase('Member Bob legitimately self-removes producing exactly [alice]', async () => {
    await assertSucceeds(
      updateDoc(doc(bobDb, 'project_workspaces', workspaceId), {
        memberIds: ['alice'],
        memberRoles: { alice: 'Circuit Assembly' },
        updatedAt: new Date().toISOString(),
      })
    );
  });

  // Now create an accepted proposal for Charlie to join the workspace
  const charlieProposalId = 'prop_charlie_invite_accepted';
  await testCase('Setup: Alice creates proposal for Charlie and Charlie accepts with workspaceId', async () => {
    await assertSucceeds(
      setDoc(doc(aliceDb, 'collaboration_proposals', charlieProposalId), {
        id: charlieProposalId,
        projectId: 'proj-smart-dustbin',
        projectTitle: 'Smart Dustbin',
        senderId: 'alice',
        receiverId: 'charlie',
        senderContributions: [],
        receiverContributions: [],
        status: 'pending',
        createdAt: new Date().toISOString(),
      })
    );
    await assertSucceeds(
      updateDoc(doc(charlieDb, 'collaboration_proposals', charlieProposalId), {
        status: 'accepted',
        workspaceId,
        respondedAt: new Date().toISOString(),
      })
    );
  });

  await testCase('Creator Alice adds Charlie with verified accepted invitation proposal', async () => {
    await assertSucceeds(
      updateDoc(doc(aliceDb, 'project_workspaces', workspaceId), {
        memberIds: ['alice', 'charlie'],
        memberRoles: { alice: 'Circuit Assembly', charlie: 'Sensors' },
        acceptedProposalId: charlieProposalId,
        updatedAt: new Date().toISOString(),
      })
    );
  });

  // ========================================================
  // ISSUE 3: Append-Only Message & Response Authorship
  // ========================================================
  console.log('\n--- Issue 3: Append-Only Message & Response Authorship and Anti-Impersonation ---');
  const msg1Id = 'msg_team_alpha_01';

  await testCase('Workspace member Alice posts message with authorId alice in messages subcollection', async () => {
    await assertSucceeds(
      setDoc(doc(aliceDb, 'project_workspaces', workspaceId, 'messages', msg1Id), {
        id: msg1Id,
        workspaceId,
        authorId: 'alice',
        authorDisplayName: 'Alice Maker',
        content: 'Welcome Charlie to the Smart Dustbin workspace!',
        createdAt: new Date().toISOString(),
      })
    );
  });

  await testCase('Member Charlie attempting to impersonate Alice (authorId: alice) is rejected', async () => {
    await assertFails(
      setDoc(doc(charlieDb, 'project_workspaces', workspaceId, 'messages', 'msg_forged'), {
        id: 'msg_forged',
        workspaceId,
        authorId: 'alice', // Impersonation!
        content: 'I am Alice but actually Charlie.',
        createdAt: new Date().toISOString(),
      })
    );
  });

  await testCase('Member Charlie attempting to update past message is rejected (append-only)', async () => {
    await assertFails(
      updateDoc(doc(charlieDb, 'project_workspaces', workspaceId, 'messages', msg1Id), {
        content: 'Tampered message text.',
      })
    );
  });

  await testCase('Member Charlie attempting to delete past message is rejected', async () => {
    await assertFails(
      deleteDoc(doc(charlieDb, 'project_workspaces', workspaceId, 'messages', msg1Id))
    );
  });

  await testCase('Outsider Bob attempting to write message in workspace is rejected', async () => {
    await assertFails(
      setDoc(doc(bobDb, 'project_workspaces', workspaceId, 'messages', 'msg_outsider'), {
        id: 'msg_outsider',
        workspaceId,
        authorId: 'bob',
        content: 'Outsider trying to talk.',
        createdAt: new Date().toISOString(),
      })
    );
  });

  // Mentorship responses subcollection authorship
  const testTicketId = 'ticket_authorship_test';
  await testCase('Setup: Alice creates mentorship ticket for Bob', async () => {
    await assertSucceeds(
      setDoc(doc(aliceDb, 'mentorship_tickets', testTicketId), {
        id: testTicketId,
        requesterId: 'alice',
        mentorId: 'bob',
        projectId: 'proj-smart-dustbin',
        projectTitle: 'Smart Dustbin',
        question: 'How do I debounce the ultrasonic sensor in C++?',
        status: 'open',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
    );
  });

  const respId = 'resp_mentor_01';
  await testCase('Mentor Bob posts response in responses subcollection with authorId bob', async () => {
    await assertSucceeds(
      setDoc(doc(bobDb, 'mentorship_tickets', testTicketId, 'responses', respId), {
        id: respId,
        ticketId: testTicketId,
        authorId: 'bob',
        authorDisplayName: 'Bob Builder',
        content: 'Use an averaging window of 5 samples and discard readings > 400cm.',
        createdAt: new Date().toISOString(),
      })
    );
  });

  await testCase('Requester Alice attempting to impersonate mentor Bob in responses is rejected', async () => {
    await assertFails(
      setDoc(doc(aliceDb, 'mentorship_tickets', testTicketId, 'responses', 'resp_fake'), {
        id: 'resp_fake',
        ticketId: testTicketId,
        authorId: 'bob', // Impersonating Bob!
        content: 'Forged advice.',
        createdAt: new Date().toISOString(),
      })
    );
  });

  await testCase('Editing or deleting mentorship responses is rejected (append-only)', async () => {
    await assertFails(
      updateDoc(doc(bobDb, 'mentorship_tickets', testTicketId, 'responses', respId), {
        content: 'Tampered response.',
      })
    );
    await assertFails(
      deleteDoc(doc(bobDb, 'mentorship_tickets', testTicketId, 'responses', respId))
    );
  });

  // ========================================================
  // ISSUE 4: Shared Workspace Guide Progress & Recipe Scope
  // ========================================================
  console.log('\n--- Issue 4: Shared Workspace Guide Progress Ownership & Recipe Scope ---');
  const progressDocId = 'proj-smart-dustbin_v1';

  await testCase('Workspace member Alice writes shared guideProgress for proj-smart-dustbin_v1', async () => {
    await assertSucceeds(
      setDoc(doc(aliceDb, 'project_workspaces', workspaceId, 'guideProgress', progressDocId), {
        progressId: progressDocId,
        projectId: 'proj-smart-dustbin',
        recipeVersion: 'v1',
        currentStepIndex: 2,
        completedStepIndices: [0, 1],
        lastUpdated: new Date().toISOString(),
        lastUpdatedBy: 'alice',
      })
    );
  });

  await testCase('Workspace member Charlie advances shared guideProgress step to 3', async () => {
    await assertSucceeds(
      updateDoc(doc(charlieDb, 'project_workspaces', workspaceId, 'guideProgress', progressDocId), {
        currentStepIndex: 3,
        completedStepIndices: [0, 1, 2],
        lastUpdated: new Date().toISOString(),
        lastUpdatedBy: 'charlie',
      })
    );
  });

  await testCase('Member Charlie impersonating Alice in lastUpdatedBy is rejected', async () => {
    await assertFails(
      updateDoc(doc(charlieDb, 'project_workspaces', workspaceId, 'guideProgress', progressDocId), {
        currentStepIndex: 4,
        lastUpdatedBy: 'alice', // Impersonation!
      })
    );
  });

  await testCase('Progress with invalid currentStepIndex > 5 (exceeding recipe bounds) is rejected', async () => {
    await assertFails(
      updateDoc(doc(charlieDb, 'project_workspaces', workspaceId, 'guideProgress', progressDocId), {
        currentStepIndex: 10,
        lastUpdatedBy: 'charlie',
      })
    );
  });

  await testCase('Progress with fractional currentStepIndex (2.5) is rejected', async () => {
    await assertFails(
      updateDoc(doc(charlieDb, 'project_workspaces', workspaceId, 'guideProgress', progressDocId), {
        currentStepIndex: 2.5,
        lastUpdatedBy: 'charlie',
      })
    );
  });

  await testCase('Progress referencing mismatched recipe (proj-night-light on smart dustbin workspace) is rejected', async () => {
    await assertFails(
      setDoc(doc(charlieDb, 'project_workspaces', workspaceId, 'guideProgress', 'proj-night-light_v1'), {
        progressId: 'proj-night-light_v1',
        projectId: 'proj-night-light', // Mismatched! Workspace is proj-smart-dustbin
        recipeVersion: 'v1',
        currentStepIndex: 1,
        lastUpdatedBy: 'charlie',
      })
    );
  });

  await testCase('Outsider Bob is denied reading or writing workspace guideProgress', async () => {
    await assertFails(
      getDoc(doc(bobDb, 'project_workspaces', workspaceId, 'guideProgress', progressDocId))
    );
    await assertFails(
      setDoc(doc(bobDb, 'project_workspaces', workspaceId, 'guideProgress', progressDocId), {
        progressId: progressDocId,
        projectId: 'proj-smart-dustbin',
        recipeVersion: 'v1',
        currentStepIndex: 1,
        lastUpdatedBy: 'bob',
      })
    );
  });

  await testCase('Deleting shared workspace guide progress is rejected', async () => {
    await assertFails(
      deleteDoc(doc(aliceDb, 'project_workspaces', workspaceId, 'guideProgress', progressDocId))
    );
  });

  // ========================================================
  // FINDING 5: Exchanges & Handover Confirmation
  // ========================================================
  console.log('\n--- Finding 5: Component Exchanges & Explicit Handover Confirmation ---');
  const exchangeId = 'ex_sonar_unit_1';

  await testCase('Alice publishes component exchange listing', async () => {
    await assertSucceeds(
      setDoc(doc(aliceDb, 'component_exchange_listings', exchangeId), {
        id: exchangeId,
        ownerId: 'alice',
        ownerDisplayName: 'Alice Maker',
        catalogId: 'comp-hc-sr04',
        name: 'HC-SR04 Ultrasonic Distance Sensor',
        category: 'sensor',
        quantity: 2,
        condition: 'working',
        listingType: 'free-donation',
        status: 'available',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
    );
  });

  await testCase('Ownership takeover attempt (Bob changing ownerId to bob) is rejected', async () => {
    await assertFails(
      updateDoc(doc(bobDb, 'component_exchange_listings', exchangeId), {
        ownerId: 'bob',
      })
    );
  });

  await testCase('Requester Bob altering component quantity during claim is rejected', async () => {
    await assertFails(
      updateDoc(doc(bobDb, 'component_exchange_listings', exchangeId), {
        status: 'requested',
        requesterId: 'bob',
        quantity: 100, // Altered!
      })
    );
  });

  await testCase('Requester Bob claims listing legitimately', async () => {
    await assertSucceeds(
      updateDoc(doc(bobDb, 'component_exchange_listings', exchangeId), {
        status: 'requested',
        requesterId: 'bob',
        catalogId: 'comp-hc-sr04',
        quantity: 2,
        updatedAt: new Date().toISOString(),
      })
    );
  });

  await testCase('Forged completion (Requester Bob marking status: completed without owner) is rejected', async () => {
    await assertFails(
      updateDoc(doc(bobDb, 'component_exchange_listings', exchangeId), {
        status: 'completed',
      })
    );
  });

  await testCase('Owner Alice explicitly confirms handover completion', async () => {
    await assertSucceeds(
      updateDoc(doc(aliceDb, 'component_exchange_listings', exchangeId), {
        status: 'completed',
        updatedAt: new Date().toISOString(),
      })
    );
  });

  await testCase('Deleting a completed listing is rejected', async () => {
    await assertFails(deleteDoc(doc(aliceDb, 'component_exchange_listings', exchangeId)));
  });

  // ========================================================
  // FINDING 6: Reviews (Deterministic ID & Completed Interactions)
  // ========================================================
  console.log('\n--- Finding 6: Verified Interaction Reviews ---');

  // Creator Alice marks workspace as completed
  await testCase('Creator Alice marks workspace as completed', async () => {
    await assertSucceeds(
      updateDoc(doc(aliceDb, 'project_workspaces', workspaceId), {
        status: 'completed',
        updatedAt: new Date().toISOString(),
      })
    );
  });

  const validReviewId = `${workspaceId}_charlie`;

  await testCase('Charlie submits deterministic review for Alice for completed workspace', async () => {
    await assertSucceeds(
      setDoc(doc(charlieDb, 'interaction_reviews', validReviewId), {
        id: validReviewId,
        interactionId: workspaceId,
        interactionType: 'workspace',
        reviewerId: 'charlie',
        reviewerDisplayName: 'Charlie Circuit',
        targetMakerId: 'alice',
        rating: 5,
        feedback: 'Fantastic collaboration on the breadboard layout and clean wiring.',
        createdAt: new Date().toISOString(),
      })
    );
  });

  await testCase('Non-deterministic review ID is rejected', async () => {
    await assertFails(
      setDoc(doc(charlieDb, 'interaction_reviews', 'random_review_id_123'), {
        id: 'random_review_id_123',
        interactionId: workspaceId,
        interactionType: 'workspace',
        reviewerId: 'charlie',
        targetMakerId: 'alice',
        rating: 5,
        feedback: 'Great job!',
        createdAt: new Date().toISOString(),
      })
    );
  });

  await testCase('Non-participant Bob (self-removed) attempting to post review is rejected', async () => {
    const bobReviewId = `${workspaceId}_bob`;
    await assertFails(
      setDoc(doc(bobDb, 'interaction_reviews', bobReviewId), {
        id: bobReviewId,
        interactionId: workspaceId,
        interactionType: 'workspace',
        reviewerId: 'bob',
        targetMakerId: 'alice',
        rating: 5,
        feedback: 'Outsider fake review.',
        createdAt: new Date().toISOString(),
      })
    );
  });

  await testCase('Self-review (Charlie reviewing Charlie) is rejected', async () => {
    const selfReviewId = `${workspaceId}_charlie_self`;
    await assertFails(
      setDoc(doc(charlieDb, 'interaction_reviews', selfReviewId), {
        id: selfReviewId,
        interactionId: workspaceId,
        interactionType: 'workspace',
        reviewerId: 'charlie',
        targetMakerId: 'charlie',
        rating: 5,
        feedback: 'I did great.',
        createdAt: new Date().toISOString(),
      })
    );
  });

  await testCase('Reviews are immutable and cannot be updated once posted', async () => {
    await assertFails(
      updateDoc(doc(charlieDb, 'interaction_reviews', validReviewId), {
        rating: 1,
      })
    );
  });

  // ========================================================
  // FINDING 7: Append-Only Hardware Reuse Ledger
  // ========================================================
  console.log('\n--- Finding 7: Append-Only Hardware Reuse Ledger & Reversals ---');
  const ledgerEntryId = 'rl_build_completed_1';

  await testCase('Alice appends completed physical build entry to private reuse ledger', async () => {
    await assertSucceeds(
      setDoc(doc(aliceDb, 'users', 'alice', 'reuseLedger', ledgerEntryId), {
        id: ledgerEntryId,
        timestamp: new Date().toISOString(),
        eventType: 'physical-build-completed',
        makerId: 'alice',
        projectId: 'proj-smart-dustbin',
        projectTitle: 'Smart Dustbin',
        totalMassGrams: 85.0,
        allocatedItems: [
          {
            inventoryItemId: 'item_servo_shareable',
            catalogId: 'comp-sg90-servo',
            name: 'SG90 Micro Servo',
            quantity: 1,
            unitMassGrams: 14.0,
          },
        ],
      })
    );
  });

  await testCase('Mutating past reuse ledger record is strictly rejected (append-only)', async () => {
    await assertFails(
      updateDoc(doc(aliceDb, 'users', 'alice', 'reuseLedger', ledgerEntryId), {
        totalMassGrams: 500.0,
      })
    );
  });

  await testCase('Deleting past reuse ledger record is strictly rejected', async () => {
    await assertFails(
      deleteDoc(doc(aliceDb, 'users', 'alice', 'reuseLedger', ledgerEntryId))
    );
  });

  await testCase('Ledger record with negative quantity is rejected', async () => {
    await assertFails(
      setDoc(doc(aliceDb, 'users', 'alice', 'reuseLedger', 'rl_negative_entry'), {
        id: 'rl_negative_entry',
        timestamp: new Date().toISOString(),
        eventType: 'allocated_to_build',
        quantity: -2,
      })
    );
  });

  await testCase('Alice records valid correction/reversal entry to correct allocation', async () => {
    const reversalId = 'rl_reversal_build_1';
    await assertSucceeds(
      setDoc(doc(aliceDb, 'users', 'alice', 'reuseLedger', reversalId), {
        id: reversalId,
        timestamp: new Date().toISOString(),
        eventType: 'correction_reversal',
        notes: 'Reversal of build allocation for test harness calibration.',
        totalMassGrams: 85.0,
      })
    );
  });

  // ========================================================
  // FINDING 10: Organizations & Moderation Workflow Boundaries
  // ========================================================
  console.log('\n--- Finding 10: Institutional Pilot Organizations & Moderation ---');
  const orgId = 'org_pilot_makerspace';

  await testCase('Admin Alice creates organization with members [alice, bob]', async () => {
    await assertSucceeds(
      setDoc(doc(aliceDb, 'organizations', orgId), {
        id: orgId,
        name: 'Community Makerspace Hub',
        adminUids: ['alice'],
        memberUids: ['alice', 'bob'],
        createdAt: new Date().toISOString(),
      })
    );
  });

  await testCase('Member Bob can read organization document', async () => {
    await assertSucceeds(getDoc(doc(bobDb, 'organizations', orgId)));
  });

  await testCase('Outsider Charlie cannot read organization document', async () => {
    await assertFails(getDoc(doc(charlieDb, 'organizations', orgId)));
  });

  await testCase('Member Bob cannot write to organization inventory (Admin write only)', async () => {
    await assertFails(
      setDoc(doc(bobDb, 'organizations', orgId, 'inventory', 'org_part_1'), {
        id: 'org_part_1',
        name: 'Unauthorized Tool Addition',
      })
    );
  });

  await testCase('Admin Alice can write to organization inventory', async () => {
    await assertSucceeds(
      setDoc(doc(aliceDb, 'organizations', orgId, 'inventory', 'org_part_1'), {
        id: 'org_part_1',
        name: 'Shared Soldering Station Iron',
        quantity: 3,
      })
    );
  });

  await testCase('Member Bob can read organization inventory items', async () => {
    await assertSucceeds(
      getDoc(doc(bobDb, 'organizations', orgId, 'inventory', 'org_part_1'))
    );
  });

  const reportId = 'report_spam_safety_1';
  await testCase('Bob submits a moderation report', async () => {
    await assertSucceeds(
      setDoc(doc(bobDb, 'moderation_reports', reportId), {
        id: reportId,
        reporterId: 'bob',
        targetType: 'listing',
        targetId: 'fake_listing_id',
        reason: 'commercial_advertising',
        description: 'Commercial retailer listing bulk new items.',
        status: 'submitted',
        createdAt: new Date().toISOString(),
      })
    );
  });

  await testCase('Reporter Bob can read his submitted report', async () => {
    await assertSucceeds(getDoc(doc(bobDb, 'moderation_reports', reportId)));
  });

  await testCase('Third-party Alice cannot read Bob’s moderation report', async () => {
    await assertFails(getDoc(doc(aliceDb, 'moderation_reports', reportId)));
  });

  await testCase('Listing moderation reports collection is denied to non-admin clients', async () => {
    await assertFails(getDocs(collection(bobDb, 'moderation_reports')));
    await assertFails(getDocs(collection(aliceDb, 'moderation_reports')));
  });

  // ========================================================
  // ISSUE 5: Real Concurrent Reservation Transactions & Contention
  // ========================================================
  console.log('\n--- Issue 5: Real Concurrent Reservation Transactions, Partial Commitments & Release ---');

  // Setup inventory item with totalQuantity: 2, reservedQuantity: 0 for concurrency test
  const concurrentItemId = 'item_concurrency_uno';
  await testCase('Setup: Alice creates item_concurrency_uno with totalQuantity: 2, reservedQuantity: 0', async () => {
    await assertSucceeds(
      setDoc(doc(aliceDb, 'users', 'alice', 'inventory', concurrentItemId), {
        id: concurrentItemId,
        ownerId: 'alice',
        catalogId: 'comp-arduino-uno',
        name: 'Arduino Uno R3 Concurrency Test',
        category: 'microcontroller',
        totalQuantity: 2,
        reservedQuantity: 0,
        installedQuantity: 0,
        condition: 'working',
        source: 'purchased',
        unitMassGrams: 25.5,
        verificationStatus: 'user-reported-working',
        lastUpdated: new Date().toISOString(),
      })
    );
  });

  await testCase('Real concurrent transactions competing for stock: exactly one commits, over-allocation aborts', async () => {
    // Two competing transactions simultaneously trying to reserve stock:
    // Tx 1 wants 2 units, Tx 2 wants 1 unit. Total available is 2.
    const tx1 = FirestoreAdapter.reserveStockTransaction(
      [{ ownerUid: 'alice', itemId: concurrentItemId, quantity: 2 }],
      'ws_concurrency_1',
      aliceDb
    );
    const tx2 = FirestoreAdapter.reserveStockTransaction(
      [{ ownerUid: 'alice', itemId: concurrentItemId, quantity: 1 }],
      'ws_concurrency_2',
      aliceDb
    );

    const results = await Promise.allSettled([tx1, tx2]);
    const fulfilled = results.filter((r) => r.status === 'fulfilled');
    const rejected = results.filter((r) => r.status === 'rejected');

    if (fulfilled.length !== 1 || rejected.length !== 1) {
      throw new Error(`Expected exactly 1 fulfilled and 1 rejected, got ${fulfilled.length} fulfilled, ${rejected.length} rejected.`);
    }

    // Verify database state: reservedQuantity must be either 1 or 2 (never 3)
    const snap = await getDoc(doc(aliceDb, 'users', 'alice', 'inventory', concurrentItemId));
    const data = snap.data();
    if (data?.reservedQuantity !== 1 && data?.reservedQuantity !== 2) {
      throw new Error(`Expected reservedQuantity: 1 or 2, found ${data?.reservedQuantity}`);
    }
  });

  await testCase('Partial commitment prevention: bundle reservation with one unavailable item aborts cleanly without partial writes', async () => {
    const preSnap = await getDoc(doc(aliceDb, 'users', 'alice', 'inventory', concurrentItemId));
    const initialReserved = preSnap.data()?.reservedQuantity;

    let threw = false;
    try {
      await FirestoreAdapter.reserveStockTransaction(
        [
          { ownerUid: 'alice', itemId: concurrentItemId, quantity: 1 },
          { ownerUid: 'alice', itemId: 'item_swollen_lipo', quantity: 99 }, // 99 exceeds available stock!
        ],
        'ws_partial_bundle',
        aliceDb
      );
    } catch (err: any) {
      threw = true;
    }

    if (!threw) {
      throw new Error('Expected bundle reservation to throw due to unavailable stock.');
    }

    // Verify inventory untouched: reservedQuantity still initialReserved
    const snap = await getDoc(doc(aliceDb, 'users', 'alice', 'inventory', concurrentItemId));
    if (snap.data()?.reservedQuantity !== initialReserved) {
      throw new Error('Partial write detected! Stock was modified despite transaction failure.');
    }
  });

  await testCase('Release reservation transaction restores available stock', async () => {
    const preSnap = await getDoc(doc(aliceDb, 'users', 'alice', 'inventory', concurrentItemId));
    const currentReserved = preSnap.data()?.reservedQuantity || 0;

    await FirestoreAdapter.releaseReservationTransaction(
      [{ ownerUid: 'alice', itemId: concurrentItemId, quantity: currentReserved }],
      aliceDb
    );

    const snap = await getDoc(doc(aliceDb, 'users', 'alice', 'inventory', concurrentItemId));
    if (snap.data()?.reservedQuantity !== 0) {
      throw new Error(`Expected reservedQuantity: 0 after release, found ${snap.data()?.reservedQuantity}`);
    }
  });

  // Duplicate proposal acceptance concurrency
  const dupProposalId = 'prop_concurrent_dup_test';
  await testCase('Setup: Alice creates pending proposal for Bob for duplicate acceptance test', async () => {
    await assertSucceeds(
      setDoc(doc(aliceDb, 'collaboration_proposals', dupProposalId), {
        id: dupProposalId,
        projectId: 'proj-smart-dustbin',
        projectTitle: 'Smart Dustbin',
        senderId: 'alice',
        receiverId: 'bob',
        senderContributions: [],
        receiverContributions: [],
        status: 'pending',
        createdAt: new Date().toISOString(),
      })
    );
  });

  await testCase('Concurrent duplicate proposal acceptance: exactly one succeeds, second is rejected', async () => {
    const p1 = FirestoreAdapter.acceptProposalTransaction(dupProposalId, 'bob', workspaceId, bobDb);
    const p2 = FirestoreAdapter.acceptProposalTransaction(dupProposalId, 'bob', workspaceId, bobDb);

    const results = await Promise.allSettled([p1, p2]);
    const fulfilled = results.filter((r) => r.status === 'fulfilled');
    const rejected = results.filter((r) => r.status === 'rejected');

    if (fulfilled.length !== 1 || rejected.length !== 1) {
      throw new Error(`Expected 1 fulfilled and 1 rejected for duplicate acceptance, got ${fulfilled.length} fulfilled, ${rejected.length} rejected.`);
    }

    const snap = await getDoc(doc(bobDb, 'collaboration_proposals', dupProposalId));
    if (snap.data()?.status !== 'accepted') {
      throw new Error('Proposal was not accepted.');
    }
  });

  // ========================================================
  // ISSUE 6: Coupled Physical Allocation Events & Operation Idempotency
  // ========================================================
  console.log('\n--- Issue 6: Coupled Physical Allocation Events, Idempotency & Reversals ---');
  const physicalOpId = 'op_physical_build_dustbin_01';

  await testCase('recordPhysicalBuildAtomic couples inventory installedQuantity and creates user-reported ledger entry', async () => {
    const result = await FirestoreAdapter.recordPhysicalBuildAtomic(
      'alice',
      {
        operationId: physicalOpId,
        projectId: 'proj-smart-dustbin',
        projectTitle: 'Smart Dustbin',
        makerDisplayName: 'Alice Maker',
        allocations: [
          {
            inventoryItemId: concurrentItemId,
            catalogId: 'comp-arduino-uno',
            name: 'Arduino Uno R3',
            quantity: 1,
            unitMassGrams: 25.5,
          },
        ],
      },
      aliceDb
    );

    if (result.isDuplicate || result.totalMassGrams !== 25.5) {
      throw new Error(`Unexpected build result: isDuplicate=${result.isDuplicate}, mass=${result.totalMassGrams}`);
    }

    // Verify inventory was coupled
    const invSnap = await getDoc(doc(aliceDb, 'users', 'alice', 'inventory', concurrentItemId));
    const invData = invSnap.data();
    if (invData?.installedQuantity !== 1 || invData?.reuseCycleCount !== 1) {
      throw new Error(`Inventory not coupled: installed=${invData?.installedQuantity}, cycleCount=${invData?.reuseCycleCount}`);
    }

    // Verify ledger entry
    const ledgerSnap = await getDoc(doc(aliceDb, 'users', 'alice', 'reuseLedger', physicalOpId));
    const ledgerData = ledgerSnap.data();
    if (ledgerData?.verificationLevel !== 'user-reported' || !ledgerData?.notes?.includes('uncertified')) {
      throw new Error(`Ledger entry missing user-reported uncertified label: ${JSON.stringify(ledgerData)}`);
    }
  });

  await testCase('Duplicate completion test: calling recordPhysicalBuildAtomic with same operationId is idempotent (no double-counted mass)', async () => {
    const dupResult = await FirestoreAdapter.recordPhysicalBuildAtomic(
      'alice',
      {
        operationId: physicalOpId,
        projectId: 'proj-smart-dustbin',
        projectTitle: 'Smart Dustbin',
        makerDisplayName: 'Alice Maker',
        allocations: [
          {
            inventoryItemId: concurrentItemId,
            catalogId: 'comp-arduino-uno',
            name: 'Arduino Uno R3',
            quantity: 1,
            unitMassGrams: 25.5,
          },
        ],
      },
      aliceDb
    );

    if (!dupResult.isDuplicate) {
      throw new Error('Expected isDuplicate: true on duplicate operationId.');
    }
    if (dupResult.totalMassGrams !== 25.5) {
      throw new Error(`Double-counted mass detected! Expected 25.5, found ${dupResult.totalMassGrams}`);
    }

    // Verify inventory installedQuantity was NOT incremented again
    const invSnap = await getDoc(doc(aliceDb, 'users', 'alice', 'inventory', concurrentItemId));
    if (invSnap.data()?.installedQuantity !== 1) {
      throw new Error(`Installed quantity incremented on duplicate! Found: ${invSnap.data()?.installedQuantity}`);
    }
  });

  await testCase('Fabricated allocation test: non-existent item or exceeding stock aborts without writing ledger', async () => {
    let threw = false;
    try {
      await FirestoreAdapter.recordPhysicalBuildAtomic(
        'alice',
        {
          operationId: 'op_fabricated_alloc_fake',
          projectId: 'proj-smart-dustbin',
          projectTitle: 'Smart Dustbin',
          makerDisplayName: 'Alice Maker',
          allocations: [
            {
              inventoryItemId: 'item_nonexistent_fake_part',
              catalogId: 'comp-fake',
              name: 'Nonexistent Part',
              quantity: 1,
              unitMassGrams: 10,
            },
          ],
        },
        aliceDb
      );
    } catch {
      threw = true;
    }

    if (!threw) {
      throw new Error('Fabricated allocation should have thrown.');
    }

    // Verify fabricated ledger entry was NOT created
    const ledgerSnap = await getDoc(doc(aliceDb, 'users', 'alice', 'reuseLedger', 'op_fabricated_alloc_fake'));
    if (ledgerSnap.exists()) {
      throw new Error('Fabricated ledger entry was written despite error!');
    }
  });

  const reversalOpId = 'op_reversal_dustbin_01';
  await testCase('recordBuildReversalAtomic reverses installedQuantity and records correction entry', async () => {
    await FirestoreAdapter.recordBuildReversalAtomic(
      'alice',
      physicalOpId,
      reversalOpId,
      'Disassembly test correction',
      aliceDb
    );

    // Verify installedQuantity restored to 0
    const invSnap = await getDoc(doc(aliceDb, 'users', 'alice', 'inventory', concurrentItemId));
    if (invSnap.data()?.installedQuantity !== 0) {
      throw new Error(`Expected installedQuantity: 0 after reversal, found ${invSnap.data()?.installedQuantity}`);
    }

    // Verify reversal ledger entry
    const revSnap = await getDoc(doc(aliceDb, 'users', 'alice', 'reuseLedger', reversalOpId));
    if (!revSnap.exists() || revSnap.data()?.eventType !== 'correction_reversal') {
      throw new Error('Reversal ledger entry not found or invalid eventType.');
    }
  });

  await testCase('Repeated reversal test: calling recordBuildReversalAtomic with same reversalOperationId is rejected', async () => {
    let threw = false;
    try {
      await FirestoreAdapter.recordBuildReversalAtomic(
        'alice',
        physicalOpId,
        reversalOpId,
        'Second reversal attempt',
        aliceDb
      );
    } catch {
      threw = true;
    }

    if (!threw) {
      throw new Error('Expected repeated reversal to be rejected.');
    }
  });

  console.log(`\n======================================================`);
  console.log(`Firebase Emulator Security Results: ${passedCount} Passed, ${failedCount} Failed`);
  console.log(`======================================================\n`);

  await testEnv.cleanup();
  process.exit(failedCount === 0 ? 0 : 1);
}

runSecurityTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
