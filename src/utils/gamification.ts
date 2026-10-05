/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  EcoPointEventType,
  ProjectDifficulty,
  UserBadgeStatus,
  UserBadgeDefinition,
  CompletedProjectRecord,
  ComponentItem,
  ReuseLedgerEntry,
} from '../types';

export const ECO_POINT_VALUES: Record<EcoPointEventType, number> = {
  'physical-build': 50,
  'reuse-cycle': 30,
  'collaboration-completed': 35,
  'exchange-completed': 25,
  'mentorship-resolved': 20,
  'component-shared': 10,
};

export const ECO_RANK_TIERS = [
  { minPoints: 600, name: 'Master Regenerator', badgeName: 'Circular Champion' },
  { minPoints: 300, name: 'Circular Champion', badgeName: 'Circular Champion' },
  { minPoints: 150, name: 'Circuit Saver', badgeName: 'Component Saver' },
  { minPoints: 50, name: 'Sprout', badgeName: 'Eco Starter' },
  { minPoints: 0, name: 'Seedling', badgeName: 'Eco Starter' },
];

export const BUILDER_RANK_TIERS = [
  { minCount: 6, name: 'Master Artisan' },
  { minCount: 3, name: 'Senior Builder' },
  { minCount: 1, name: 'Builder' },
  { minCount: 0, name: 'Apprentice' },
];

export function calculateEcoRank(points: number): string {
  const safePoints = Math.max(0, points || 0);
  for (const tier of ECO_RANK_TIERS) {
    if (safePoints >= tier.minPoints) {
      return tier.name;
    }
  }
  return 'Seedling';
}

export function calculateBuilderRank(completedCount: number): string {
  const safeCount = Math.max(0, completedCount || 0);
  for (const tier of BUILDER_RANK_TIERS) {
    if (safeCount >= tier.minCount) {
      return tier.name;
    }
  }
  return 'Apprentice';
}

export const BADGE_DEFINITIONS: UserBadgeDefinition[] = [
  {
    id: 'eco-starter',
    name: 'Eco Starter',
    description: 'Cataloged electronic components into your private workbench inventory.',
    iconName: 'Leaf',
    category: 'circularity',
    maxProgress: 1,
    conditionDescription: 'Catalog at least 1 hardware component',
  },
  {
    id: 'component-saver',
    name: 'Component Saver',
    description: 'Kept electronic hardware in active circulation, diverting substantial physical mass.',
    iconName: 'Scale',
    category: 'circularity',
    maxProgress: 100,
    conditionDescription: 'Reused or diverted at least 100g of hardware mass',
  },
  {
    id: 'circular-champion',
    name: 'Circular Champion',
    description: 'Accumulated outstanding circularity credentials through verified hardware reuse.',
    iconName: 'Award',
    category: 'circularity',
    maxProgress: 200,
    conditionDescription: 'Earn at least 200 verified Eco Points',
  },
  {
    id: 'first-build',
    name: 'First Build',
    description: 'Completed your first verified hardware build using owned and salvaged parts.',
    iconName: 'Wrench',
    category: 'builder',
    maxProgress: 1,
    conditionDescription: 'Complete 1 verified physical build',
  },
  {
    id: 'ten-projects',
    name: '10 Projects',
    description: 'A prolific creator with ten verified physical project builds.',
    iconName: 'Layers',
    category: 'builder',
    maxProgress: 10,
    conditionDescription: 'Complete 10 verified physical builds',
  },
  {
    id: 'master-builder',
    name: 'Master Builder',
    description: 'Constructed an Advanced hardware project such as an autonomous rover.',
    iconName: 'Sparkles',
    category: 'builder',
    maxProgress: 1,
    conditionDescription: 'Complete at least 1 Advanced project',
  },
  {
    id: 'community-helper',
    name: 'Community Helper',
    description: 'Resolved a peer mentorship ticket or participated in a collaborative team workspace.',
    iconName: 'Users',
    category: 'community',
    maxProgress: 1,
    conditionDescription: 'Resolve 1 mentorship ticket or finish 1 team workspace',
  },
  {
    id: 'mentor',
    name: 'Mentor',
    description: 'Active discoverable mentor providing technical circuit and firmware guidance.',
    iconName: 'ShieldCheck',
    category: 'community',
    maxProgress: 1,
    conditionDescription: 'Opt-in as a discoverable mentor with active help topics',
  },
  {
    id: 'reuse-champion',
    name: 'Reuse Champion',
    description: 'Demonstrated true circularity by disassembling builds and returning parts to stock.',
    iconName: 'RotateCcw',
    category: 'circularity',
    maxProgress: 3,
    conditionDescription: 'Complete at least 3 hardware disassembly/reuse cycles',
  },
];

