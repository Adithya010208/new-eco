/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import assert from 'node:assert';

// Polyfill localStorage for Node.js test environment
const memoryStore: Record<string, string> = {};
(globalThis as any).localStorage = {
  getItem: (k: string) => memoryStore[k] || null,
  setItem: (k: string, v: string) => {
    memoryStore[k] = v;
  },
  removeItem: (k: string) => {
    delete memoryStore[k];
  },
  clear: () => {
    for (const k of Object.keys(memoryStore)) {
      delete memoryStore[k];
    }
  },
};

import {
  calculateEcoRank,
  calculateBuilderRank,
  evaluateBadges,
  BADGE_DEFINITIONS,
  ECO_POINT_VALUES,
} from './gamification';
import { StorageService } from '../services/storageService';
import { ComponentItem, CompletedProjectRecord, ReuseLedgerEntry } from '../types';

console.log('--- Running EcoBuild Gamification & Core Data Logic Tests ---');

// 1. Eco Rank Tiers
assert.strictEqual(calculateEcoRank(0), 'Seedling');
assert.strictEqual(calculateEcoRank(49), 'Seedling');
assert.strictEqual(calculateEcoRank(50), 'Sprout');
assert.strictEqual(calculateEcoRank(149), 'Sprout');
assert.strictEqual(calculateEcoRank(150), 'Circuit Saver');
assert.strictEqual(calculateEcoRank(299), 'Circuit Saver');
assert.strictEqual(calculateEcoRank(300), 'Circular Champion');
assert.strictEqual(calculateEcoRank(599), 'Circular Champion');
assert.strictEqual(calculateEcoRank(600), 'Master Regenerator');
console.log('[PASS] Eco Rank tiers calculate correctly across all thresholds');

// 2. Builder Rank Tiers
assert.strictEqual(calculateBuilderRank(0), 'Apprentice');
assert.strictEqual(calculateBuilderRank(1), 'Builder');
assert.strictEqual(calculateBuilderRank(2), 'Builder');
assert.strictEqual(calculateBuilderRank(3), 'Senior Builder');
assert.strictEqual(calculateBuilderRank(5), 'Senior Builder');
assert.strictEqual(calculateBuilderRank(6), 'Master Artisan');
console.log('[PASS] Builder Rank tiers calculate correctly across all thresholds');

// 3. Badges Evaluation
const mockInventory: ComponentItem[] = [
  {
    id: 'inv-1',
    catalogId: 'comp-arduino-uno',
    name: 'Arduino Uno',
    category: 'microcontroller',
    totalQuantity: 2,
    reservedQuantity: 0,
    installedQuantity: 0,
    condition: 'working',
    source: 'salvaged',
    unitMassGrams: 35,
    lastUpdated: '2026-03-20T10:00:00Z',
    verificationStatus: 'user-reported-working',
  },
];

const mockCompleted: CompletedProjectRecord[] = [
  {
    id: 'cp-1',
    userId: 'user-test',
    projectId: 'proj-smart-dustbin',
    projectTitle: 'Smart Touchless Dustbin',
    difficulty: 'Beginner',
    completedAt: '2026-03-20T12:00:00Z',
    result: 'working',
    verificationLevel: 'bench-verified',
    componentsReusedCount: 3,
    totalMassGrams: 155,
  },
  {
    id: 'cp-2',
    userId: 'user-test',
    projectId: 'proj-autonomous-rover',
    projectTitle: 'Autonomous Obstacle Rover',
    difficulty: 'Advanced',
    completedAt: '2026-03-25T15:00:00Z',
    result: 'working',
    verificationLevel: 'bench-verified',
    componentsReusedCount: 5,
    totalMassGrams: 280,
  },
];

const mockLedger: ReuseLedgerEntry[] = [
  {
    id: 'rl-1',
    eventType: 'disassembly-returned',
    timestamp: '2026-03-22T10:00:00Z',
    totalMassGrams: 120,
    unitMassGrams: 120,
  },
  {
    id: 'rl-2',
    eventType: 'disassembly-returned',
    timestamp: '2026-03-23T10:00:00Z',
    totalMassGrams: 50,
    unitMassGrams: 50,
  },
  {
    id: 'rl-3',
    eventType: 'disassembly-returned',
    timestamp: '2026-03-24T10:00:00Z',
    totalMassGrams: 60,
    unitMassGrams: 60,
  },
];

