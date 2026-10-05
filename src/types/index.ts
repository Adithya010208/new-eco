/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type ComponentCondition =
  | 'working'
  | 'partially-working'
  | 'untested'
  | 'faulty'
  | 'unsafe';

export type VerificationStatus =
  | 'untested'
  | 'user-reported-working'
  | 'recorded-test';

export type ComponentSource =
  | 'purchased'
  | 'previous-project'
  | 'salvaged'
  | 'donated';

export type ComponentCategory =
  | 'microcontroller'
  | 'sensor'
  | 'actuator'
  | 'passive'
  | 'prototyping'
  | 'display'
  | 'power'
  | 'other';

export interface ComponentItem {
  id: string;
  catalogId: string;
  name: string;
  category: ComponentCategory;
  totalQuantity: number;
  reservedQuantity: number;
  installedQuantity: number;
  condition: ComponentCondition;
  source: ComponentSource;
  unitMassGrams: number | null;
  notes?: string;
  photoPreview?: string | null;
  lastUpdated: string;
  verificationStatus: VerificationStatus;
  // Phase 2 Collaboration Fields
  ownerId?: string;
  isSharedForCollaboration?: boolean;
  // Phase 6 Physical Verification & Lifecycle Fields
  testRecords?: ComponentTestRecord[];
  provenanceBatchId?: string;
  reuseCycleCount?: number;
}

export type ProjectDifficulty = 'Beginner' | 'Intermediate' | 'Advanced';

export interface ProjectRequirement {
  catalogId: string;
  name: string;
  quantity: number;
  isCritical: boolean;
  category: ComponentCategory;
  estimatedUnitPriceUsd?: number;
  typicalUnitMassGrams?: number;
}

export interface ProjectTemplate {
  id: string;
  name: string;
  description: string;
  purpose: string;
  category: string;
  interestTags: string[];
  difficulty: ProjectDifficulty;
  estimatedDuration: string;
  requirements: ProjectRequirement[];
  mechanicalSupplies: string[];
  learningOutcomes: string[];
  highLevelOverview: string[];
  illustrationKey: string;
}

export interface RequirementMatch {
  requirement: ProjectRequirement;
  requiredQuantity: number;
  matchedWorkingQuantity: number;
  untestedPotentialQuantity: number;
  missingQuantity: number;
  allocatedInventoryItems: {
    item: ComponentItem;
    quantity: number;
  }[];
  isFullyCovered: boolean;
}

export type ReadinessState =
  | 'missing-components'
  | 'testing-needed'
  | 'supplies-needed'
  | 'covered';

export interface ProjectMatchResult {
  project: ProjectTemplate;
  totalRequiredUnits: number;
  matchedWorkingUnits: number;
  untestedUnits: number;
  coveragePercentage: number;
  missingCount: number;
  isFullyCovered: boolean;
  requirementMatches: RequirementMatch[];
  readinessState: ReadinessState;
  potentialReuseMassGrams: number;
  isMassDataComplete: boolean;
  estimatedMissingCostUsd: number;
  recommendationReasons: string[];
}

export interface UserProfile {
  displayName: string;
  experience: 'Beginner' | 'Intermediate' | 'Advanced';
  interests: string[];
  preferredDifficulty: ProjectDifficulty;
  availableTime: string;
  hasCompletedOnboarding: boolean;
  ecoPoints?: number;
  ecoRank?: string;
  verifiedCompletedProjects?: number;
  builderRank?: string;
  highestDifficultyCompleted?: ProjectDifficulty;
  preferredLanguage?: string;
  badges?: string[];
}

// ==========================================
// PHASE 2: COLLABORATIVE MAKER NETWORK TYPES
// ==========================================

export type CollaborationPreference =
  | 'Open to team builds'
  | 'Mentoring only'
  | 'Project-specific'
  | 'Solo maker';

export type MentorshipHelpCategory =
  | 'choosing-components'
  | 'understanding-circuit'
  | 'programming'
  | 'testing-component'
  | 'troubleshooting'
  | 'planning-assembly';

export interface MakerMentorProfile {
  isAvailable: boolean;
  topics: MentorshipHelpCategory[];
  preferredLanguage?: string;
  availabilityNotes: string;
}

export type RecipeComponentRequirement = ProjectRequirement;

export interface MakerProfile {
  id: string;
  displayName: string;
  photoURL?: string | null;
  avatarUrl?: string;
  isDemo: boolean;
  experience: 'Beginner' | 'Intermediate' | 'Advanced';
  skills: string[];
  interests: string[];
  collaborationPreference: CollaborationPreference;
  locationLabel?: string;
  bio?: string;
  mentorProfile?: MakerMentorProfile;
  ecoPoints?: number;
  ecoRank?: string;
  verifiedCompletedProjects?: number;
  builderRank?: string;
  highestDifficultyCompleted?: ProjectDifficulty;
  preferredLanguage?: string;
  badges?: string[];
}

