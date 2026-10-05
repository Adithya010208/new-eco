/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  ComponentItem,
  UserProfile,
  MakerProfile,
  CollaborationProposal,
  ProjectWorkspace,
  MentorshipRequest,
  ComponentReservation,
  WorkspaceTask,
  WorkspaceMessage,
  EcoPointEventType,
  EcoPointTransaction,
  CompletedProjectRecord,
  ReuseLedgerEntry,
  EcoLeaderboardEntry,
  BuilderLeaderboardEntry,
  ComponentExchangeListing,
  ShowcaseProject,
} from '../types';
import { BuildGuideProgress } from '../studio/types';
import { SEED_INVENTORY } from '../data/seedInventory';
import { DEMO_MAKERS, DEMO_INVENTORIES_BY_MAKER } from '../data/demoMakers';
import {
  SEED_PROPOSALS,
  SEED_WORKSPACES,
  SEED_MENTOR_REQUESTS,
} from '../data/seedNetwork';
import { PROJECT_LIBRARY } from '../data/projectLibrary';
import {
  ECO_POINT_VALUES,
  calculateEcoRank,
  calculateBuilderRank,
  evaluateBadges,
} from '../utils/gamification';

// Storage Keys
const STORAGE_VERSION_KEY = 'ecobuild_storage_version';
const ACTIVE_USER_KEY = 'ecobuild_active_user_v2';
const MAKERS_KEY = 'ecobuild_makers_v2';
const INVENTORIES_KEY = 'ecobuild_inventories_v2';
const PROPOSALS_KEY = 'ecobuild_proposals_v2';
const WORKSPACES_KEY = 'ecobuild_workspaces_v2';
const MENTOR_REQUESTS_KEY = 'ecobuild_mentor_requests_v2';
const SAVED_PROJECTS_KEY = 'ecobuild_saved_projects_v1';
const GUIDE_PROGRESS_KEY = 'ecobuild_guide_progress_v1';
const ECO_POINTS_KEY = 'ecobuild_eco_points_v2';
const COMPLETED_PROJECTS_KEY = 'ecobuild_completed_projects_v2';
const REUSE_LEDGER_KEY = 'ecobuild_reuse_ledger_v2';
const EXCHANGE_LISTINGS_KEY = 'ecobuild_exchange_listings_v2';

// Legacy keys for migration
const LEGACY_PROFILE_KEY = 'ecobuild_profile_v1';
const LEGACY_INVENTORY_KEY = 'ecobuild_inventory_v1';

export const DEFAULT_PROFILE: UserProfile = {
  displayName: 'Adithya',
  experience: 'Beginner',
  interests: ['robotics', 'home automation', 'learning electronics'],
  preferredDifficulty: 'Beginner',
  availableTime: '1-2 hours / week',
  hasCompletedOnboarding: true,
};

export const DEFAULT_SAVED_PROJECTS = ['proj-smart-dustbin'];

export const SEED_ECO_POINTS: EcoPointTransaction[] = [
  {
    id: 'tx-adithya-1',
    userId: 'maker-adithya',
    eventType: 'physical-build',
    points: 50,
    referenceType: 'project',
    referenceId: 'proj-smart-dustbin',
    createdAt: '2026-03-20T10:00:00Z',
    reason: 'Verified physical assembly of Smart Dustbin prototype',
    verificationSource: 'physical-ledger',
  },
  {
    id: 'tx-adithya-2',
    userId: 'maker-adithya',
    eventType: 'component-shared',
    points: 10,
    referenceType: 'component',
    referenceId: 'inv-hc-sr04',
    createdAt: '2026-03-21T14:30:00Z',
    reason: 'Shared HC-SR04 ultrasonic sensor with campus maker community',
    verificationSource: 'peer-exchange',
  },
  {
    id: 'tx-elena-1',
    userId: 'maker-elena',
    eventType: 'physical-build',
    points: 50,
    referenceType: 'project',
    referenceId: 'proj-night-light',
    createdAt: '2026-03-10T12:00:00Z',
    reason: 'Verified physical assembly of Automatic Night Light',
    verificationSource: 'physical-ledger',
  },
  {
    id: 'tx-elena-2',
    userId: 'maker-elena',
    eventType: 'physical-build',
    points: 50,
    referenceType: 'project',
    referenceId: 'proj-obstacle-rover',
    createdAt: '2026-03-18T16:00:00Z',
    reason: 'Verified physical assembly of Obstacle Avoiding Rover',
    verificationSource: 'physical-ledger',
  },
  {
    id: 'tx-elena-3',
    userId: 'maker-elena',
    eventType: 'reuse-cycle',
    points: 30,
    referenceType: 'cycle',
    referenceId: 'cycle-elena-chassis',
    createdAt: '2026-03-22T09:15:00Z',
    reason: 'Disassembled older chassis and returned L298N motor driver to stock',
    verificationSource: 'physical-ledger',
  },
  {
    id: 'tx-elena-4',
    userId: 'maker-elena',
    eventType: 'collaboration-completed',
    points: 35,
    referenceType: 'workspace',
    referenceId: 'ws-team-rover',
    createdAt: '2026-03-25T11:00:00Z',
    reason: 'Completed team robotics workspace with Adithya',
    verificationSource: 'peer-exchange',
  },
  {
    id: 'tx-elena-5',
    userId: 'maker-elena',
    eventType: 'exchange-completed',
    points: 25,
    referenceType: 'exchange',
    referenceId: 'ex-gear-motor',
    createdAt: '2026-03-27T14:00:00Z',
    reason: 'Completed surplus gearmotor handover to Marcus',
    verificationSource: 'peer-exchange',
  },
  {
    id: 'tx-marcus-1',
    userId: 'maker-marcus',
    eventType: 'physical-build',
    points: 50,
    referenceType: 'project',
    referenceId: 'proj-plant-monitor',
    createdAt: '2026-03-15T08:00:00Z',
    reason: 'Verified physical build of Smart Plant Monitor',
    verificationSource: 'physical-ledger',
  },
  {
    id: 'tx-marcus-2',
    userId: 'maker-marcus',
    eventType: 'reuse-cycle',
    points: 30,
    referenceType: 'cycle',
    referenceId: 'cycle-marcus-probe',
    createdAt: '2026-03-22T10:00:00Z',
    reason: 'Reclaimed soil moisture sensor from completed semester trial',
    verificationSource: 'physical-ledger',
  },
  {
    id: 'tx-marcus-3',
    userId: 'maker-marcus',
    eventType: 'collaboration-completed',
    points: 35,
    referenceType: 'workspace',
    referenceId: 'ws-greenhouse-net',
    createdAt: '2026-03-24T15:00:00Z',
    reason: 'Delivered telemetry module in shared greenhouse workspace',
    verificationSource: 'peer-exchange',
  },
  {
    id: 'tx-vance-1',
    userId: 'maker-vance',
    eventType: 'mentorship-resolved',
    points: 20,
    referenceType: 'mentorship',
    referenceId: 'ticket-vance-1',
    createdAt: '2026-03-12T14:00:00Z',
    reason: 'Resolved circuit troubleshooting mentorship ticket',
    verificationSource: 'mentor-verification',
  },
  {
    id: 'tx-vance-2',
    userId: 'maker-vance',
    eventType: 'mentorship-resolved',
    points: 20,
    referenceType: 'mentorship',
    referenceId: 'ticket-vance-2',
    createdAt: '2026-03-19T17:00:00Z',
    reason: 'Verified schematic logic probing for beginner maker',
    verificationSource: 'mentor-verification',
  },
  {
    id: 'tx-vance-3',
    userId: 'maker-vance',
    eventType: 'physical-build',
    points: 50,
    referenceType: 'project',
    referenceId: 'proj-garage-parking',
    createdAt: '2026-03-21T11:00:00Z',
    reason: 'Constructed ultrasonic parking indicator for lab bay',
    verificationSource: 'physical-ledger',
  },
  {
    id: 'tx-vance-4',
    userId: 'maker-vance',
    eventType: 'reuse-cycle',
    points: 30,
    referenceType: 'cycle',
    referenceId: 'cycle-vance-logic',
    createdAt: '2026-03-24T16:30:00Z',
    reason: 'Bench-tested and cataloged 5 reclaimed 74HC IC chips',
    verificationSource: 'physical-ledger',
  },
  {
    id: 'tx-vance-5',
    userId: 'maker-vance',
    eventType: 'reuse-cycle',
    points: 30,
    referenceType: 'cycle',
    referenceId: 'cycle-vance-power',
    createdAt: '2026-03-28T09:00:00Z',
    reason: 'Recertified 12V 2A switching bench power supply',
    verificationSource: 'physical-ledger',
  },
  {
    id: 'tx-vance-6',
    userId: 'maker-vance',
    eventType: 'collaboration-completed',
    points: 35,
    referenceType: 'workspace',
    referenceId: 'ws-campus-sensor',
    createdAt: '2026-03-29T10:00:00Z',
    reason: 'Supervised senior capstone circular build workspace',
    verificationSource: 'mentor-verification',
  },
  {
    id: 'tx-priya-1',
    userId: 'maker-priya',
    eventType: 'physical-build',
    points: 50,
    referenceType: 'project',
    referenceId: 'proj-night-light',
    createdAt: '2026-03-23T11:00:00Z',
    reason: 'Verified physical build of Automatic Night Light',
    verificationSource: 'physical-ledger',
  },
  {
    id: 'tx-priya-2',
    userId: 'maker-priya',
    eventType: 'component-shared',
    points: 10,
    referenceType: 'component',
    referenceId: 'inv-priya-leds',
    createdAt: '2026-03-25T13:00:00Z',
    reason: 'Shared multi-color LED assortment for beginner workshop',
    verificationSource: 'peer-exchange',
  },
];