const evaluated = evaluateBadges({
  ecoPoints: 250,
  inventory: mockInventory,
  ledgerEntries: mockLedger,
  completedProjects: mockCompleted,
  isMentor: true,
  resolvedTicketsCount: 2,
});

const getBadge = (id: string) => evaluated.find((b) => b.id === id);

assert.strictEqual(getBadge('eco-starter')?.unlocked, true, 'Eco Starter must unlock when items in inventory');
assert.strictEqual(getBadge('component-saver')?.unlocked, true, 'Component Saver must unlock when mass >= 100g');
assert.strictEqual(getBadge('circular-champion')?.unlocked, true, 'Circular Champion must unlock at >= 200 points');
assert.strictEqual(getBadge('first-build')?.unlocked, true, 'First Build must unlock with >= 1 project');
assert.strictEqual(getBadge('master-builder')?.unlocked, true, 'Master Builder must unlock with Advanced project');
assert.strictEqual(getBadge('mentor')?.unlocked, true, 'Mentor must unlock when isMentor is true');
assert.strictEqual(getBadge('reuse-champion')?.unlocked, true, 'Reuse Champion must unlock with >= 3 reuse cycles');
assert.strictEqual(getBadge('ten-projects')?.unlocked, false, '10 Projects must be locked when count < 10');
assert.strictEqual(getBadge('ten-projects')?.currentProgress, 2, '10 Projects progress should be exactly 2');
console.log('[PASS] Badge evaluation correctly unlocks earned badges and reports progress for locked badges');

// 4. Eco Point Awarding & Duplicate Prevention
const testUser = 'maker-test-points';
const tx1 = StorageService.awardEcoPoints({
  userId: testUser,
  eventType: 'physical-build',
  points: ECO_POINT_VALUES['physical-build'],
  referenceType: 'build',
  referenceId: 'build-unique-123',
  reason: 'First build verified',
});
assert.notStrictEqual(tx1, null, 'First award must succeed');
assert.strictEqual(tx1?.points, 50, 'Physical build must award 50 points');

// Duplicate award attempt with same referenceId and eventType
const txDuplicate = StorageService.awardEcoPoints({
  userId: testUser,
  eventType: 'physical-build',
  points: ECO_POINT_VALUES['physical-build'],
  referenceType: 'build',
  referenceId: 'build-unique-123',
  reason: 'Duplicate build attempt',
});
assert.strictEqual(txDuplicate, null, 'Duplicate award must be rejected with null');
console.log('[PASS] Eco Points awarded accurately and duplicate awards are strictly prevented');

// 5. Leaderboard Calculation & Sorting
const ecoLeaderboard = StorageService.getEcoLeaderboard();
assert.ok(ecoLeaderboard.length > 0, 'Eco leaderboard must contain entries');
for (let i = 0; i < ecoLeaderboard.length - 1; i++) {
  assert.ok(
    ecoLeaderboard[i].ecoPoints >= ecoLeaderboard[i + 1].ecoPoints,
    `Eco leaderboard entry at rank ${i + 1} must have >= points than entry at rank ${i + 2}`
  );
  assert.strictEqual(ecoLeaderboard[i].rank, i + 1, 'Rank numbers must be sequential 1-indexed');
}
console.log('[PASS] Eco Leaderboard is sorted strictly descending by verified points');

const builderLeaderboard = StorageService.getBuilderLeaderboard();
assert.ok(builderLeaderboard.length > 0, 'Builder leaderboard must contain entries');
for (let i = 0; i < builderLeaderboard.length - 1; i++) {
  const currentScore = builderLeaderboard[i].builderScore ?? 0;
  const nextScore = builderLeaderboard[i + 1].builderScore ?? 0;
  assert.ok(
    currentScore >= nextScore,
    `Builder leaderboard entry at rank ${i + 1} (${currentScore}) must have >= score than entry at rank ${i + 2} (${nextScore})`
  );
  assert.strictEqual(builderLeaderboard[i].rank, i + 1, 'Builder ranks must be sequential');
}
console.log('[PASS] Builder Leaderboard is sorted strictly descending by verified builder progress');

console.log('--- All EcoBuild Gamification & Core Verification Tests Passed! ---');