export interface ContributionItem {
  inventoryItemId: string;
  catalogId: string;
  name: string;
  quantity: number;
}

export interface ResponsibilityItem {
  memberId: string;
  roleDescription: string;
}

export type ProposalStatus =
  | 'pending'
  | 'accepted'
  | 'declined'
  | 'cancelled'
  | 'expired';

export interface CollaborationProposal {
  id: string;
  projectId: string;
  senderId: string;
  receiverId: string;
  proposedSenderContributions: ContributionItem[];
  proposedReceiverContributions: ContributionItem[];
  remainingDeficits: {
    catalogId: string;
    name: string;
    quantity: number;
  }[];
  suggestedResponsibilities: ResponsibilityItem[];
  message: string;
  status: ProposalStatus;
  createdAt: string;
  respondedAt?: string;
  workspaceId?: string;
  rejectionReason?: string;
}

export interface ComponentReservation {
  id: string;
  workspaceId: string;
  proposalId?: string;
  inventoryItemId: string;
  ownerId: string;
  catalogId: string;
  name: string;
  quantity: number;
  reservedAt: string;
  status: 'active' | 'released';
}

export interface ReservationEvent {
  id: string;
  workspaceId: string;
  reservationId: string;
  eventType: 'reserved' | 'released';
  ownerId: string;
  catalogId: string;
  quantity: number;
  timestamp: string;
  reason?: string;
}

export type TaskStatus = 'todo' | 'in_progress' | 'done';

export interface WorkspaceTask {
  id: string;
  workspaceId: string;
  title: string;
  description?: string;
  assigneeId?: string;
  status: TaskStatus;
  createdAt: string;
}

export interface WorkspaceMessage {
  id: string;
  workspaceId: string;
  authorId: string;
  content: string;
  createdAt: string;
}

export interface ProjectWorkspace {
  id: string;
  projectId: string;
  proposalId?: string;
  memberIds: string[];
  memberRoles: Record<string, string>;
  status: 'active' | 'completed' | 'cancelled';
  reservations: ComponentReservation[];
  tasks: WorkspaceTask[];
  messages: WorkspaceMessage[];
  mentorRequestIds: string[];
  createdAt: string;
}

export type MentorshipRequestStatus =
  | 'open'
  | 'accepted'
  | 'resolved'
  | 'cancelled';

export interface MentorshipResponse {
  id: string;
  authorId: string;
  content: string;
  createdAt: string;
}

export interface MentorshipRequest {
  id: string;
  requesterId: string;
  mentorId: string;
  projectId: string;
  workspaceId?: string;
  helpCategory: MentorshipHelpCategory;
  question: string;
  currentStage: string;
  relevantComponents: string[];
  notesOrCode?: string;
  status: MentorshipRequestStatus;
  responses: MentorshipResponse[];
  createdAt: string;
  resolvedAt?: string;
}

export interface PartnerSuggestion {
  maker: MakerProfile;
  project: ProjectTemplate;
  userCoveragePercentage: number;
  combinedCoveragePercentage: number;
  coverageImprovementPercentage: number;
  userMatchedUnits: number;
  partnerMatchedUnits: number;
  totalRequiredUnits: number;
  partnerOfferedItems: {
    item: ComponentItem;
    satisfiesRequirement: ProjectRequirement;
    offeredQuantity: number;
  }[];
  userContributedItems: {
    item: ComponentItem;
    satisfiesRequirement: ProjectRequirement;
    quantity: number;
  }[];
  stillMissingRequirements: {
    requirement: ProjectRequirement;
    missingQuantity: number;
  }[];
  complementarySkills: string[];
  sharedInterests: string[];
  matchExplanation: string;
  rankingScore: number;
}

// ==========================================
// PHASE 4B1: DISCOVERABLE PROFILES & MENTORSHIP
// ==========================================