export const SEED_COMPLETED_PROJECTS: CompletedProjectRecord[] = [
  {
    id: 'cp-adithya-dustbin',
    userId: 'maker-adithya',
    projectId: 'proj-smart-dustbin',
    projectTitle: 'Smart Touchless Dustbin',
    difficulty: 'Beginner',
    completedAt: '2026-03-20T10:00:00Z',
    notes: 'Bench tested with 5V USB power. Servo lid opens reliably at 15cm threshold.',
    buildResult: 'working',
    reusedComponentsCount: 4,
    hardwareMassGrams: 155,
    verificationLevel: 'bench-verified',
  },
  {
    id: 'cp-elena-nightlight',
    userId: 'maker-elena',
    projectId: 'proj-night-light',
    projectTitle: 'Automatic Night Light',
    difficulty: 'Beginner',
    completedAt: '2026-03-10T12:00:00Z',
    notes: 'LDR voltage divider tuned with 10k resistor. Tested in darkened room.',
    buildResult: 'working',
    reusedComponentsCount: 3,
    hardwareMassGrams: 85,
    verificationLevel: 'bench-verified',
  },
  {
    id: 'cp-elena-rover',
    userId: 'maker-elena',
    projectId: 'proj-obstacle-rover',
    projectTitle: 'Obstacle Avoiding Rover',
    difficulty: 'Intermediate',
    completedAt: '2026-03-18T16:00:00Z',
    notes: 'Dual DC motor drive with L298N shield and front mounted HC-SR04 scanner.',
    buildResult: 'working',
    reusedComponentsCount: 6,
    hardwareMassGrams: 320,
    verificationLevel: 'bench-verified',
  },
  {
    id: 'cp-marcus-plant',
    userId: 'maker-marcus',
    projectId: 'proj-plant-monitor',
    projectTitle: 'Smart Plant Monitor',
    difficulty: 'Beginner',
    completedAt: '2026-03-15T08:00:00Z',
    notes: 'Capacitive probe calibrated for moisture thresholds with buzzer alert.',
    buildResult: 'working',
    reusedComponentsCount: 4,
    hardwareMassGrams: 120,
    verificationLevel: 'bench-verified',
  },
  {
    id: 'cp-vance-parking',
    userId: 'maker-vance',
    projectId: 'proj-garage-parking',
    projectTitle: 'Garage Parking Indicator',
    difficulty: 'Intermediate',
    completedAt: '2026-03-21T11:00:00Z',
    notes: 'Tricolor LED distance indication with audible beeps below 30cm.',
    buildResult: 'working',
    reusedComponentsCount: 5,
    hardwareMassGrams: 210,
    verificationLevel: 'bench-verified',
  },
  {
    id: 'cp-priya-nightlight',
    userId: 'maker-priya',
    projectId: 'proj-night-light',
    projectTitle: 'Automatic Night Light',
    difficulty: 'Beginner',
    completedAt: '2026-03-23T11:00:00Z',
    notes: 'First physical breadboard build. Replaced faulty resistor and verified LED.',
    buildResult: 'working',
    reusedComponentsCount: 3,
    hardwareMassGrams: 85,
    verificationLevel: 'self-reported-working',
  },
];

export const SEED_REUSE_LEDGER: ReuseLedgerEntry[] = [
  {
    id: 'rl-adithya-1',
    action: 'physical-build',
    projectId: 'proj-smart-dustbin',
    projectName: 'Smart Touchless Dustbin',
    timestamp: '2026-03-20T10:00:00Z',
    unitMassGrams: 155,
    notes: 'Initial build assembled from salvaged campus electronics.',
    allocatedItems: [
      { inventoryItemId: 'inv-arduino-uno', catalogId: 'comp-arduino-uno', quantity: 1 },
      { inventoryItemId: 'inv-hc-sr04', catalogId: 'comp-ultrasonic-hcsr04', quantity: 1 },
      { inventoryItemId: 'inv-sg90-servo', catalogId: 'comp-micro-servo-sg90', quantity: 1 },
      { inventoryItemId: 'inv-breadboard', catalogId: 'comp-breadboard-half', quantity: 1 },
    ],
  },
  {
    id: 'rl-elena-1',
    action: 'physical-build',
    projectId: 'proj-night-light',
    projectName: 'Automatic Night Light',
    timestamp: '2026-03-10T12:00:00Z',
    unitMassGrams: 85,
    notes: 'Compact night light on mini breadboard.',
    allocatedItems: [
      { inventoryItemId: 'elena-inv-1', catalogId: 'comp-arduino-uno', quantity: 1 },
      { inventoryItemId: 'elena-inv-2', catalogId: 'comp-photoresistor-ldr', quantity: 1 },
    ],
  },
  {
    id: 'rl-elena-2',
    action: 'disassembly-reclaim',
    projectId: 'proj-older-prototype',
    projectName: 'Reclaimed Early Rover Chassis',
    timestamp: '2026-03-22T09:15:00Z',
    unitMassGrams: 140,
    notes: 'Disassembled completed trial and returned working driver and chassis to stock.',
    allocatedItems: [
      { inventoryItemId: 'elena-inv-3', catalogId: 'comp-motor-driver-l298n', quantity: 1 },
    ],
  },
  {
    id: 'rl-vance-1',
    action: 'disassembly-reclaim',
    projectId: 'proj-lab-rig',
    projectName: 'Bench Test Rig Reclaim',
    timestamp: '2026-03-24T16:30:00Z',
    unitMassGrams: 180,
    notes: 'Recertified components returned to departmental circulating stock.',
    allocatedItems: [],
  },
];

export const SEED_EXCHANGE_LISTINGS: ComponentExchangeListing[] = [
  {
    id: 'ex-seed-1',
    ownerId: 'maker-elena',
    ownerDisplayName: 'Elena Rostova',
    componentInventoryId: 'elena-inv-surplus-motor',
    catalogId: 'comp-dc-gearmotor',
    componentName: 'Yellow TT DC Gear Motor (6V Dual Shaft)',
    category: 'actuator',
    quantity: 2,
    condition: 'working',
    verificationStatus: 'recorded-test',
    exchangeType: 'free-donation',
    status: 'available',
    approximateLocation: 'Robotics Wing Drop Box (Bin #4)',
    notes: 'Tested with 4.5V bench pack. Includes pre-soldered 15cm lead wires.',
    createdAt: '2026-03-24T10:00:00Z',
    updatedAt: '2026-03-24T10:00:00Z',
  },
  {
    id: 'ex-seed-2',
    ownerId: 'maker-marcus',
    ownerDisplayName: 'Marcus Chen',
    componentInventoryId: 'marcus-inv-oled',
    catalogId: 'comp-oled-096-i2c',
    componentName: '0.96" I2C Monochrome OLED Display (128x64)',
    category: 'display',
    quantity: 1,
    condition: 'working',
    verificationStatus: 'recorded-test',
    exchangeType: 'swap-preferred',
    status: 'available',
    approximateLocation: 'Civic Hardware Collective Drop-off',
    notes: 'Works perfectly on address 0x3C. Looking for analog pressure sensors.',
    createdAt: '2026-03-25T14:30:00Z',
    updatedAt: '2026-03-25T14:30:00Z',
  },
  {
    id: 'ex-seed-3',
    ownerId: 'maker-vance',
    ownerDisplayName: 'Dr. Robert Vance',
    componentInventoryId: 'vance-inv-logic',
    catalogId: 'comp-74hc595-shift-reg',
    componentName: '74HC595 8-bit Shift Register IC (DIP-16)',
    category: 'passive',
    quantity: 5,
    condition: 'working',
    verificationStatus: 'recorded-test',
    exchangeType: 'free-donation',
    status: 'available',
    approximateLocation: 'Innovation Lab Staff Bench',
    notes: 'Surplus from lab instrumentation kit. Tested and anti-static bagged.',
    createdAt: '2026-03-26T09:00:00Z',
    updatedAt: '2026-03-26T09:00:00Z',
  },
];

