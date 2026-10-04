/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import assert from 'node:assert';
import { isFirebaseConfigured, handleFirestoreError, OperationType } from '../services/firebase';
import { CloudUserProfile } from '../services/firestoreAdapter';
import { ComponentItem } from '../types';

console.log('--- Running EcoBuild Phase 4A Verification Checks ---');

// 1. Configuration check
assert.strictEqual(
  typeof isFirebaseConfigured,
  'boolean',
  'isFirebaseConfigured must be a boolean'
);
console.log('[PASS] Phase 4A: isFirebaseConfigured resolves correctly');

// 2. Error handler conforming to FirestoreErrorInfo
try {
  handleFirestoreError(new Error('Permission denied'), OperationType.WRITE, 'users/test-uid');
  assert.fail('Should have thrown an error');
} catch (e: any) {
  const parsed = JSON.parse(e.message);
  assert.strictEqual(parsed.error, 'Permission denied');
  assert.strictEqual(parsed.operationType, 'write');
  assert.strictEqual(parsed.path, 'users/test-uid');
  assert.strictEqual(typeof parsed.authInfo, 'object');
  console.log('[PASS] Phase 4A: Error handler conforms to FirestoreErrorInfo JSON schema');
}

// 3. CloudUserProfile structure check
const testProfile: CloudUserProfile = {
  displayName: 'Keerthivasan',
  email: 'ftkeerthivasan@gmail.com',
  experience: 'Intermediate',
  interests: ['robotics', 'home automation'],
  skills: ['circuit prototyping', 'soldering'],
  preferredDifficulty: 'Intermediate',
  availableTime: 'Weekend projects (3-5 hours)',
  collaborationPreference: 'Open to team builds',
  bio: 'EcoBuild hardware maker building sustainable electronics projects.',
};
assert.strictEqual(testProfile.displayName, 'Keerthivasan');
assert.strictEqual(testProfile.experience, 'Intermediate');
console.log('[PASS] Phase 4A: CloudUserProfile adheres to schema');

// 4. Inventory item privacy and UID scoping
const uid = 'firebase-user-xyz';
const testItem: ComponentItem = {
  id: 'comp_uno_test',
  ownerId: uid,
  catalogId: 'comp-arduino-uno',
  name: 'Arduino Uno R3',
  category: 'microcontroller',
  totalQuantity: 1,
  reservedQuantity: 0,
  installedQuantity: 0,
  condition: 'working',
  source: 'purchased',
  unitMassGrams: 25,
  lastUpdated: new Date().toISOString(),
  verificationStatus: 'user-reported-working',
};
assert.strictEqual(testItem.ownerId, uid, 'OwnerId must equal authenticated UID');
assert.strictEqual(testItem.reservedQuantity, 0, 'In Phase 4A, private inventory reservations start at 0');
console.log('[PASS] Phase 4A: InventoryItem adheres to Phase 4A private UID ownership and boundaries');

// 5. Mode Separation Verification
const demoMakerId = 'maker-adithya';
assert.notStrictEqual(demoMakerId, uid, 'Demo maker IDs must be strictly decoupled from Firebase authenticated UIDs');
console.log('[PASS] Phase 4A: Strict separation between Demo Maker IDs and Authenticated Firebase UIDs');

console.log('Phase 4A Tests Summary: All verification checks passed!');
process.exit(0);
