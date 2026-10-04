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
} from 'firebase/firestore';
import fs from 'node:fs';

const PROJECT_ID = 'eco-build-aa966';

async function runSecurityTests() {
  console.log('=== Initializing Firebase Emulator Security Test Suite (Phase 4A) ===');
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

  // Document ID strictly matches `${projectId}_${recipeVersion}`: proj-smart-dustbin_v1
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

  await testCase('Guide progress with collaborative workspace field is rejected in Phase 4A', async () => {
    await assertFails(
      setDoc(doc(aliceDb, 'users', 'alice', 'guideProgress', 'proj-smart-dustbin_v1'), {
        progressId: 'proj-smart-dustbin_v1',
        projectId: 'proj-smart-dustbin',
        recipeVersion: 'v1',
        currentStepIndex: 1,
        teamWorkspaceId: 'ws_unauthorized_shared', // Forbidden in standalone Phase 4A
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
        recipeVersion: 'v2', // Unsupported recipe version in Phase 4A
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

  await testCase('Guide progress document ID mismatch with projectId_recipeVersion is rejected', async () => {
    await assertFails(
      setDoc(doc(aliceDb, 'users', 'alice', 'guideProgress', 'mismatched_doc_id'), {
        progressId: 'mismatched_doc_id',
        projectId: 'proj-smart-dustbin',
        recipeVersion: 'v1',
        currentStepIndex: 1,
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

  await testCase('Guide progress currentStepIndex < 0 is rejected', async () => {
    await assertFails(
      setDoc(doc(aliceDb, 'users', 'alice', 'guideProgress', 'proj-smart-dustbin_v1'), {
        progressId: 'proj-smart-dustbin_v1',
        projectId: 'proj-smart-dustbin',
        recipeVersion: 'v1',
        currentStepIndex: -1,
      })
    );
  });

  await testCase('Guide progress completedStepIndices containing invalid index (e.g. 99) is rejected', async () => {
    await assertFails(
      setDoc(doc(aliceDb, 'users', 'alice', 'guideProgress', 'proj-smart-dustbin_v1'), {
        progressId: 'proj-smart-dustbin_v1',
        projectId: 'proj-smart-dustbin',
        recipeVersion: 'v1',
        currentStepIndex: 2,
        completedStepIndices: [0, 99], // 99 is invalid step index
      })
    );
  });

  await testCase('Guide progress completedStepIndices containing negative index is rejected', async () => {
    await assertFails(
      setDoc(doc(aliceDb, 'users', 'alice', 'guideProgress', 'proj-smart-dustbin_v1'), {
        progressId: 'proj-smart-dustbin_v1',
        projectId: 'proj-smart-dustbin',
        recipeVersion: 'v1',
        currentStepIndex: 0,
        completedStepIndices: [-1],
      })
    );
  });

  await testCase('Guide progress completedStepIndices containing string values is rejected', async () => {
    await assertFails(
      setDoc(doc(aliceDb, 'users', 'alice', 'guideProgress', 'proj-smart-dustbin_v1'), {
        progressId: 'proj-smart-dustbin_v1',
        projectId: 'proj-smart-dustbin',
        recipeVersion: 'v1',
        currentStepIndex: 0,
        completedStepIndices: ['step0'],
      })
    );
  });

  console.log('\n--- 6. Testing Strict Integer Constraints for Inventory Quantities ---');

  await testCase('Inventory item with fractional totalQuantity (e.g. 2.5) is rejected', async () => {
    await assertFails(
      setDoc(doc(aliceDb, 'users', 'alice', 'inventory', 'item_frac_total'), {
        ...validItem,
        id: 'item_frac_total',
        totalQuantity: 2.5, // Must be int
      })
    );
  });

  await testCase('Inventory item with fractional installedQuantity (e.g. 1.5) is rejected', async () => {
    await assertFails(
      setDoc(doc(aliceDb, 'users', 'alice', 'inventory', 'item_frac_installed'), {
        ...validItem,
        id: 'item_frac_installed',
        installedQuantity: 1.5, // Must be int
      })
    );
  });

  await testCase('Inventory item with negative quantity is rejected', async () => {
    await assertFails(
      setDoc(doc(aliceDb, 'users', 'alice', 'inventory', 'neg_qty'), {
        ...validItem,
        id: 'neg_qty',
        totalQuantity: -3,
      })
    );
  });

  await testCase('Inventory item exceeding 10,000 units is rejected', async () => {
    await assertFails(
      setDoc(doc(aliceDb, 'users', 'alice', 'inventory', 'huge_qty'), {
        ...validItem,
        id: 'huge_qty',
        totalQuantity: 50000,
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

  await testCase('Alice cannot modify item id during update', async () => {
    await assertFails(
      updateDoc(doc(aliceDb, 'users', 'alice', 'inventory', 'item_uno'), {
        id: 'different_id',
      })
    );
  });

  await testCase('Alice can cleanly delete her own items', async () => {
    await assertSucceeds(
      deleteDoc(doc(aliceDb, 'users', 'alice', 'inventory', 'item_uno'))
    );
    await assertSucceeds(
      deleteDoc(doc(aliceDb, 'users', 'alice', 'inventory', 'item_swollen_lipo'))
    );
    await assertSucceeds(
      deleteDoc(doc(aliceDb, 'users', 'alice', 'savedProjects', 'proj-smart-dustbin'))
    );
    await assertSucceeds(
      deleteDoc(doc(aliceDb, 'users', 'alice', 'guideProgress', 'proj-smart-dustbin_v1'))
    );
    await assertSucceeds(deleteDoc(doc(aliceDb, 'users', 'alice')));
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