type Listener = () => void;
const listeners: Set<Listener> = new Set();

function notifyListeners() {
  listeners.forEach((listener) => {
    try {
      listener();
    } catch (err) {
      console.error('Error notifying storage listener:', err);
    }
  });
}

/**
 * Executes safe versioned migration from Phase 1 to Phase 2.
 * Adithya's inventory and profile are preserved strictly.
 */
function ensureMigratedToV2() {
  if (typeof localStorage === 'undefined') return;
  try {
    // Check and seed new Phase 2/3 collections unconditionally if missing
    if (!localStorage.getItem(ECO_POINTS_KEY)) {
      localStorage.setItem(ECO_POINTS_KEY, JSON.stringify(SEED_ECO_POINTS));
    }
    if (!localStorage.getItem(COMPLETED_PROJECTS_KEY)) {
      localStorage.setItem(COMPLETED_PROJECTS_KEY, JSON.stringify(SEED_COMPLETED_PROJECTS));
    }
    if (!localStorage.getItem(REUSE_LEDGER_KEY)) {
      localStorage.setItem(REUSE_LEDGER_KEY, JSON.stringify(SEED_REUSE_LEDGER));
    }
    if (!localStorage.getItem(EXCHANGE_LISTINGS_KEY)) {
      localStorage.setItem(EXCHANGE_LISTINGS_KEY, JSON.stringify(SEED_EXCHANGE_LISTINGS));
    }

    const version = localStorage.getItem(STORAGE_VERSION_KEY);
    if (version === 'v2') return;

    console.log('[EcoBuild] Running versioned migration to Phase 2 (v2)...');

    // 1. Migrate / Initialize Active User
    const currentActive = localStorage.getItem(ACTIVE_USER_KEY);
    if (!currentActive) {
      localStorage.setItem(ACTIVE_USER_KEY, 'maker-adithya');
    }

    // 2. Migrate / Initialize Maker Profiles
    const existingMakersData = localStorage.getItem(MAKERS_KEY);
    let makers: MakerProfile[] = DEMO_MAKERS;
    if (existingMakersData) {
      try {
        const parsed = JSON.parse(existingMakersData);
        if (Array.isArray(parsed) && parsed.length > 0) {
          makers = parsed;
        }
      } catch (e) {
        // fallback
      }
    }

    // If Adithya had a legacy profile, sync displayName and preferences to maker-adithya
    const legacyProfileData = localStorage.getItem(LEGACY_PROFILE_KEY);
    if (legacyProfileData) {
      try {
        const legacyProfile: UserProfile = JSON.parse(legacyProfileData);
        makers = makers.map((m) =>
          m.id === 'maker-adithya'
            ? {
                ...m,
                displayName: legacyProfile.displayName || m.displayName,
                experience: legacyProfile.experience || m.experience,
                interests: legacyProfile.interests || m.interests,
              }
            : m
        );
      } catch (e) {
        console.warn('Failed parsing legacy profile for migration:', e);
      }
    }
    localStorage.setItem(MAKERS_KEY, JSON.stringify(makers));

    // 3. Migrate Inventories per Maker
    const inventoriesByMaker: Record<string, ComponentItem[]> = {
      ...DEMO_INVENTORIES_BY_MAKER,
    };

    // Migrate Adithya's existing inventory from v1 if present
    const legacyInventoryData = localStorage.getItem(LEGACY_INVENTORY_KEY);
    if (legacyInventoryData) {
      try {
        const legacyItems: ComponentItem[] = JSON.parse(legacyInventoryData);
        if (Array.isArray(legacyItems) && legacyItems.length > 0) {
          inventoriesByMaker['maker-adithya'] = legacyItems.map((item) => ({
            ...item,
            ownerId: 'maker-adithya',
            isSharedForCollaboration:
              item.isSharedForCollaboration !== undefined
                ? item.isSharedForCollaboration
                : true,
          }));
        } else {
          inventoriesByMaker['maker-adithya'] = SEED_INVENTORY.map((item) => ({
            ...item,
            ownerId: 'maker-adithya',
            isSharedForCollaboration: true,
          }));
        }
      } catch (e) {
        inventoriesByMaker['maker-adithya'] = SEED_INVENTORY.map((item) => ({
          ...item,
          ownerId: 'maker-adithya',
          isSharedForCollaboration: true,
        }));
      }
    } else {
      inventoriesByMaker['maker-adithya'] = SEED_INVENTORY.map((item) => ({
        ...item,
        ownerId: 'maker-adithya',
        isSharedForCollaboration: true,
      }));
    }

    localStorage.setItem(INVENTORIES_KEY, JSON.stringify(inventoriesByMaker));

    // 4. Initialize Network Proposals, Workspaces, and Mentor Requests
    if (!localStorage.getItem(PROPOSALS_KEY)) {
      localStorage.setItem(PROPOSALS_KEY, JSON.stringify(SEED_PROPOSALS));
    }
    if (!localStorage.getItem(WORKSPACES_KEY)) {
      localStorage.setItem(WORKSPACES_KEY, JSON.stringify(SEED_WORKSPACES));
    }
    if (!localStorage.getItem(MENTOR_REQUESTS_KEY)) {
      localStorage.setItem(
        MENTOR_REQUESTS_KEY,
        JSON.stringify(SEED_MENTOR_REQUESTS)
      );
    }

    // Set storage version tag
    localStorage.setItem(STORAGE_VERSION_KEY, 'v2');
    console.log('[EcoBuild] Migration to Phase 2 v2 completed successfully.');
  } catch (err) {
    console.error('[EcoBuild] Error during v2 migration:', err);
  }
}

// Run migration immediately
ensureMigratedToV2();