export interface DiscoverableMakerProfile {
  uid: string;
  displayName: string;
  photoURL?: string | null;
  bio?: string;
  experience: 'Beginner' | 'Intermediate' | 'Advanced';
  interests: string[];
  skills: string[];
  collaborationPreference: CollaborationPreference;
  isDiscoverable: boolean;
  isMentor: boolean;
  mentorTopics?: MentorshipHelpCategory[];
  mentorAvailabilityNotes?: string;
  ecoPoints?: number;
  ecoRank?: string;
  verifiedCompletedProjects?: number;
  reusedComponentsCount?: number;
  reuseCycleCount?: number;
  builderRank?: string;
  highestDifficultyCompleted?: ProjectDifficulty;
  preferredLanguage?: string;
  badges?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface CloudMentorshipTicket {
  id: string;
  requesterId: string;
  requesterDisplayName: string;
  mentorId: string;
  mentorDisplayName: string;
  projectId: string;
  projectTitle: string;
  workspaceId?: string;
  guideStepIndex?: number;
  guideStepTitle?: string;
  helpCategory: MentorshipHelpCategory;
  question: string;
  notesOrCode?: string;
  status: 'open' | 'accepted' | 'declined' | 'resolved' | 'cancelled';
  responses: {
    id: string;
    authorId: string;
    authorDisplayName: string;
    content: string;
    createdAt: string;
  }[];
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
}

// ==========================================
// PHASE 4B2: REAL COMPONENT SHARING & RESERVATIONS
// ==========================================

export interface SharedComponentRecord {
  id: string;
  ownerId: string;
  ownerDisplayName: string;
  inventoryItemId: string;
  catalogId: string;
  name: string;
  category: ComponentCategory;
  quantity: number;
  condition: 'working';
  verificationStatus: VerificationStatus;
  unitMassGrams: number | null;
  isShared: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CloudProposalRecord {
  id: string;
  projectId: string;
  projectTitle: string;
  senderId: string;
  senderDisplayName: string;
  receiverId: string;
  receiverDisplayName: string;
  senderContributions: ContributionItem[];
  receiverContributions: ContributionItem[];
  suggestedResponsibilities: ResponsibilityItem[];
  message: string;
  status: ProposalStatus;
  workspaceId?: string;
  createdAt: string;
  respondedAt?: string;
  rejectionReason?: string;
}

export interface CloudWorkspaceRecord {
  id: string;
  projectId: string;
  projectTitle: string;
  creatorId: string;
  memberIds: string[];
  memberRoles: Record<string, string>;
  status: 'active' | 'completed' | 'cancelled';
  reservations: ComponentReservation[];
  tasks: WorkspaceTask[];
  messages: WorkspaceMessage[];
  createdAt: string;
  updatedAt: string;
}

// ==========================================
// PHASE 6: PHYSICAL TEST RECORDS & REUSE ACCOUNTING
// ==========================================

export interface ComponentTestRecord {
  id: string;
  date: string;
  testType:
    | 'multimeter-continuity'
    | 'power-rail-voltage'
    | 'logic-high-low'
    | 'sensor-readout'
    | 'actuator-sweep'
    | 'thermal-inspection';
  method: string;
  result: 'pass' | 'fail' | 'marginal';
  testedQuantity: number;
  testedBy: string;
  notes?: string;
}

export interface ReuseLedgerEntry {
  id: string;
  timestamp: string;
  eventType?:
    | 'allocated_to_build'
    | 'physical_build_complete'
    | 'disassembled_to_stock'
    | 'retested_pass'
    | 'retested_fail'
    | 'physical-build-completed'
    | 'disassembly-returned'
    | 'correction_reversal';
  action?: string;
  itemId?: string;
  catalogId?: string;
  name?: string;
  projectName?: string;
  quantity?: number;
  unitMassGrams?: number | null;
  totalMassGrams?: number | null;
  cycleCount?: number;
  notes?: string;
  workspaceId?: string;
  projectId?: string;
  projectTitle?: string;
  makerId?: string;
  makerDisplayName?: string;
  verificationLevel?: 'user-reported' | 'bench-verified' | string;
  allocatedItems?: {
    inventoryItemId: string;
    catalogId: string;
    name?: string;
    quantity: number;
    unitMassGrams?: number | null;
  }[];
}

// ==========================================
// PHASE 7: EXTENSION MODELS
// ==========================================

export interface ComponentExchangeListing {
  id: string;
  ownerId: string;
  ownerDisplayName: string;
  inventoryItemId?: string;
  componentInventoryId?: string;
  catalogId: string;
  name?: string;
  componentName?: string;
  category: ComponentCategory;
  quantity: number;
  offeredQuantity?: number;
  listingType?: 'donation' | 'exchange' | 'free-donation' | 'swap-preferred';
  exchangeType?: 'donation' | 'exchange' | 'free-donation' | 'swap-preferred';
  condition: ComponentCondition;
  verificationStatus?: string;
  notes?: string;
  handoffMethod?: string;
  handoffLocationNote?: string;
  approximateLocation?: string;
  status: 'available' | 'requested' | 'handover_pending' | 'completed' | 'cancelled' | 'claimed';
  requesterId?: string;
  requesterDisplayName?: string;
  recipientId?: string;
  senderId?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ShowcaseProject {
  id: string;
  authorId: string;
  authorDisplayName: string;
  projectId?: string;
  title: string;
  recipeName?: string;
  description: string;
  photoURL?: string;
  usedComponentsSummary?: string[];
  componentsUsed?: string[];
  componentsList?: string[];
  reuseMassGrams?: number;
  massDivertedGrams?: number;
  hardwareMassGrams?: number;
  likesCount?: number;
  isPublished?: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface VerifiedInteractionReview {
  id: string;
  interactionId: string; // workspaceId or listingId
  interactionType: 'collaboration' | 'mentorship' | 'exchange' | 'workspace' | 'component_exchange';
  reviewerId: string;
  reviewerDisplayName: string;
  revieweeId?: string;
  targetMakerId?: string;
  targetMakerDisplayName?: string;
  rating: number; // 1 to 5
  feedback: string;
  createdAt: string;
}

export interface ModerationReport {
  id: string;
  reporterId: string;
  targetType: 'profile' | 'message' | 'ticket' | 'listing' | 'maker' | 'proposal' | 'workspace_message';
  targetId: string;
  targetDisplayName?: string;
  reason: string;
  description?: string;
  details?: string;
  status: 'submitted' | 'under_review' | 'resolved';
  createdAt: string;
}

export interface OrganizationInventory {
  id: string;
  name: string;
  domain?: string;
  adminUids: string[];
  memberUids: string[];
  memberIds?: string[];
  stockItems: ComponentItem[];
  sharedComponents?: ComponentItem[];
  aggregateReuseMassGrams: number;
  aggregateDivertedMassGrams?: number;
  createdAt: string;
  updatedAt: string;
}

export interface DiagnosticDockSpec {
  hardwareInterfaceVersion: string;
  supportedPins: {
    pinIndex: number;
    pinName: string;
    capabilities: ('analog_read' | 'digital_io' | 'pwm_output' | 'i2c_bus' | 'spi_bus' | 'power_monitor')[];
  }[];
  baudRate: number;
  safetyLimits: {
    maxVoltageVolts: number;
    maxCurrentMilliAmps: number;
    reversePolarityProtection: boolean;
  };
  sampleProtocolFrame: {
    command: 'SELF_TEST' | 'SAMPLE_VOLTAGE' | 'SWEEP_PWM' | 'PROBE_I2C';
    parameters: Record<string, any>;
  };
}

// ==========================================
// PHASE 8: ECO POINTS, BUILDER PROGRESS & GAMIFICATION
// ==========================================

export type EcoPointEventType =
  | 'physical-build'
  | 'reuse-cycle'
  | 'exchange-completed'
  | 'mentorship-resolved'
  | 'collaboration-completed'
  | 'component-shared';

export interface EcoPointTransaction {
  id: string;
  userId: string;
  eventType: EcoPointEventType;
  points: number;
  referenceType:
    | 'build'
    | 'ledger'
    | 'exchange'
    | 'ticket'
    | 'workspace'
    | 'component'
    | 'project'
    | 'cycle'
    | 'mentorship';
  referenceId: string;
  createdAt: string;
  reason: string;
  verificationSource?: string;
}

export interface CompletedProjectRecord {
  id: string;
  userId: string;
  projectId: string;
  projectTitle: string;
  difficulty: ProjectDifficulty;
  completedAt: string;
  ledgerEntryId?: string;
  result?: 'working' | 'partially-working' | 'failed';
  buildResult?: 'working' | 'partially-working' | 'failed';
  notes?: string;
  photoURL?: string;
  verificationLevel: 'user-reported' | 'bench-verified' | 'self-reported-working';
  componentsReusedCount?: number;
  totalMassGrams?: number;
  reusedComponentsCount?: number;
  hardwareMassGrams?: number;
}

export interface UserBadgeDefinition {
  id: string;
  name: string;
  description: string;
  iconName: string;
  category: 'circularity' | 'builder' | 'community';
  maxProgress: number;
  conditionDescription: string;
}

export interface UserBadgeStatus {
  id: string;
  name: string;
  description: string;
  iconName: string;
  category: 'circularity' | 'builder' | 'community';
  unlocked: boolean;
  unlockedAt?: string;
  currentProgress: number;
  maxProgress: number;
  progressPercent: number;
  conditionDescription: string;
}

export interface EcoLeaderboardEntry {
  rank: number;
  userId: string;
  displayName: string;
  photoURL?: string | null;
  avatarUrl?: string;
  ecoPoints: number;
  ecoRank: string;
  componentsReused?: number;
  componentsReusedCount?: number;
  reuseCycles?: number;
  reuseCycleCount?: number;
  topBadge?: UserBadgeStatus | string;
  isCurrentUser?: boolean;
  isCurrentActiveUser?: boolean;
}

export interface BuilderLeaderboardEntry {
  rank: number;
  userId: string;
  displayName: string;
  photoURL?: string | null;
  avatarUrl?: string;
  projectsCompleted?: number;
  completedProjectsCount?: number;
  builderScore?: number;
  builderRank: string;
  highestDifficultyCompleted: ProjectDifficulty;
  topBadge?: UserBadgeStatus | string;
  isCurrentUser?: boolean;
  isCurrentActiveUser?: boolean;
}
