/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Route, Switch, useLocation } from 'wouter';
import {
  ComponentItem,
  UserProfile,
  MakerProfile,
  CollaborationProposal,
  ProjectWorkspace,
  MentorshipRequest,
  WorkspaceTask,
  ReuseLedgerEntry,
} from './types';
import { StorageService } from './services/storageService';
import { FirestoreAdapter } from './services/firestoreAdapter';
import { AuthProvider, useAuth, AppMode } from './contexts/AuthContext';
import { PROJECT_LIBRARY } from './data/projectLibrary';
import { calculateAllProjectsMatch } from './utils/matching';
import { rankAndExplainProjects } from './utils/ranking';

import { Header } from './components/layout/Header';
import { Sidebar } from './components/layout/Sidebar';
import { ComponentFormModal } from './components/inventory/ComponentFormModal';
import { ResetDemoDialog } from './components/common/ResetDemoDialog';
import {
  FutureFeatureModal,
  FutureFeatureType,
} from './components/common/FutureFeatureModal';
import { OnboardingModal } from './components/common/OnboardingModal';
import { MentorRequestModal } from './components/network/MentorRequestModal';

import { DiscoverPage } from './pages/DiscoverPage';
import { InventoryPage } from './pages/InventoryPage';
import { ProjectLibraryPage } from './pages/ProjectLibraryPage';
import { ProjectDetailPage } from './pages/ProjectDetailPage';
import { SavedProjectsPage } from './pages/SavedProjectsPage';
import { ProfilePage } from './pages/ProfilePage';
import { MakerNetworkPage } from './pages/MakerNetworkPage';
import { WorkspaceDetailPage } from './pages/WorkspaceDetailPage';
import { FutureFeaturePage } from './pages/FutureFeaturePage';
import { LeaderboardsPage } from './pages/LeaderboardsPage';
import { ImpactDashboardPage } from './pages/ImpactDashboardPage';

// Lazy-loaded 3D Build Studio module
const BuildStudioPage = React.lazy(() =>
  import('./pages/BuildStudioPage').then((m) => ({ default: m.BuildStudioPage }))
);