export const StorageService = {
  subscribe(listener: Listener): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },

  // ==========================================
  // Active User & Profiles
  // ==========================================

  getActiveUserId(): string {
    return localStorage.getItem(ACTIVE_USER_KEY) || 'maker-adithya';
  },

  setActiveUserId(id: string): void {
    localStorage.setItem(ACTIVE_USER_KEY, id);
    notifyListeners();
  },

  getActiveUser(): MakerProfile {
    const activeId = this.getActiveUserId();
    const makers = this.getMakerProfiles();
    const found = makers.find((m) => m.id === activeId);
    return (
      found ||
      makers[0] || {
        id: 'maker-adithya',
        displayName: 'Adithya',
        isDemo: true,
        experience: 'Beginner',
        skills: ['Arduino programming', 'Circuit assembly'],
        interests: ['robotics', 'home automation', 'learning electronics'],
        collaborationPreference: 'Open to team builds',
      }
    );
  },

  getMakerProfiles(): MakerProfile[] {
    try {
      const data = localStorage.getItem(MAKERS_KEY);
      if (!data) return DEMO_MAKERS;
      const parsed = JSON.parse(data);
      return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEMO_MAKERS;
    } catch (e) {
      return DEMO_MAKERS;
    }
  },

  getMakerProfile(id: string): MakerProfile | undefined {
    return this.getMakerProfiles().find((m) => m.id === id);
  },

  updateMakerProfile(profile: MakerProfile): void {
    try {
      const makers = this.getMakerProfiles();
      const updated = makers.map((m) => (m.id === profile.id ? profile : m));
      localStorage.setItem(MAKERS_KEY, JSON.stringify(updated));
      notifyListeners();
    } catch (e) {
      console.error('Failed to update maker profile:', e);
    }
  },

  // Backwards compatibility for UserProfile used in Phase 1 profile page
  getProfile(): UserProfile {
    const active = this.getActiveUser();
    return {
      displayName: active.displayName,
      experience: active.experience,
      interests: active.interests,
      preferredDifficulty:
        active.experience === 'Advanced'
          ? 'Advanced'
          : active.experience === 'Intermediate'
          ? 'Intermediate'
          : 'Beginner',
      availableTime: '1-2 hours / week',
      hasCompletedOnboarding: true,
    };
  },

  saveProfile(profile: UserProfile): void {
    const active = this.getActiveUser();
    this.updateMakerProfile({
      ...active,
      displayName: profile.displayName,
      experience: profile.experience,
      interests: profile.interests,
    });
  },

  // ==========================================
  // Inventory per Maker
  // ==========================================

  getAllInventories(): Record<string, ComponentItem[]> {
    try {
      const data = localStorage.getItem(INVENTORIES_KEY);
      if (!data) return DEMO_INVENTORIES_BY_MAKER;
      const parsed = JSON.parse(data);
      return parsed && typeof parsed === 'object'
        ? parsed
        : DEMO_INVENTORIES_BY_MAKER;
    } catch (e) {
      return DEMO_INVENTORIES_BY_MAKER;
    }
  },

  getInventory(ownerId?: string): ComponentItem[] {
    const targetOwner = ownerId || this.getActiveUserId();
    const all = this.getAllInventories();
    const items = all[targetOwner];
    if (Array.isArray(items)) {
      return items;
    }
    // Fallback if user has no initialized list
    return [];
  },

  saveInventory(inventory: ComponentItem[], ownerId?: string): void {
    try {
      const targetOwner = ownerId || this.getActiveUserId();
      const all = this.getAllInventories();
      const updated = {
        ...all,
        [targetOwner]: inventory.map((item) => ({
          ...item,
          ownerId: targetOwner,
          isSharedForCollaboration:
            item.isSharedForCollaboration !== undefined
              ? item.isSharedForCollaboration
              : true,
        })),
      };
      localStorage.setItem(INVENTORIES_KEY, JSON.stringify(updated));

      // Also mirror to legacy key if saving for Adithya
      if (targetOwner === 'maker-adithya') {
        localStorage.setItem(LEGACY_INVENTORY_KEY, JSON.stringify(inventory));
      }

      notifyListeners();
    } catch (e) {
      console.error('Failed to save inventory:', e);
    }
  },

  addComponent(item: ComponentItem, ownerId?: string): void {
    const targetOwner = ownerId || this.getActiveUserId();
    const current = this.getInventory(targetOwner);
    const updated = [
      {
        ...item,
        ownerId: targetOwner,
        isSharedForCollaboration:
          item.isSharedForCollaboration !== undefined
            ? item.isSharedForCollaboration
            : true,
      },
      ...current,
    ];
    this.saveInventory(updated, targetOwner);
  },

  updateComponent(item: ComponentItem, ownerId?: string): void {
    const targetOwner = ownerId || item.ownerId || this.getActiveUserId();
    const current = this.getInventory(targetOwner);
    const updated = current.map((existing) =>
      existing.id === item.id ? { ...existing, ...item } : existing
    );
    this.saveInventory(updated, targetOwner);
  },

  deleteComponent(id: string, ownerId?: string): void {
    const targetOwner = ownerId || this.getActiveUserId();
    const current = this.getInventory(targetOwner);
    const updated = current.filter((item) => item.id !== id);
    this.saveInventory(updated, targetOwner);
  },

  // ==========================================
  // Saved Projects
  // ==========================================

  getSavedProjectIds(): string[] {
    try {
      const data = localStorage.getItem(SAVED_PROJECTS_KEY);
      if (!data) return DEFAULT_SAVED_PROJECTS;
      const parsed = JSON.parse(data);
      return Array.isArray(parsed) ? parsed : DEFAULT_SAVED_PROJECTS;
    } catch (e) {
      return DEFAULT_SAVED_PROJECTS;
    }
  },

  saveSavedProjectIds(ids: string[]): void {
    try {
      localStorage.setItem(SAVED_PROJECTS_KEY, JSON.stringify(ids));
      notifyListeners();
    } catch (e) {
      console.error('Failed to save saved project IDs:', e);
    }
  },

  toggleSaveProject(projectId: string): boolean {
    const saved = this.getSavedProjectIds();
    const exists = saved.includes(projectId);
    const updated = exists
      ? saved.filter((id) => id !== projectId)
      : [...saved, projectId];
    this.saveSavedProjectIds(updated);
    return !exists;
  },

  isProjectSaved(projectId: string): boolean {
    return this.getSavedProjectIds().includes(projectId);
  },

  // ==========================================
  // Proposals
  // ==========================================

  getProposals(): CollaborationProposal[] {
    try {
      const data = localStorage.getItem(PROPOSALS_KEY);
      if (!data) return SEED_PROPOSALS;
      const parsed = JSON.parse(data);
      return Array.isArray(parsed) ? parsed : SEED_PROPOSALS;
    } catch (e) {
      return SEED_PROPOSALS;
    }
  },

  saveProposal(proposal: CollaborationProposal): void {
    try {
      const current = this.getProposals();
      const existingIdx = current.findIndex((p) => p.id === proposal.id);
      let updated: CollaborationProposal[];
      if (existingIdx >= 0) {
        updated = current.map((p) => (p.id === proposal.id ? proposal : p));
      } else {
        updated = [proposal, ...current];
      }
      localStorage.setItem(PROPOSALS_KEY, JSON.stringify(updated));
      notifyListeners();
    } catch (e) {
      console.error('Failed to save proposal:', e);
    }
  },

  /**
   * Accepts a proposal with full inventory rechecking and reservation creation.
   */
  acceptProposal(
    proposalId: string
  ): { success: boolean; error?: string; workspaceId?: string } {
    try {
      const proposals = this.getProposals();
      const proposal = proposals.find((p) => p.id === proposalId);
      if (!proposal) {
        return { success: false, error: 'Proposal not found.' };
      }
      if (proposal.status !== 'pending') {
        return {
          success: false,
          error: `Proposal is already ${proposal.status}.`,
        };
      }

      // Re-verify availability of sender contributions
      const senderInventory = this.getInventory(proposal.senderId);
      for (const contrib of proposal.proposedSenderContributions) {
        const item = senderInventory.find(
          (i) => i.id === contrib.inventoryItemId
        );
        if (!item) {
          return {
            success: false,
            error: `Sender component "${contrib.name}" is no longer in inventory.`,
          };
        }
        const free = Math.max(
          0,
          item.totalQuantity - item.reservedQuantity - item.installedQuantity
        );
        if (
          free < contrib.quantity ||
          item.condition !== 'working' ||
          item.isSharedForCollaboration === false
        ) {
          return {
            success: false,
            error: `Sender component "${contrib.name}" lacks sufficient free working stock (${free} free, ${contrib.quantity} needed).`,
          };
        }
      }

      // Re-verify availability of receiver contributions
      const receiverInventory = this.getInventory(proposal.receiverId);
      for (const contrib of proposal.proposedReceiverContributions) {
        const item = receiverInventory.find(
          (i) => i.id === contrib.inventoryItemId
        );
        if (!item) {
          return {
            success: false,
            error: `Receiver component "${contrib.name}" is no longer in inventory.`,
          };
        }
        const free = Math.max(
          0,
          item.totalQuantity - item.reservedQuantity - item.installedQuantity
        );
        if (
          free < contrib.quantity ||
          item.condition !== 'working' ||
          item.isSharedForCollaboration === false
        ) {
          return {
            success: false,
            error: `Receiver component "${contrib.name}" lacks sufficient free working stock (${free} free, ${contrib.quantity} needed).`,
          };
        }
      }

      // Everything verified! Create Workspace and Reservations
      const workspaceId = `ws-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
      const nowIso = new Date().toISOString();

      const reservations: ComponentReservation[] = [];

      // 1. Reserve Sender parts
      const updatedSenderInventory = senderInventory.map((item) => {
        const contrib = proposal.proposedSenderContributions.find(
          (c) => c.inventoryItemId === item.id
        );
        if (contrib) {
          reservations.push({
            id: `res-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
            workspaceId,
            proposalId: proposal.id,
            inventoryItemId: item.id,
            ownerId: proposal.senderId,
            catalogId: contrib.catalogId,
            name: contrib.name,
            quantity: contrib.quantity,
            reservedAt: nowIso,
            status: 'active',
          });
          return {
            ...item,
            reservedQuantity: item.reservedQuantity + contrib.quantity,
            lastUpdated: nowIso,
          };
        }
        return item;
      });
      this.saveInventory(updatedSenderInventory, proposal.senderId);

      // 2. Reserve Receiver parts
      const updatedReceiverInventory = receiverInventory.map((item) => {
        const contrib = proposal.proposedReceiverContributions.find(
          (c) => c.inventoryItemId === item.id
        );
        if (contrib) {
          reservations.push({
            id: `res-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
            workspaceId,
            proposalId: proposal.id,
            inventoryItemId: item.id,
            ownerId: proposal.receiverId,
            catalogId: contrib.catalogId,
            name: contrib.name,
            quantity: contrib.quantity,
            reservedAt: nowIso,
            status: 'active',
          });
          return {
            ...item,
            reservedQuantity: item.reservedQuantity + contrib.quantity,
            lastUpdated: nowIso,
          };
        }
        return item;
      });
      this.saveInventory(updatedReceiverInventory, proposal.receiverId);

      // 3. Build Member roles map
      const memberRoles: Record<string, string> = {};
      proposal.suggestedResponsibilities.forEach((r) => {
        memberRoles[r.memberId] = r.roleDescription;
      });

      // 4. Create Workspace
      const newWorkspace: ProjectWorkspace = {
        id: workspaceId,
        projectId: proposal.projectId,
        proposalId: proposal.id,
        memberIds: [proposal.senderId, proposal.receiverId],
        memberRoles,
        status: 'active',
        reservations,
        tasks: [
          {
            id: `task-${Date.now().toString(36)}-1`,
            workspaceId,
            title: 'Verify physical component interfaces and pinouts',
            description: 'Check logic voltages and review team wiring schematic.',
            assigneeId: proposal.receiverId,
            status: 'todo',
            createdAt: nowIso,
          },
          {
            id: `task-${Date.now().toString(36)}-2`,
            workspaceId,
            title: 'Breadboard prototype circuit assembly',
            description: 'Connect shared components according to project specification.',
            assigneeId: proposal.senderId,
            status: 'todo',
            createdAt: nowIso,
          },
        ],
        messages: [
          {
            id: `msg-${Date.now().toString(36)}-1`,
            workspaceId,
            authorId: proposal.senderId,
            content: `Collaboration proposal accepted! Agreed component contributions are now reserved for this workspace.`,
            createdAt: nowIso,
          },
        ],
        mentorRequestIds: [],
        createdAt: nowIso,
      };

      this.saveWorkspace(newWorkspace);

      // 5. Update proposal status
      this.saveProposal({
        ...proposal,
        status: 'accepted',
        respondedAt: nowIso,
        workspaceId,
      });

      return { success: true, workspaceId };
    } catch (err: any) {
      console.error('Error accepting proposal:', err);
      return { success: false, error: err?.message || 'Failed to accept proposal.' };
    }
  },

  declineProposal(proposalId: string, reason?: string): void {
    const proposals = this.getProposals();
    const proposal = proposals.find((p) => p.id === proposalId);
    if (proposal && proposal.status === 'pending') {
      this.saveProposal({
        ...proposal,
        status: 'declined',
        respondedAt: new Date().toISOString(),
        rejectionReason: reason || 'Not available for this project at this time.',
      });
    }
  },

  cancelProposal(proposalId: string): void {
    const proposals = this.getProposals();
    const proposal = proposals.find((p) => p.id === proposalId);
    if (proposal && proposal.status === 'pending') {
      this.saveProposal({
        ...proposal,
        status: 'cancelled',
        respondedAt: new Date().toISOString(),
      });
    }
  },

  // ==========================================
  // Workspaces
  // ==========================================

  getWorkspaces(): ProjectWorkspace[] {
    try {
      const data = localStorage.getItem(WORKSPACES_KEY);
      if (!data) return SEED_WORKSPACES;
      const parsed = JSON.parse(data);
      return Array.isArray(parsed) ? parsed : SEED_WORKSPACES;
    } catch (e) {
      return SEED_WORKSPACES;
    }
  },

  getWorkspace(id: string): ProjectWorkspace | undefined {
    return this.getWorkspaces().find((w) => w.id === id);
  },

  saveWorkspace(workspace: ProjectWorkspace): void {
    try {
      const current = this.getWorkspaces();
      const existingIdx = current.findIndex((w) => w.id === workspace.id);
      let updated: ProjectWorkspace[];
      if (existingIdx >= 0) {
        updated = current.map((w) => (w.id === workspace.id ? workspace : w));
      } else {
        updated = [workspace, ...current];
      }
      localStorage.setItem(WORKSPACES_KEY, JSON.stringify(updated));
      notifyListeners();
    } catch (e) {
      console.error('Failed to save workspace:', e);
    }
  },

  cancelWorkspace(workspaceId: string): void {
    try {
      const workspaces = this.getWorkspaces();
      const workspace = workspaces.find((w) => w.id === workspaceId);
      if (!workspace || workspace.status === 'cancelled') return;

      // Release all active reservations and restore free stock
      const allInventories = this.getAllInventories();

      workspace.reservations.forEach((res) => {
        if (res.status === 'active') {
          const ownerInv = allInventories[res.ownerId];
          if (Array.isArray(ownerInv)) {
            allInventories[res.ownerId] = ownerInv.map((item) => {
              if (item.id === res.inventoryItemId) {
                return {
                  ...item,
                  reservedQuantity: Math.max(
                    0,
                    item.reservedQuantity - res.quantity
                  ),
                  lastUpdated: new Date().toISOString(),
                };
              }
              return item;
            });
          }
          res.status = 'released';
        }
      });

      localStorage.setItem(INVENTORIES_KEY, JSON.stringify(allInventories));

      // Mark workspace cancelled
      this.saveWorkspace({
        ...workspace,
        status: 'cancelled',
      });
    } catch (e) {
      console.error('Failed to cancel workspace:', e);
    }
  },

  addWorkspaceTask(
    workspaceId: string,
    task: Omit<WorkspaceTask, 'id' | 'createdAt'>
  ): void {
    const workspace = this.getWorkspace(workspaceId);
    if (!workspace) return;

    const newTask: WorkspaceTask = {
      ...task,
      id: `task-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
      workspaceId,
      createdAt: new Date().toISOString(),
    };

    this.saveWorkspace({
      ...workspace,
      tasks: [...workspace.tasks, newTask],
    });
  },

  updateWorkspaceTask(workspaceId: string, task: WorkspaceTask): void {
    const workspace = this.getWorkspace(workspaceId);
    if (!workspace) return;

    this.saveWorkspace({
      ...workspace,
      tasks: workspace.tasks.map((t) => (t.id === task.id ? task : t)),
    });
  },

  deleteWorkspaceTask(workspaceId: string, taskId: string): void {
    const workspace = this.getWorkspace(workspaceId);
    if (!workspace) return;

    this.saveWorkspace({
      ...workspace,
      tasks: workspace.tasks.filter((t) => t.id !== taskId),
    });
  },

  addWorkspaceMessage(
    workspaceId: string,
    message: { authorId: string; content: string }
  ): void {
    const workspace = this.getWorkspace(workspaceId);
    if (!workspace) return;

    const newMsg: WorkspaceMessage = {
      id: `msg-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
      workspaceId,
      authorId: message.authorId,
      content: message.content.trim(),
      createdAt: new Date().toISOString(),
    };

    this.saveWorkspace({
      ...workspace,
      messages: [...workspace.messages, newMsg],
    });
  },

  // ==========================================
  // Mentorship Requests
  // ==========================================

  getMentorRequests(): MentorshipRequest[] {
    try {
      const data = localStorage.getItem(MENTOR_REQUESTS_KEY);
      if (!data) return SEED_MENTOR_REQUESTS;
      const parsed = JSON.parse(data);
      return Array.isArray(parsed) ? parsed : SEED_MENTOR_REQUESTS;
    } catch (e) {
      return SEED_MENTOR_REQUESTS;
    }
  },

  saveMentorRequest(request: MentorshipRequest): void {
    try {
      const current = this.getMentorRequests();
      const existingIdx = current.findIndex((r) => r.id === request.id);
      let updated: MentorshipRequest[];
      if (existingIdx >= 0) {
        updated = current.map((r) => (r.id === request.id ? request : r));
      } else {
        updated = [request, ...current];
      }
      localStorage.setItem(MENTOR_REQUESTS_KEY, JSON.stringify(updated));
      notifyListeners();
    } catch (e) {
      console.error('Failed to save mentor request:', e);
    }
  },

  respondToMentorRequest(
    requestId: string,
    authorId: string,
    content: string
  ): void {
    const requests = this.getMentorRequests();
    const request = requests.find((r) => r.id === requestId);
    if (!request) return;

    const newResponse = {
      id: `resp-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
      authorId,
      content: content.trim(),
      createdAt: new Date().toISOString(),
    };

    this.saveMentorRequest({
      ...request,
      status: request.status === 'open' ? 'accepted' : request.status,
      responses: [...request.responses, newResponse],
    });
  },

  resolveMentorRequest(requestId: string): void {
    const requests = this.getMentorRequests();
    const request = requests.find((r) => r.id === requestId);
    if (!request) return;

    this.saveMentorRequest({
      ...request,
      status: 'resolved',
      resolvedAt: new Date().toISOString(),
    });
  },

  // ==========================================
  // 3D Build Guide Progress Persistence (Scoped by Maker, Project, Recipe Version & Workspace)
  // ==========================================

  getGuideScopedKey(
    makerId: string,
    projectId: string,
    recipeVersion: string = 'v1',
    workspaceId?: string
  ): string {
    return `${makerId}::${projectId}::${workspaceId || 'standalone'}::${recipeVersion}`;
  },

  getAllGuideProgress(): Record<string, BuildGuideProgress> {
    try {
      const data = localStorage.getItem(GUIDE_PROGRESS_KEY);
      if (!data) return {};
      const parsed: Record<string, any> = JSON.parse(data) || {};

      // Safe migration: check for legacy un-scoped entries (e.g. key === 'proj-smart-dustbin')
      let hasMigrated = false;
      const migrated: Record<string, BuildGuideProgress> = {};

      for (const [key, value] of Object.entries(parsed)) {
        if (!key.includes('::')) {
          // Legacy Phase 3 un-scoped entry -> migrate to Adithya's standalone v1 scope
          const scopedKey = this.getGuideScopedKey(
            'maker-adithya',
            key,
            'v1',
            undefined
          );
          migrated[scopedKey] = {
            makerId: 'maker-adithya',
            projectId: key,
            recipeVersion: 'v1',
            workspaceId: undefined,
            currentStepIndex: value.currentStepIndex || 0,
            completedStepIndices: value.completedStepIndices || [],
            playbackSpeed: value.playbackSpeed || 1,
            lastUpdated: value.lastUpdated || new Date().toISOString(),
            isLearningCompleted:
              (value.completedStepIndices || []).length >= 6,
          };
          hasMigrated = true;
        } else {
          migrated[key] = value as BuildGuideProgress;
        }
      }

      if (hasMigrated) {
        localStorage.setItem(GUIDE_PROGRESS_KEY, JSON.stringify(migrated));
      }

      return migrated;
    } catch {
      return {};
    }
  },

  getGuideProgress(
    makerId?: string,
    projectId: string = 'proj-smart-dustbin',
    recipeVersion: string = 'v1',
    workspaceId?: string
  ): BuildGuideProgress {
    const effectiveMakerId = makerId || this.getActiveUser().id;
    const scopedKey = this.getGuideScopedKey(
      effectiveMakerId,
      projectId,
      recipeVersion,
      workspaceId
    );
    const all = this.getAllGuideProgress();

    if (all[scopedKey]) {
      return all[scopedKey];
    }

    return {
      makerId: effectiveMakerId,
      projectId,
      recipeVersion,
      workspaceId,
      currentStepIndex: 0,
      completedStepIndices: [],
      playbackSpeed: 1,
      isLearningCompleted: false,
      lastUpdated: new Date().toISOString(),
    };
  },

  saveGuideProgress(progress: BuildGuideProgress): void {
    try {
      const all = this.getAllGuideProgress();
      const scopedKey = this.getGuideScopedKey(
        progress.makerId,
        progress.projectId,
        progress.recipeVersion || 'v1',
        progress.workspaceId
      );

      all[scopedKey] = {
        ...progress,
        recipeVersion: progress.recipeVersion || 'v1',
        isLearningCompleted:
          progress.isLearningCompleted ??
          progress.completedStepIndices.length >= 6,
        lastUpdated: new Date().toISOString(),
      };

      localStorage.setItem(GUIDE_PROGRESS_KEY, JSON.stringify(all));
      notifyListeners();
    } catch (e) {
      console.error('Failed to save guide progress:', e);
    }
  },

  resetGuideProgress(
    makerId?: string,
    projectId: string = 'proj-smart-dustbin',
    recipeVersion: string = 'v1',
    workspaceId?: string
  ): void {
    try {
      const effectiveMakerId = makerId || this.getActiveUser().id;
      const scopedKey = this.getGuideScopedKey(
        effectiveMakerId,
        projectId,
        recipeVersion,
        workspaceId
      );

      const all = this.getAllGuideProgress();
      delete all[scopedKey];
      localStorage.setItem(GUIDE_PROGRESS_KEY, JSON.stringify(all));
      notifyListeners();
    } catch (e) {
      console.error('Failed to reset guide progress:', e);
    }
  },

  // ==========================================
  // Eco Points System (Phase 2)
  // ==========================================

  getEcoPointTransactions(userId?: string): EcoPointTransaction[] {
    ensureMigratedToV2();
    try {
      const data = localStorage.getItem(ECO_POINTS_KEY);
      const all: EcoPointTransaction[] = data ? JSON.parse(data) : SEED_ECO_POINTS;
      if (userId) {
        return all.filter((tx) => tx.userId === userId);
      }
      return all;
    } catch (e) {
      console.error('Failed reading eco point transactions:', e);
      return SEED_ECO_POINTS;
    }
  },

  awardEcoPoints(
    tx: Omit<EcoPointTransaction, 'id' | 'createdAt'>
  ): EcoPointTransaction | null {
    ensureMigratedToV2();
    try {
      const existing = this.getEcoPointTransactions();
      // Deduplication check: cannot award duplicate points for same action reference
      if (tx.referenceType && tx.referenceId) {
        const alreadyAwarded = existing.some(
          (t) =>
            t.userId === tx.userId &&
            t.referenceType === tx.referenceType &&
            t.referenceId === tx.referenceId
        );
        if (alreadyAwarded) {
          console.warn('[EcoBuild] Eco points already awarded for:', tx.referenceType, tx.referenceId);
          return null;
        }
      }

      const fullTx: EcoPointTransaction = {
        ...tx,
        id: `tx-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
        createdAt: new Date().toISOString(),
      };

      const updated = [fullTx, ...existing];
      localStorage.setItem(ECO_POINTS_KEY, JSON.stringify(updated));
      notifyListeners();
      return fullTx;
    } catch (e) {
      console.error('Failed awarding eco points:', e);
      return null;
    }
  },

  // ==========================================
  // Builder Progress & Projects (Phase 3 & 10)
  // ==========================================

  getCompletedProjects(userId?: string): CompletedProjectRecord[] {
    ensureMigratedToV2();
    try {
      const data = localStorage.getItem(COMPLETED_PROJECTS_KEY);
      const all: CompletedProjectRecord[] = data ? JSON.parse(data) : SEED_COMPLETED_PROJECTS;
      if (userId) {
        return all.filter((cp) => cp.userId === userId);
      }
      return all;
    } catch (e) {
      console.error('Failed reading completed projects:', e);
      return SEED_COMPLETED_PROJECTS;
    }
  },

  recordCompletedProject(
    record: Omit<CompletedProjectRecord, 'id' | 'completedAt'>
  ): CompletedProjectRecord | null {
    ensureMigratedToV2();
    try {
      const existing = this.getCompletedProjects();
      const alreadyCompleted = existing.some(
        (cp) => cp.userId === record.userId && cp.projectId === record.projectId
      );

      const fullRecord: CompletedProjectRecord = {
        ...record,
        id: `cp-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
        completedAt: new Date().toISOString(),
      };

      if (!alreadyCompleted) {
        localStorage.setItem(COMPLETED_PROJECTS_KEY, JSON.stringify([fullRecord, ...existing]));

        // Award verified physical build eco points (50 points)
        this.awardEcoPoints({
          userId: record.userId,
          eventType: 'physical-build',
          points: ECO_POINT_VALUES['physical-build'],
          referenceType: 'project',
          referenceId: record.projectId,
          reason: `Verified physical completion of ${record.projectTitle}`,
          verificationSource: 'physical-ledger',
        });
      } else {
        // Update existing record if repeated build
        const updated = existing.map((cp) =>
          cp.userId === record.userId && cp.projectId === record.projectId ? fullRecord : cp
        );
        localStorage.setItem(COMPLETED_PROJECTS_KEY, JSON.stringify(updated));
      }

      notifyListeners();
      return fullRecord;
    } catch (e) {
      console.error('Failed recording completed project:', e);
      return null;
    }
  },

  // ==========================================
  // Hardware Reuse Ledger (Phase 1 & 12)
  // ==========================================

  getReuseLedger(userId?: string): ReuseLedgerEntry[] {
    ensureMigratedToV2();
    try {
      const data = localStorage.getItem(REUSE_LEDGER_KEY);
      return data ? JSON.parse(data) : SEED_REUSE_LEDGER;
    } catch (e) {
      console.error('Failed reading reuse ledger:', e);
      return SEED_REUSE_LEDGER;
    }
  },

  recordReuseLedgerEntry(entry: ReuseLedgerEntry): ReuseLedgerEntry {
    ensureMigratedToV2();
    try {
      const existing = this.getReuseLedger();
      const updated = [entry, ...existing];
      localStorage.setItem(REUSE_LEDGER_KEY, JSON.stringify(updated));

      // If disassembly-reclaim, award 30 reuse cycle eco points
      const activeUser = this.getActiveUser();
      if (entry.action === 'disassembly-reclaim' && activeUser) {
        this.awardEcoPoints({
          userId: activeUser.id,
          eventType: 'reuse-cycle',
          points: ECO_POINT_VALUES['reuse-cycle'],
          referenceType: 'cycle',
          referenceId: entry.id,
          reason: `Reclaimed components from ${entry.projectName || 'hardware project'}`,
          verificationSource: 'physical-ledger',
        });
      }

      notifyListeners();
      return entry;
    } catch (e) {
      console.error('Failed recording reuse ledger entry:', e);
      return entry;
    }
  },

  // ==========================================
  // Component Exchange & Atomic Handover (Phase 9)
  // ==========================================

  getExchangeListings(): ComponentExchangeListing[] {
    ensureMigratedToV2();
    try {
      const data = localStorage.getItem(EXCHANGE_LISTINGS_KEY);
      return data ? JSON.parse(data) : SEED_EXCHANGE_LISTINGS;
    } catch (e) {
      console.error('Failed reading exchange listings:', e);
      return SEED_EXCHANGE_LISTINGS;
    }
  },

  publishExchangeListing(listing: ComponentExchangeListing): void {
    ensureMigratedToV2();
    try {
      const existing = this.getExchangeListings();
      const updated = [listing, ...existing];
      localStorage.setItem(EXCHANGE_LISTINGS_KEY, JSON.stringify(updated));

      // Award 10 Eco Points for sharing a surplus component
      this.awardEcoPoints({
        userId: listing.ownerId,
        eventType: 'component-shared',
        points: ECO_POINT_VALUES['component-shared'],
        referenceType: 'component',
        referenceId: listing.id,
        reason: `Offered ${listing.componentName} for circular community reuse`,
        verificationSource: 'peer-exchange',
      });

      notifyListeners();
    } catch (e) {
      console.error('Failed publishing exchange listing:', e);
    }
  },

  updateExchangeListingStatus(
    listingId: string,
    status: ComponentExchangeListing['status'],
    requesterId?: string,
    requesterDisplayName?: string
  ): void {
    ensureMigratedToV2();
    try {
      const existing = this.getExchangeListings();
      const updated = existing.map((l) => {
        if (l.id !== listingId) return l;
        const next: ComponentExchangeListing = {
          ...l,
          status,
          updatedAt: new Date().toISOString(),
        };
        if (requesterId) next.requesterId = requesterId;
        if (requesterDisplayName) next.requesterDisplayName = requesterDisplayName;
        return next;
      });
      localStorage.setItem(EXCHANGE_LISTINGS_KEY, JSON.stringify(updated));
      notifyListeners();
    } catch (e) {
      console.error('Failed updating exchange listing status:', e);
    }
  },

  completeExchangeTransfer(
    listingId: string,
    recipientId: string
  ): { success: boolean; error?: string } {
    ensureMigratedToV2();
    try {
      const listings = this.getExchangeListings();
      const listing = listings.find((l) => l.id === listingId);
      if (!listing) return { success: false, error: 'Listing not found' };
      if (listing.status === 'completed') {
        return { success: false, error: 'Listing has already been completed' };
      }

      const allInventories = this.getAllInventories();
      const sellerInventory = allInventories[listing.ownerId] || [];
      const recipientInventory = allInventories[recipientId] || [];

      // 1. Deduct from Seller
      const sellerItem = sellerInventory.find(
        (i) => i.id === listing.componentInventoryId || i.catalogId === listing.catalogId
      );
      if (sellerItem) {
        const remaining = Math.max(0, sellerItem.totalQuantity - listing.quantity);
        sellerItem.totalQuantity = remaining;
      }

      // 2. Add / Transfer to Recipient
      const existingInRecipient = recipientInventory.find((i) => i.catalogId === listing.catalogId);
      if (existingInRecipient) {
        existingInRecipient.totalQuantity += listing.quantity;
        existingInRecipient.lastUpdated = new Date().toISOString();
        existingInRecipient.reuseCycleCount = (existingInRecipient.reuseCycleCount || 0) + 1;
      } else {
        const newItem: ComponentItem = {
          id: `transferred-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 5)}`,
          ownerId: recipientId,
          catalogId: listing.catalogId,
          name: listing.componentName || listing.name || 'Electronic Component',
          category: listing.category as any,
          totalQuantity: listing.quantity,
          reservedQuantity: 0,
          installedQuantity: 0,
          condition: listing.condition,
          source: 'salvaged',
          unitMassGrams: 35,
          verificationStatus: (listing.verificationStatus || 'untested') as any,
          lastUpdated: new Date().toISOString(),
          isSharedForCollaboration: false,
          notes: `Transferred from ${listing.ownerDisplayName} via campus exchange drop-off.`,
          reuseCycleCount: 1,
        };
        recipientInventory.push(newItem);
      }

      allInventories[listing.ownerId] = sellerInventory;
      allInventories[recipientId] = recipientInventory;
      localStorage.setItem(INVENTORIES_KEY, JSON.stringify(allInventories));

      // 3. Mark Listing Completed
      const updatedListings = listings.map((l) =>
        l.id === listingId
          ? {
              ...l,
              status: 'completed' as const,
              completedAt: new Date().toISOString(),
              requesterId: recipientId,
              updatedAt: new Date().toISOString(),
            }
          : l
      );
      localStorage.setItem(EXCHANGE_LISTINGS_KEY, JSON.stringify(updatedListings));

      // 4. Create Ledger Audit Record
      this.recordReuseLedgerEntry({
        id: `rl-ex-${Date.now().toString(36)}`,
        action: 'physical-build',
        projectName: `Exchange Transfer: ${listing.componentName || listing.name || 'Component'}`,
        timestamp: new Date().toISOString(),
        unitMassGrams: (listing.quantity || 1) * 35,
        notes: `Physical handover of ${listing.quantity} unit(s) from ${listing.ownerDisplayName} to ${recipientId}`,
        allocatedItems: [
          {
            inventoryItemId: listing.componentInventoryId || listing.inventoryItemId || 'inv-unknown',
            catalogId: listing.catalogId,
            name: listing.componentName || listing.name || 'Component',
            quantity: listing.quantity,
            unitMassGrams: 35,
          },
        ],
      });

      // 5. Award Points to Donor and Recipient
      this.awardEcoPoints({
        userId: listing.ownerId,
        eventType: 'exchange-completed',
        points: ECO_POINT_VALUES['exchange-completed'],
        referenceType: 'exchange',
        referenceId: listing.id,
        reason: `Donated / exchanged ${listing.componentName} to peer maker`,
        verificationSource: 'peer-exchange',
      });

      this.awardEcoPoints({
        userId: recipientId,
        eventType: 'exchange-completed',
        points: ECO_POINT_VALUES['exchange-completed'],
        referenceType: 'exchange',
        referenceId: listing.id,
        reason: `Received and recirculated ${listing.componentName}`,
        verificationSource: 'peer-exchange',
      });

      notifyListeners();
      return { success: true };
    } catch (e: any) {
      console.error('Failed completeExchangeTransfer:', e);
      return { success: false, error: e?.message || 'Exchange transfer failed' };
    }
  },

  // ==========================================
  // Dual Leaderboards System (Phase 4)
  // ==========================================

  getEcoLeaderboard(): EcoLeaderboardEntry[] {
    ensureMigratedToV2();
    try {
      const makers = this.getMakerProfiles();
      const allTx = this.getEcoPointTransactions();
      const allLedger = this.getReuseLedger();
      const allCompleted = this.getCompletedProjects();
      const allInventories = this.getAllInventories();

      const entries: EcoLeaderboardEntry[] = makers.map((m: MakerProfile) => {
        const userTx = allTx.filter((t) => t.userId === m.id);
        const points = userTx.reduce((sum, t) => sum + (t.points || 0), 0);
        const userLedger = allLedger.filter(
          (l) => (l.allocatedItems || []).some((item) => item.inventoryItemId?.startsWith(m.id)) || l.id.includes(m.id)
        );
        const userInventory = allInventories[m.id] || [];
        const userCompleted = allCompleted.filter((cp) => cp.userId === m.id);

        const badges = evaluateBadges({
          ecoPoints: points,
          inventory: userInventory,
          ledgerEntries: userLedger,
          completedProjects: userCompleted,
          isMentor: m.collaborationPreference === 'Mentoring only',
        });

        // Calculate components reused from allocations
        const componentsReusedCount = userLedger.reduce(
          (sum, e) => sum + (e.allocatedItems || []).reduce((acc, i) => acc + (i.quantity || 1), 0),
          0
        ) || (points > 100 ? 5 : 2);

        // Count reuse cycles
        const reuseCycleCount = userTx.filter((t) => t.eventType === 'reuse-cycle').length || (points > 150 ? 2 : 0);

        return {
          userId: m.id,
          displayName: m.displayName,
          avatarUrl: m.avatarUrl,
          ecoPoints: points,
          ecoRank: calculateEcoRank(points),
          componentsReusedCount,
          componentsReused: componentsReusedCount,
          reuseCycleCount,
          reuseCycles: reuseCycleCount,
          topBadge: badges.find((b) => b.unlocked)?.name,
          isCurrentActiveUser: m.id === this.getActiveUser()?.id,
          isCurrentUser: m.id === this.getActiveUser()?.id,
          rank: 0,
        };
      });

      // Sort descending by ecoPoints
      entries.sort((a, b) => b.ecoPoints - a.ecoPoints);
      entries.forEach((e, idx) => {
        e.rank = idx + 1;
      });

      return entries;
    } catch (e) {
      console.error('Failed computing eco leaderboard:', e);
      return [];
    }
  },

  getBuilderLeaderboard(): BuilderLeaderboardEntry[] {
    ensureMigratedToV2();
    try {
      const makers = this.getMakerProfiles();
      const allCompleted = this.getCompletedProjects();
      const allTx = this.getEcoPointTransactions();
      const allInventories = this.getAllInventories();
      const allLedger = this.getReuseLedger();

      const entries: BuilderLeaderboardEntry[] = makers.map((m: MakerProfile) => {
        const userCompleted = allCompleted.filter((cp) => cp.userId === m.id);
        const count = userCompleted.length;

        // Calculate builder score: Beginner=50, Intermediate=100, Advanced=150
        const builderScore = userCompleted.reduce((sum, cp) => {
          const score = cp.difficulty === 'Advanced' ? 150 : cp.difficulty === 'Intermediate' ? 100 : 50;
          return sum + score;
        }, 0);

        let highestDifficulty: 'Beginner' | 'Intermediate' | 'Advanced' = 'Beginner';
        if (userCompleted.some((cp) => cp.difficulty === 'Advanced')) {
          highestDifficulty = 'Advanced';
        } else if (userCompleted.some((cp) => cp.difficulty === 'Intermediate')) {
          highestDifficulty = 'Intermediate';
        }

        const badges = evaluateBadges({
          ecoPoints: allTx.filter((t) => t.userId === m.id).reduce((s, t) => s + (t.points || 0), 0),
          inventory: allInventories[m.id] || [],
          ledgerEntries: allLedger,
          completedProjects: userCompleted,
        });

        return {
          userId: m.id,
          displayName: m.displayName,
          avatarUrl: m.avatarUrl,
          completedProjectsCount: count,
          projectsCompleted: count,
          builderScore,
          builderRank: calculateBuilderRank(count),
          highestDifficultyCompleted: highestDifficulty,
          topBadge: (badges.find((b) => b.unlocked && b.category === 'builder') || badges.find((b) => b.unlocked))?.name,
          isCurrentActiveUser: m.id === this.getActiveUser()?.id,
          isCurrentUser: m.id === this.getActiveUser()?.id,
          rank: 0,
        };
      });

      // Sort descending by builderScore, then count
      entries.sort((a, b) => ((b.builderScore ?? 0) - (a.builderScore ?? 0)) || ((b.completedProjectsCount ?? 0) - (a.completedProjectsCount ?? 0)));
      entries.forEach((e, idx) => {
        e.rank = idx + 1;
      });

      return entries;
    } catch (e) {
      console.error('Failed computing builder leaderboard:', e);
      return [];
    }
  },

  getShowcaseProjects(): ShowcaseProject[] {
    try {
      const data = localStorage.getItem('ecobuild_showcases');
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  publishShowcaseProject(showcase: Omit<ShowcaseProject, 'id' | 'createdAt'>): ShowcaseProject {
    const full: ShowcaseProject = {
      ...showcase,
      id: `showcase-${Date.now().toString(36)}`,
      createdAt: new Date().toISOString(),
      likesCount: 0,
      isPublished: true,
    };
    const existing = this.getShowcaseProjects();
    localStorage.setItem('ecobuild_showcases', JSON.stringify([full, ...existing]));
    notifyListeners();
    return full;
  },

  // ==========================================
  // Reset Demo Action
  // ==========================================

  resetToDemo(): void {
    try {
      localStorage.setItem(STORAGE_VERSION_KEY, 'v2');
      localStorage.setItem(ACTIVE_USER_KEY, 'maker-adithya');
      localStorage.setItem(MAKERS_KEY, JSON.stringify(DEMO_MAKERS));

      const freshInventories: Record<string, ComponentItem[]> = {
        ...DEMO_INVENTORIES_BY_MAKER,
        'maker-adithya': SEED_INVENTORY.map((item) => ({
          ...item,
          ownerId: 'maker-adithya',
          isSharedForCollaboration: true,
        })),
      };

      localStorage.setItem(INVENTORIES_KEY, JSON.stringify(freshInventories));
      localStorage.setItem(PROPOSALS_KEY, JSON.stringify(SEED_PROPOSALS));
      localStorage.setItem(WORKSPACES_KEY, JSON.stringify(SEED_WORKSPACES));
      localStorage.setItem(
        MENTOR_REQUESTS_KEY,
        JSON.stringify(SEED_MENTOR_REQUESTS)
      );
      localStorage.setItem(
        SAVED_PROJECTS_KEY,
        JSON.stringify(DEFAULT_SAVED_PROJECTS)
      );
      localStorage.setItem(ECO_POINTS_KEY, JSON.stringify(SEED_ECO_POINTS));
      localStorage.setItem(COMPLETED_PROJECTS_KEY, JSON.stringify(SEED_COMPLETED_PROJECTS));
      localStorage.setItem(REUSE_LEDGER_KEY, JSON.stringify(SEED_REUSE_LEDGER));
      localStorage.setItem(EXCHANGE_LISTINGS_KEY, JSON.stringify(SEED_EXCHANGE_LISTINGS));
      localStorage.removeItem(GUIDE_PROGRESS_KEY);

      // Legacy key mirrors
      localStorage.setItem(LEGACY_PROFILE_KEY, JSON.stringify(DEFAULT_PROFILE));
      localStorage.setItem(
        LEGACY_INVENTORY_KEY,
        JSON.stringify(freshInventories['maker-adithya'])
      );

      notifyListeners();
      console.log('[EcoBuild] Reset to pristine Phase 2 demo state completed.');
    } catch (e) {
      console.error('Failed to reset demo data:', e);
    }
  },
};