export interface BadgeEvaluationContext {
  ecoPoints?: number;
  inventory?: ComponentItem[];
  ledgerEntries?: ReuseLedgerEntry[];
  completedProjects?: CompletedProjectRecord[];
  isMentor?: boolean;
  resolvedTicketsCount?: number;
  workspacesCount?: number;
}

export function evaluateBadges(context: BadgeEvaluationContext): UserBadgeStatus[] {
  const inventory = context.inventory || [];
  const ledger = context.ledgerEntries || [];
  const completed = context.completedProjects || [];
  const points = context.ecoPoints || 0;
  const isMentor = Boolean(context.isMentor);
  const resolvedTickets = context.resolvedTicketsCount || 0;
  const workspaces = context.workspacesCount || 0;

  // Calculate total mass diverted/reused across builds and disassemblies
  const totalMassGrams =
    ledger.reduce((sum, e) => sum + (Number(e.totalMassGrams) || Number(e.unitMassGrams) || 0), 0) ||
    completed.reduce((sum, p) => sum + (Number(p.totalMassGrams) || Number(p.hardwareMassGrams) || 0), 0);

  // Calculate disassembly cycles
  const disassemblyEntries = ledger.filter(
    (e) =>
      e.eventType === 'disassembly-returned' ||
      e.eventType === 'disassembled_to_stock' ||
      e.action === 'disassembly-reclaim'
  );
  const totalReuseCycles =
    disassemblyEntries.reduce(
      (sum, e) =>
        sum +
        ((e.allocatedItems && e.allocatedItems.length > 0)
          ? e.allocatedItems.reduce((acc, i) => acc + (i.quantity || 1), 0)
          : 1),
      0
    ) || disassemblyEntries.length;

  // Advanced completed projects count
  const advancedCompleted = completed.filter(
    (p) => p.difficulty === 'Advanced' && p.result !== 'failed'
  ).length;

  return BADGE_DEFINITIONS.map((def) => {
    let currentProgress = 0;

    switch (def.id) {
      case 'eco-starter':
        currentProgress = inventory.length > 0 ? 1 : 0;
        break;
      case 'component-saver':
        currentProgress = Math.min(def.maxProgress, Math.round(totalMassGrams));
        break;
      case 'circular-champion':
        currentProgress = Math.min(def.maxProgress, points);
        break;
      case 'first-build':
        currentProgress = Math.min(def.maxProgress, completed.length);
        break;
      case 'ten-projects':
        currentProgress = Math.min(def.maxProgress, completed.length);
        break;
      case 'master-builder':
        currentProgress = Math.min(def.maxProgress, advancedCompleted);
        break;
      case 'community-helper':
        currentProgress = (resolvedTickets > 0 || workspaces > 0) ? 1 : 0;
        break;
      case 'mentor':
        currentProgress = isMentor ? 1 : 0;
        break;
      case 'reuse-champion':
        currentProgress = Math.min(def.maxProgress, totalReuseCycles);
        break;
      default:
        currentProgress = 0;
    }

    const unlocked = currentProgress >= def.maxProgress;
    const progressPercent = Math.min(100, Math.round((currentProgress / def.maxProgress) * 100));

    return {
      id: def.id,
      name: def.name,
      description: def.description,
      iconName: def.iconName,
      category: def.category,
      unlocked,
      currentProgress,
      maxProgress: def.maxProgress,
      progressPercent,
      conditionDescription: def.conditionDescription,
    };
  });
}