function EcoBuildApp() {
  const [, setLocation] = useLocation();
  const {
    user,
    authLoading,
    mode,
    userProfile,
    setMode,
    updateCloudProfile,
  } = useAuth();

  // ----------------------------------------------------
  // Local Demo State (Backed by StorageService v2)
  // ----------------------------------------------------
  const [demoActiveUser, setDemoActiveUser] = useState<MakerProfile>(() =>
    StorageService.getActiveUser()
  );
  const [demoAllMakers, setDemoAllMakers] = useState<MakerProfile[]>(() =>
    StorageService.getMakerProfiles()
  );
  const [demoAllInventories, setDemoAllInventories] = useState<
    Record<string, ComponentItem[]>
  >(() => StorageService.getAllInventories());
  const [demoInventory, setDemoInventory] = useState<ComponentItem[]>(() =>
    StorageService.getInventory()
  );
  const [demoProposals, setDemoProposals] = useState<CollaborationProposal[]>(() =>
    StorageService.getProposals()
  );
  const [demoWorkspaces, setDemoWorkspaces] = useState<ProjectWorkspace[]>(() =>
    StorageService.getWorkspaces()
  );
  const [demoMentorRequests, setDemoMentorRequests] = useState<MentorshipRequest[]>(
    () => StorageService.getMentorRequests()
  );
  const [demoSavedIds, setDemoSavedIds] = useState<string[]>(() =>
    StorageService.getSavedProjectIds()
  );

  // Sync Demo state when StorageService changes
  useEffect(() => {
    const unsubscribe = StorageService.subscribe(() => {
      setDemoActiveUser(StorageService.getActiveUser());
      setDemoAllMakers(StorageService.getMakerProfiles());
      setDemoAllInventories(StorageService.getAllInventories());
      setDemoInventory(StorageService.getInventory());
      setDemoProposals(StorageService.getProposals());
      setDemoWorkspaces(StorageService.getWorkspaces());
      setDemoMentorRequests(StorageService.getMentorRequests());
      setDemoSavedIds(StorageService.getSavedProjectIds());
    });
    return unsubscribe;
  }, []);

  // ----------------------------------------------------
  // Cloud Account State (Backed by Firestore Subcollections)
  // ----------------------------------------------------
  const [cloudInventory, setCloudInventory] = useState<ComponentItem[]>([]);
  const [cloudSavedIds, setCloudSavedIds] = useState<string[]>([]);
  const [cloudWorkspaces, setCloudWorkspaces] = useState<ProjectWorkspace[]>([]);
  const [cloudLedgerEntries, setCloudLedgerEntries] = useState<ReuseLedgerEntry[]>([]);

  // Real-time Firestore Subscriptions for authenticated user
  useEffect(() => {
    if (mode !== 'account' || !user) {
      setCloudInventory([]);
      setCloudSavedIds([]);
      setCloudWorkspaces([]);
      setCloudLedgerEntries([]);
      return;
    }

    const unsubInventory = FirestoreAdapter.subscribeToInventory(
      user.uid,
      (items) => setCloudInventory(items)
    );

    const unsubSaved = FirestoreAdapter.subscribeToSavedProjects(
      user.uid,
      (ids) => setCloudSavedIds(ids)
    );

    const unsubWorkspaces = FirestoreAdapter.subscribeToUserWorkspaces(
      user.uid,
      (ws) => setCloudWorkspaces(ws as any)
    );

    const unsubLedger = FirestoreAdapter.subscribeToReuseLedger(
      user.uid,
      (entries) => setCloudLedgerEntries(entries)
    );

    return () => {
      unsubInventory();
      unsubSaved();
      unsubWorkspaces();
      unsubLedger();
    };
  }, [mode, user]);

  // Construct current Active User Identity
  const activeUser: MakerProfile = useMemo(() => {
    if (mode === 'account' && user) {
      return {
        id: user.uid,
        displayName:
          userProfile?.displayName ||
          user.displayName ||
          user.email?.split('@')[0] ||
          'Maker',
        isDemo: false,
        experience: userProfile?.experience || 'Beginner',
        skills: userProfile?.skills || ['circuit prototyping'],
        interests: userProfile?.interests || ['learning electronics'],
        collaborationPreference:
          userProfile?.collaborationPreference || 'Solo maker',
        locationLabel: 'Private Cloud Workbench',
        bio: userProfile?.bio || '',
      };
    }
    return demoActiveUser;
  }, [mode, user, userProfile, demoActiveUser]);

  // Current effective inventory
  const inventory: ComponentItem[] = useMemo(() => {
    return mode === 'account' ? cloudInventory : demoInventory;
  }, [mode, cloudInventory, demoInventory]);

  // Current effective saved project IDs
  const savedIds: string[] = useMemo(() => {
    return mode === 'account' ? cloudSavedIds : demoSavedIds;
  }, [mode, cloudSavedIds, demoSavedIds]);

  // Current effective user profile for recommendations
  const activeProfile: UserProfile = useMemo(() => {
    if (mode === 'account' && userProfile) {
      return {
        displayName: userProfile.displayName,
        experience: userProfile.experience,
        interests: userProfile.interests || ['learning electronics'],
        preferredDifficulty: userProfile.preferredDifficulty || 'Beginner',
        availableTime: userProfile.availableTime || '1-2 hours / week',
        hasCompletedOnboarding: true,
      };
    }
    return StorageService.getProfile();
  }, [mode, userProfile]);

  // All inventories map
  const allInventories = useMemo(() => {
    if (mode === 'account' && user) {
      return {
        ...demoAllInventories,
        [user.uid]: cloudInventory,
      };
    }
    return demoAllInventories;
  }, [mode, user, cloudInventory, demoAllInventories]);

  // First Visit Onboarding Check
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);
  useEffect(() => {
    const hasSeen = localStorage.getItem('ecobuild_has_onboarded_v1');
    if (!hasSeen) {
      setIsOnboardingOpen(true);
    }
  }, []);

  const handleExploreDemo = () => {
    localStorage.setItem('ecobuild_has_onboarded_v1', 'true');
    setIsOnboardingOpen(false);
  };

  const handleSaveProfileFromOnboarding = (newProfile: UserProfile) => {
    localStorage.setItem('ecobuild_has_onboarded_v1', 'true');
    if (mode === 'account' && user) {
      updateCloudProfile(newProfile);
    } else {
      StorageService.saveProfile(newProfile);
    }
    setIsOnboardingOpen(false);
  };

  // UI Modals
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isAddComponentOpen, setIsAddComponentOpen] = useState(false);
  const [editingComponent, setEditingComponent] =
    useState<ComponentItem | null>(null);
  const [isResetDemoOpen, setIsResetDemoOpen] = useState(false);
  const [futureModalType, setFutureModalType] =
    useState<FutureFeatureType | null>(null);
  const [futureProjectName, setFutureProjectName] = useState<string | undefined>();

  // Global Mentor Request Modal
  const [globalMentorProjectId, setGlobalMentorProjectId] = useState<string | null>(null);
  const [globalMentorWorkspaceId, setGlobalMentorWorkspaceId] = useState<string | undefined>();
  const [globalMentorPrefillQuestion, setGlobalMentorPrefillQuestion] = useState<string | undefined>();
  const [globalMentorPrefillStage, setGlobalMentorPrefillStage] = useState<string | undefined>();

  // Deterministic Matching Recalculation (Pure & Memoized against Active User's Inventory)
  const projectMatches = useMemo(() => {
    return calculateAllProjectsMatch(PROJECT_LIBRARY, inventory);
  }, [inventory]);

  // Deterministic Personalized Ranking for Active User
  const rankedMatches = useMemo(() => {
    return rankAndExplainProjects(projectMatches, activeProfile, inventory);
  }, [projectMatches, activeProfile, inventory]);

  // Computed free items count for active user
  const freeCount = useMemo(() => {
    return inventory
      .filter((item) => item.condition === 'working')
      .reduce(
        (sum, item) =>
          sum +
          Math.max(
            0,
            item.totalQuantity - item.reservedQuantity - item.installedQuantity
          ),
        0
      );
  }, [inventory]);

  // Active workspaces count for active user
  const activeWorkspacesCount = useMemo(() => {
    if (mode === 'account') return 0;
    return demoWorkspaces.filter(
      (w) => w.status === 'active' && w.memberIds.includes(activeUser.id)
    ).length;
  }, [mode, demoWorkspaces, activeUser.id]);

  // Demo User Switching (only for demo makers)
  const handleSelectUser = useCallback((userId: string) => {
    StorageService.setActiveUserId(userId);
  }, []);

  // Inventory CRUD handlers (Dual Adapter Routing)
  const handleSaveComponent = useCallback(
    async (item: ComponentItem) => {
      if (mode === 'account' && user) {
        if (editingComponent) {
          await FirestoreAdapter.updateInventoryItem(user.uid, item);
        } else {
          await FirestoreAdapter.addInventoryItem(user.uid, item);
        }
      } else {
        if (editingComponent) {
          StorageService.updateComponent(item, activeUser.id);
        } else {
          StorageService.addComponent(item, activeUser.id);
        }
      }
      setEditingComponent(null);
    },
    [mode, user, editingComponent, activeUser.id]
  );

  const handleEditComponent = useCallback((item: ComponentItem) => {
    setEditingComponent(item);
    setIsAddComponentOpen(true);
  }, []);

  const handleDeleteComponent = useCallback(
    async (id: string) => {
      if (mode === 'account' && user) {
        await FirestoreAdapter.deleteInventoryItem(user.uid, id);
      } else {
        StorageService.deleteComponent(id, activeUser.id);
      }
    },
    [mode, user, activeUser.id]
  );

  const handleToggleSave = useCallback(
    async (projectId: string) => {
      if (mode === 'account' && user) {
        const currentlySaved = savedIds.includes(projectId);
        await FirestoreAdapter.toggleSaveProject(user.uid, projectId, currentlySaved);
      } else {
        StorageService.toggleSaveProject(projectId);
      }
    },
    [mode, user, savedIds]
  );

  const handleSaveProfile = useCallback(
    (updated: UserProfile) => {
      if (mode === 'account' && user) {
        updateCloudProfile(updated);
      } else {
        StorageService.saveProfile(updated);
      }
    },
    [mode, user, updateCloudProfile]
  );

  const handleResetDemoConfirm = useCallback(() => {
    StorageService.resetToDemo();
  }, []);

  const handleOpenFutureModal = useCallback(
    (type: FutureFeatureType, projectName?: string) => {
      setFutureModalType(type);
      setFutureProjectName(projectName);
    },
    []
  );

  // Collaboration Proposal Handlers
  const handleSendProposal = useCallback((proposal: CollaborationProposal) => {
    StorageService.saveProposal(proposal);
  }, []);

  const handleAcceptProposal = useCallback((proposalId: string) => {
    return StorageService.acceptProposal(proposalId);
  }, []);

  const handleDeclineProposal = useCallback((proposalId: string) => {
    StorageService.declineProposal(proposalId);
  }, []);

  const handleCancelProposal = useCallback((proposalId: string) => {
    StorageService.cancelProposal(proposalId);
  }, []);

  // Workspace Handlers (Demo + Cloud Phase 4B2)
  const handleAddTask = useCallback(
    async (workspaceId: string, task: Omit<WorkspaceTask, 'id' | 'createdAt'>) => {
      if (mode === 'account') {
        await FirestoreAdapter.addCloudWorkspaceTask(workspaceId, task);
      } else {
        StorageService.addWorkspaceTask(workspaceId, task);
      }
    },
    [mode]
  );

  const handleUpdateTask = useCallback(
    async (workspaceId: string, task: WorkspaceTask) => {
      if (mode === 'account') {
        await FirestoreAdapter.updateCloudWorkspaceTask(workspaceId, task);
      } else {
        StorageService.updateWorkspaceTask(workspaceId, task);
      }
    },
    [mode]
  );

  const handleDeleteTask = useCallback(
    async (workspaceId: string, taskId: string) => {
      if (mode === 'account') {
        await FirestoreAdapter.deleteCloudWorkspaceTask(workspaceId, taskId);
      } else {
        StorageService.deleteWorkspaceTask(workspaceId, taskId);
      }
    },
    [mode]
  );

  const handleAddWorkspaceMessage = useCallback(
    async (workspaceId: string, message: { authorId: string; content: string }) => {
      if (mode === 'account') {
        await FirestoreAdapter.addCloudWorkspaceMessage(
          workspaceId,
          message
        );
      } else {
        StorageService.addWorkspaceMessage(workspaceId, message);
      }
    },
    [mode]
  );

  const handleCancelWorkspace = useCallback(
    async (workspaceId: string) => {
      if (mode === 'account') {
        await FirestoreAdapter.cancelCloudWorkspace(workspaceId);
      } else {
        StorageService.cancelWorkspace(workspaceId);
      }
    },
    [mode]
  );

  // Physical Build and Disassembly Lifecycle Handlers (Phase 6)
  const handleRecordPhysicalBuild = useCallback(
    async (entry: Omit<ReuseLedgerEntry, 'id' | 'timestamp'>) => {
      const fullEntry: ReuseLedgerEntry = {
        ...entry,
        id: `rl-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
        timestamp: new Date().toISOString(),
      };
      if (mode === 'account' && user) {
        await FirestoreAdapter.recordReuseLedgerEntry(user.uid, fullEntry);
        for (const item of entry.allocatedItems || []) {
          const currentItem = cloudInventory.find((i) => i.id === item.inventoryItemId);
          if (currentItem) {
            const newInstalled = (currentItem.installedQuantity || 0) + item.quantity;
            await FirestoreAdapter.updateInventoryItem(user.uid, {
              ...currentItem,
              installedQuantity: newInstalled,
            });
          }
        }
      } else {
        for (const item of entry.allocatedItems || []) {
          const currentItem = demoInventory.find((i) => i.id === item.inventoryItemId);
          if (currentItem) {
            const newInstalled = (currentItem.installedQuantity || 0) + item.quantity;
            StorageService.updateComponent({
              ...currentItem,
              installedQuantity: newInstalled,
            });
          }
        }
      }
    },
    [mode, user, cloudInventory, demoInventory]
  );

  const handleRecordDisassembly = useCallback(
    async (entry: Omit<ReuseLedgerEntry, 'id' | 'timestamp'>) => {
      const fullEntry: ReuseLedgerEntry = {
        ...entry,
        id: `rl-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
        timestamp: new Date().toISOString(),
      };
      if (mode === 'account' && user) {
        await FirestoreAdapter.recordReuseLedgerEntry(user.uid, fullEntry);
        for (const item of entry.allocatedItems || []) {
          const currentItem = cloudInventory.find((i) => i.id === item.inventoryItemId);
          if (currentItem) {
            const newInstalled = Math.max(0, (currentItem.installedQuantity || 0) - item.quantity);
            await FirestoreAdapter.updateInventoryItem(user.uid, {
              ...currentItem,
              installedQuantity: newInstalled,
            });
          }
        }
      } else {
        for (const item of entry.allocatedItems || []) {
          const currentItem = demoInventory.find((i) => i.id === item.inventoryItemId);
          if (currentItem) {
            const newInstalled = Math.max(0, (currentItem.installedQuantity || 0) - item.quantity);
            StorageService.updateComponent({
              ...currentItem,
              installedQuantity: newInstalled,
            });
          }
        }
      }
    },
    [mode, user, cloudInventory, demoInventory]
  );

  // Mentorship Handlers
  const handleSubmitMentorRequest = useCallback(
    (request: MentorshipRequest) => {
      StorageService.saveMentorRequest(request);
    },
    []
  );

  const handleRespondMentorRequest = useCallback(
    (requestId: string, content: string) => {
      StorageService.respondToMentorRequest(requestId, activeUser.id, content);
    },
    [activeUser.id]
  );

  const handleResolveMentorRequest = useCallback((requestId: string) => {
    StorageService.resolveMentorRequest(requestId);
  }, []);

  // Network Navigation shortcuts
  const handleFindPartnerForProject = useCallback(
    (projectId: string) => {
      setLocation(`/network?project=${projectId}`);
    },
    [setLocation]
  );

  const handleAskMentorForProject = useCallback(
    (projectId: string, workspaceId?: string, prefillQuestion?: string, prefillStage?: string) => {
      setGlobalMentorProjectId(projectId);
      setGlobalMentorWorkspaceId(workspaceId);
      setGlobalMentorPrefillQuestion(prefillQuestion);
      setGlobalMentorPrefillStage(prefillStage);
    },
    []
  );

  // Authentication Loading Screen: prevents flashing previous user's private data
  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#F7F9F8] flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-8 max-w-sm w-full text-center space-y-4 shadow-sm">
          <div className="w-10 h-10 border-4 border-[#087F83] border-t-transparent rounded-full animate-spin mx-auto" />
          <div className="space-y-1">
            <h2 className="text-base font-bold text-[#132B3B]">
              Restoring EcoBuild Session
            </h2>
            <p className="text-xs text-slate-500">
              Verifying credentials and synchronizing workbench state...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F7F9F8] flex flex-col font-sans selection:bg-[#EAF4F3] selection:text-[#087F83]">
      {/* Accessible Top Bar */}
      <Header
        onOpenAddComponent={() => {
          setEditingComponent(null);
          setIsAddComponentOpen(true);
        }}
        onOpenResetDemo={() => setIsResetDemoOpen(true)}
        mobileMenuOpen={mobileMenuOpen}
        setMobileMenuOpen={setMobileMenuOpen}
        savedCount={savedIds.length}
        activeUser={activeUser}
        allMakers={demoAllMakers}
        proposals={demoProposals}
        mentorRequests={demoMentorRequests}
        onSelectUser={handleSelectUser}
        mode={mode}
      />

      {/* Main Workspace Frame */}
      <div className="flex-1 flex max-w-7xl w-full mx-auto">
        {/* Desktop Sidebar */}
        <Sidebar
          inventoryCount={inventory.length}
          freeCount={freeCount}
          savedCount={savedIds.length}
          activeWorkspacesCount={activeWorkspacesCount}
          activeUser={activeUser}
          mode={mode}
          onOpenFutureFeature={handleOpenFutureModal}
        />

        {/* Dynamic Route Content Area */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 min-w-0 overflow-y-auto">
          <Switch>
            <Route path="/">
              <DiscoverPage
                profile={activeUser}
                inventory={inventory}
                rankedMatches={rankedMatches}
                savedIds={savedIds}
                allMakers={demoAllMakers}
                allInventories={allInventories}
                proposals={demoProposals}
                mentorRequests={demoMentorRequests}
                projects={PROJECT_LIBRARY}
                onToggleSave={handleToggleSave}
                onOpenAddComponent={() => {
                  setEditingComponent(null);
                  setIsAddComponentOpen(true);
                }}
                onOpenFutureFeature={handleOpenFutureModal}
              />
            </Route>

            <Route path="/components">
              <InventoryPage
                inventory={inventory}
                onAdd={() => {
                  setEditingComponent(null);
                  setIsAddComponentOpen(true);
                }}
                onEdit={handleEditComponent}
                onDelete={handleDeleteComponent}
                onOpenResetDemo={() => setIsResetDemoOpen(true)}
                ledgerEntries={cloudLedgerEntries}
                onRecordPhysicalBuild={handleRecordPhysicalBuild}
                onRecordDisassembly={handleRecordDisassembly}
              />
            </Route>

            <Route path="/projects">
              <ProjectLibraryPage
                projectMatches={rankedMatches}
                savedIds={savedIds}
                onToggleSave={handleToggleSave}
              />
            </Route>

            <Route path="/projects/:id">
              <ProjectDetailPage
                projectMatches={projectMatches}
                savedIds={savedIds}
                onToggleSave={handleToggleSave}
                onOpenFutureFeature={handleOpenFutureModal}
                onOpenAddComponent={() => {
                  setEditingComponent(null);
                  setIsAddComponentOpen(true);
                }}
                onFindPartnerForProject={handleFindPartnerForProject}
                onAskMentorForProject={handleAskMentorForProject}
              />
            </Route>

            {/* Maker Network */}
            <Route path="/network">
              <MakerNetworkPage
                projects={PROJECT_LIBRARY}
                activeUser={activeUser}
                allMakers={demoAllMakers}
                allInventories={allInventories}
                proposals={demoProposals}
                workspaces={demoWorkspaces}
                mentorRequests={demoMentorRequests}
                mode={mode}
                onSwitchToDemo={() => setMode('demo')}
                onSendProposal={handleSendProposal}
                onAcceptProposal={handleAcceptProposal}
                onDeclineProposal={handleDeclineProposal}
                onCancelProposal={handleCancelProposal}
                onSubmitMentorRequest={handleSubmitMentorRequest}
                onRespondMentorRequest={handleRespondMentorRequest}
                onResolveMentorRequest={handleResolveMentorRequest}
              />
            </Route>

            {/* Working Project Workspace Room */}
            <Route path="/workspaces/:id">
              <WorkspaceDetailPage
                workspaces={mode === 'account' ? (cloudWorkspaces as any) : demoWorkspaces}
                projects={PROJECT_LIBRARY}
                allMakers={demoAllMakers}
                activeUser={activeUser}
                mentorRequests={demoMentorRequests}
                mode={mode}
                onSwitchToDemo={() => setMode('demo')}
                onAddTask={handleAddTask}
                onUpdateTask={handleUpdateTask}
                onDeleteTask={handleDeleteTask}
                onAddMessage={handleAddWorkspaceMessage}
                onCancelWorkspace={handleCancelWorkspace}
                onOpenFutureFeature={handleOpenFutureModal}
                onOpenMentorRequest={handleAskMentorForProject}
              />
            </Route>

            <Route path="/saved">
              <SavedProjectsPage
                projectMatches={projectMatches}
                savedIds={savedIds}
                onToggleSave={handleToggleSave}
              />
            </Route>

            <Route path="/profile">
              <ProfilePage
                profile={activeProfile}
                onSaveProfile={handleSaveProfile}
                onOpenResetDemo={() => setIsResetDemoOpen(true)}
                mode={mode}
                googleUser={user}
              />
            </Route>

            {/* 3D Build Studio */}
            <Route path="/studio">
              <React.Suspense
                fallback={
                  <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-4 shadow-2xs">
                    <div className="w-10 h-10 border-4 border-[#087F83] border-t-transparent rounded-full animate-spin mx-auto" />
                    <h3 className="text-base font-bold text-[#132B3B]">
                      Loading 3D Build Studio...
                    </h3>
                    <p className="text-xs text-slate-500">
                      Preparing interactive 3D WebGL scene and circuit components.
                    </p>
                  </div>
                }
              >
                <BuildStudioPage
                  activeUser={activeUser}
                  inventory={inventory}
                  onOpenAddComponent={() => {
                    setEditingComponent(null);
                    setIsAddComponentOpen(true);
                  }}
                  onAskMentor={handleAskMentorForProject}
                />
              </React.Suspense>
            </Route>

            <Route path="/build">
              <React.Suspense
                fallback={
                  <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-4 shadow-2xs">
                    <div className="w-10 h-10 border-4 border-[#087F83] border-t-transparent rounded-full animate-spin mx-auto" />
                    <h3 className="text-base font-bold text-[#132B3B]">
                      Loading 3D Build Studio...
                    </h3>
                    <p className="text-xs text-slate-500">
                      Preparing interactive 3D WebGL scene and circuit components.
                    </p>
                  </div>
                }
              >
                <BuildStudioPage
                  activeUser={activeUser}
                  inventory={inventory}
                  onOpenAddComponent={() => {
                    setEditingComponent(null);
                    setIsAddComponentOpen(true);
                  }}
                  onAskMentor={handleAskMentorForProject}
                />
              </React.Suspense>
            </Route>

            <Route path="/leaderboards">
              <LeaderboardsPage
                activeUser={activeUser}
                mode={mode}
                googleUser={user}
              />
            </Route>

            <Route path="/impact">
              <ImpactDashboardPage
                ledgerEntries={cloudLedgerEntries}
                mode={mode}
                inventory={inventory}
              />
            </Route>

            {/* Fallback */}
            <Route>
              <div className="bg-white rounded-xl border border-slate-200 p-12 text-center space-y-4">
                <h2 className="text-xl font-bold text-[#132B3B]">Page Not Found</h2>
                <p className="text-xs text-slate-500">
                  The requested workbench destination is not recognized.
                </p>
                <button
                  onClick={() => setLocation('/')}
                  className="px-4 py-2 text-xs font-semibold text-white bg-[#087F83] rounded-lg cursor-pointer"
                >
                  Return to Discover
                </button>
              </div>
            </Route>
          </Switch>
        </main>
      </div>

      {/* Global Modals */}
      <ComponentFormModal
        isOpen={isAddComponentOpen}
        onClose={() => {
          setIsAddComponentOpen(false);
          setEditingComponent(null);
        }}
        onSave={handleSaveComponent}
        initialItem={editingComponent}
      />

      <ResetDemoDialog
        isOpen={isResetDemoOpen}
        onClose={() => setIsResetDemoOpen(false)}
        onConfirm={handleResetDemoConfirm}
      />

      <FutureFeatureModal
        isOpen={Boolean(futureModalType)}
        onClose={() => {
          setFutureModalType(null);
          setFutureProjectName(undefined);
        }}
        featureType={futureModalType}
        projectName={futureProjectName}
      />

      <OnboardingModal
        isOpen={isOnboardingOpen}
        onClose={() => setIsOnboardingOpen(false)}
        onExploreDemo={handleExploreDemo}
        onSaveProfile={handleSaveProfileFromOnboarding}
        currentProfile={activeProfile}
      />

      {/* Global Mentor Request Modal */}
      {globalMentorProjectId && (
        <MentorRequestModal
          isOpen={Boolean(globalMentorProjectId)}
          onClose={() => {
            setGlobalMentorProjectId(null);
            setGlobalMentorWorkspaceId(undefined);
            setGlobalMentorPrefillQuestion(undefined);
            setGlobalMentorPrefillStage(undefined);
          }}
          selectedMentor={null}
          allMentors={demoAllMakers.filter((m) => m.mentorProfile?.isAvailable)}
          projects={PROJECT_LIBRARY}
          defaultProjectId={globalMentorProjectId}
          defaultWorkspaceId={globalMentorWorkspaceId}
          defaultQuestion={globalMentorPrefillQuestion}
          defaultStage={globalMentorPrefillStage}
          activeUser={activeUser}
          onSubmitRequest={handleSubmitMentorRequest}
        />
      )}
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <EcoBuildApp />
    </AuthProvider>
  );
}
