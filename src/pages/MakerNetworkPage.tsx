/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useLocation } from 'wouter';
import {
  ProjectTemplate,
  MakerProfile,
  ComponentItem,
  CollaborationProposal,
  ProjectWorkspace,
  MentorshipRequest,
  PartnerSuggestion,
  DiscoverableMakerProfile,
  CloudMentorshipTicket,
  MentorshipHelpCategory,
} from '../types';
import { calculatePartnerSuggestions } from '../utils/partnerMatching';
import { calculateProjectMatch } from '../utils/matching';
import { FirestoreAdapter } from '../services/firestoreAdapter';
import { ProposalModal } from '../components/network/ProposalModal';
import { MentorRequestModal } from '../components/network/MentorRequestModal';
import { ExchangeListingModal } from '../components/network/ExchangeListingModal';
import { ShowcaseModal } from '../components/network/ShowcaseModal';
import { ModerationReportModal } from '../components/network/ModerationReportModal';
import { InteractionReviewModal } from '../components/network/InteractionReviewModal';
import {
  ComponentExchangeListing,
  ShowcaseProject,
  VerifiedInteractionReview,
  ModerationReport,
} from '../types';
import {
  Users,
  ShieldCheck,
  Send,
  Sparkles,
  CheckCircle2,
  Clock,
  ArrowRight,
  AlertCircle,
  Package,
  Layers,
  Check,
  X,
  MessageSquare,
  HelpCircle,
  Globe,
  Filter,
  Search,
  Eye,
  Info,
} from 'lucide-react';

interface MakerNetworkPageProps {
  projects: ProjectTemplate[];
  activeUser: MakerProfile;
  allMakers: MakerProfile[];
  allInventories: Record<string, ComponentItem[]>;
  proposals: CollaborationProposal[];
  workspaces: ProjectWorkspace[];
  mentorRequests: MentorshipRequest[];
  initialProjectId?: string;
  mode?: 'demo' | 'account';
  onSwitchToDemo?: () => void;
  onSendProposal: (proposal: CollaborationProposal) => void;
  onAcceptProposal: (proposalId: string) => { success: boolean; error?: string; workspaceId?: string };
  onDeclineProposal: (proposalId: string) => void;
  onCancelProposal: (proposalId: string) => void;
  onSubmitMentorRequest: (request: MentorshipRequest) => void;
  onRespondMentorRequest: (requestId: string, content: string) => void;
  onResolveMentorRequest: (requestId: string) => void;
}

export function MakerNetworkPage({
  projects,
  activeUser,
  allMakers,
  allInventories,
  proposals,
  workspaces,
  mentorRequests,
  initialProjectId,
  mode = 'demo',
  onSwitchToDemo,
  onSendProposal,
  onAcceptProposal,
  onDeclineProposal,
  onCancelProposal,
  onSubmitMentorRequest,
  onRespondMentorRequest,
  onResolveMentorRequest,
}: MakerNetworkPageProps) {
  const [, setLocation] = useLocation();

  // Tab State: In account mode: 'directory' | 'mentors' | 'activity'
  // In demo mode: 'partners' | 'mentors' | 'proposals'
  const [activeTab, setActiveTab] = useState<string>(
    mode === 'account' ? 'directory' : 'partners'
  );

  const [selectedProjectId, setSelectedProjectId] = useState<string>(
    initialProjectId || projects[5]?.id || projects[0]?.id || ''
  );

  // ----------------------------------------------------
  // Real Account Mode State (Backed by Firestore)
  // ----------------------------------------------------
  const [realMakers, setRealMakers] = useState<DiscoverableMakerProfile[]>([]);
  const [realTickets, setRealTickets] = useState<CloudMentorshipTicket[]>([]);
  const [realWorkspaces, setRealWorkspaces] = useState<any[]>([]);

  // Filter State for Real Maker Discovery
  const [filterExp, setFilterExp] = useState<string>('All');
  const [filterSkill, setFilterSkill] = useState<string>('');
  const [filterInterest, setFilterInterest] = useState<string>('All');
  const [filterMentorOnly, setFilterMentorOnly] = useState<boolean>(false);

  // Structured Real Mentorship Modal state
  const [isCloudMentorModalOpen, setIsCloudMentorModalOpen] = useState(false);
  const [selectedCloudMentor, setSelectedCloudMentor] = useState<DiscoverableMakerProfile | null>(null);
  const [cloudQuestion, setCloudQuestion] = useState('');
  const [cloudCategory, setCloudCategory] = useState<MentorshipHelpCategory>('understanding-circuit');
  const [cloudProjectId, setCloudProjectId] = useState(selectedProjectId || projects[0]?.id || '');
  const [cloudNotes, setCloudNotes] = useState('');
  const [cloudTicketError, setCloudTicketError] = useState<string | null>(null);
  const [cloudTicketSuccess, setCloudTicketSuccess] = useState<string | null>(null);

  // Real Ticket Reply State
  const [ticketReplyText, setTicketReplyText] = useState<Record<string, string>>({});

  // Product Expansion: Exchange Listings & Showcase Projects State
  const [isExchangeModalOpen, setIsExchangeModalOpen] = useState(false);
  const [isShowcaseModalOpen, setIsShowcaseModalOpen] = useState(false);
  const [isModerationModalOpen, setIsModerationModalOpen] = useState(false);
  const [moderationTarget, setModerationTarget] = useState<{
    type: 'maker' | 'proposal' | 'listing' | 'workspace_message';
    id: string;
    displayName?: string;
  }>({ type: 'maker', id: 'community-concern', displayName: 'Community Report' });
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [reviewTarget, setReviewTarget] = useState<{
    type: 'workspace' | 'component_exchange';
    id: string;
    targetMakerId: string;
    targetMakerDisplayName: string;
  }>({ type: 'component_exchange', id: '', targetMakerId: '', targetMakerDisplayName: '' });

  const [exchangeListings, setExchangeListings] = useState<ComponentExchangeListing[]>([
    {
      id: 'demo-ex-1',
      ownerId: 'maker-2',
      ownerDisplayName: 'Elena Rostova',
      catalogId: 'comp-arduino-nano',
      name: 'Arduino Nano V3 (CH340G)',
      componentName: 'Arduino Nano V3 (CH340G)',
      category: 'microcontroller',
      quantity: 2,
      condition: 'working',
      offeredQuantity: 2,
      listingType: 'free-donation',
      status: 'available',
      handoffLocationNote: 'Lab 4 Drop-off Box or Campus Quad',
      createdAt: '2026-03-20T10:00:00Z',
      updatedAt: '2026-03-20T10:00:00Z',
    },
    {
      id: 'demo-ex-2',
      ownerId: 'maker-3',
      ownerDisplayName: 'Marcus Vance',
      catalogId: 'comp-sg90-servo',
      name: 'Micro Servo 9g (SG90)',
      componentName: 'Micro Servo 9g (SG90)',
      category: 'actuator',
      quantity: 3,
      condition: 'working',
      offeredQuantity: 3,
      listingType: 'swap-preferred',
      status: 'available',
      notes: 'Looking to swap for a 5V relay module or DHT22 sensor.',
      handoffLocationNote: 'Engineering Building Room 204',
      createdAt: '2026-03-22T14:30:00Z',
      updatedAt: '2026-03-22T14:30:00Z',
    },
  ]);

  const [showcaseProjects, setShowcaseProjects] = useState<ShowcaseProject[]>([
    {
      id: 'demo-show-1',
      authorId: 'maker-1',
      authorDisplayName: 'Sarah Chen',
      title: 'Touchless Recycling Bin with Ultrasonic Sensing',
      recipeName: 'Smart Dustbin (Touchless Lid Opener)',
      description: 'Salvaged an HC-SR04 ultrasonic sensor and micro servo from an old robotics kit to build a touchless bin for our kitchen!',
      massDivertedGrams: 124,
      componentsList: ['Arduino Uno', 'HC-SR04 Sonar', 'SG90 Servo', 'Half-Breadboard'],
      likesCount: 14,
      createdAt: '2026-03-15T09:12:00Z',
    },
    {
      id: 'demo-show-2',
      authorId: 'maker-2',
      authorDisplayName: 'Elena Rostova',
      title: 'Autonomous Solar-Powered Plant Monitor',
      recipeName: 'Automated Plant Watering System',
      description: 'Reused a capacitive soil sensor and 5V mini water pump to keep my basil alive while on campus break.',
      massDivertedGrams: 215,
      componentsList: ['ESP32 NodeMCU', 'Soil Moisture Sensor', '5V Water Pump', 'Relay Module'],
      likesCount: 22,
      createdAt: '2026-03-18T16:45:00Z',
    },
  ]);

  // Subscribe to real cloud discoverable profiles, tickets, workspaces, exchange & showcase
  useEffect(() => {
    if (mode !== 'account') return;

    const unsubMakers = FirestoreAdapter.subscribeToDiscoverableMakers((makers) => {
      setRealMakers(makers);
    });

    const unsubTickets = FirestoreAdapter.subscribeToUserMentorshipTickets(
      activeUser.id,
      (tickets) => {
        setRealTickets(tickets);
      }
    );

    const unsubWorkspaces = FirestoreAdapter.subscribeToUserWorkspaces(
      activeUser.id,
      (ws) => {
        setRealWorkspaces(ws);
      }
    );

    const unsubListings = FirestoreAdapter.subscribeToExchangeListings((listings) => {
      if (listings.length > 0) {
        setExchangeListings(listings);
      }
    });

    const unsubShowcase = FirestoreAdapter.subscribeToShowcaseProjects((projects) => {
      if (projects.length > 0) {
        setShowcaseProjects(projects);
      }
    });

    return () => {
      unsubMakers();
      unsubTickets();
      unsubWorkspaces();
      unsubListings();
      unsubShowcase();
    };
  }, [mode, activeUser.id]);

  // Modals state for Demo Mode
  const [activeProposalCandidate, setActiveProposalCandidate] = useState<PartnerSuggestion | null>(null);
  const [activeMentorToRequest, setActiveMentorToRequest] = useState<MakerProfile | null>(null);
  const [isMentorModalOpen, setIsMentorModalOpen] = useState(false);

  // Proposal notification
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Demo mentor response text input state
  const [mentorReplyText, setMentorReplyText] = useState<Record<string, string>>({});

  // Handlers for Component Exchange
  const handlePublishListing = async (listing: Omit<ComponentExchangeListing, 'id' | 'createdAt' | 'updatedAt'>) => {
    const fullListing: ComponentExchangeListing = {
      ...listing,
      id: `ex-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    if (mode === 'account') {
      await FirestoreAdapter.publishExchangeListing(fullListing);
    } else {
      setExchangeListings((prev) => [fullListing, ...prev]);
    }
    setActionSuccess('Component listing published to exchange directory!');
    setTimeout(() => setActionSuccess(null), 4000);
  };

  const handleUpdateExchangeStatus = async (listingId: string, status: any) => {
    if (mode === 'account') {
      await FirestoreAdapter.updateExchangeListingStatus(listingId, status);
    } else {
      setExchangeListings((prev) =>
        prev.map((l) => (l.id === listingId ? { ...l, status, updatedAt: new Date().toISOString() } : l))
      );
    }
  };

  const handlePublishShowcase = async (project: Omit<ShowcaseProject, 'id' | 'createdAt' | 'likesCount'>) => {
    if (mode === 'account') {
      await FirestoreAdapter.publishShowcaseProject(project as any);
    } else {
      const mock: ShowcaseProject = {
        ...project,
        id: `mock-show-${Date.now()}`,
        createdAt: new Date().toISOString(),
        likesCount: 1,
      };
      setShowcaseProjects((prev) => [mock, ...prev]);
    }
    setActionSuccess('Build showcase published to community!');
    setTimeout(() => setActionSuccess(null), 4000);
  };

  const handleUnpublishShowcase = async (showcaseId: string) => {
    setShowcaseProjects((prev) => prev.filter((p) => p.id !== showcaseId));
    setActionSuccess('Showcase entry removed.');
    setTimeout(() => setActionSuccess(null), 4000);
  };

  const handleSubmitModeration = async (report: any) => {
    if (mode === 'account') {
      await FirestoreAdapter.submitModerationReport(report);
    }
    setActionSuccess('Report submitted to lab reviewer queue for evaluation.');
    setTimeout(() => setActionSuccess(null), 4000);
  };

  const handleSubmitReview = async (review: any) => {
    if (mode === 'account') {
      await FirestoreAdapter.submitInteractionReview(review);
    }
    setActionSuccess('Verified interaction review saved.');
    setTimeout(() => setActionSuccess(null), 4000);
  };

  // Active user's inventory
  const userInventory = useMemo(() => {
    return allInventories[activeUser.id] || [];
  }, [allInventories, activeUser.id]);

  // Selected project object
  const selectedProject = useMemo(() => {
    return projects.find((p) => p.id === selectedProjectId) || projects[0];
  }, [projects, selectedProjectId]);

  // Calculate user's individual coverage for the selected project
  const userProjectMatch = useMemo(() => {
    if (!selectedProject) return null;
    return calculateProjectMatch(selectedProject, userInventory);
  }, [selectedProject, userInventory]);

  // Calculate partner suggestions for demo mode
  const partnerSuggestions = useMemo(() => {
    if (!selectedProject) return [];
    return calculatePartnerSuggestions(
      selectedProject,
      activeUser,
      userInventory,
      allMakers,
      allInventories
    );
  }, [selectedProject, activeUser, userInventory, allMakers, allInventories]);

  // Demo mentors
  const demoAvailableMentors = useMemo(() => {
    return allMakers.filter((m) => m.mentorProfile?.isAvailable);
  }, [allMakers]);

  // Filtered real makers
  const filteredRealMakers = useMemo(() => {
    return realMakers.filter((m) => {
      if (filterExp !== 'All' && m.experience !== filterExp) return false;
      if (filterMentorOnly && !m.isMentor) return false;
      if (filterInterest !== 'All' && !m.interests.includes(filterInterest)) return false;
      if (filterSkill.trim()) {
        const query = filterSkill.toLowerCase().trim();
        const hasMatch = m.skills.some((s) => s.toLowerCase().includes(query));
        if (!hasMatch) return false;
      }
      return true;
    });
  }, [realMakers, filterExp, filterSkill, filterInterest, filterMentorOnly]);

  // Real mentors in Account Mode
  const realMentors = useMemo(() => {
    return realMakers.filter((m) => m.isMentor);
  }, [realMakers]);

  // Demo proposals
  const incomingProposals = proposals.filter((p) => p.receiverId === activeUser.id);
  const outgoingProposals = proposals.filter((p) => p.senderId === activeUser.id);
  const userWorkspaces = workspaces.filter((w) => w.memberIds.includes(activeUser.id));
  const myMentorRequests = mentorRequests.filter(
    (r) => r.requesterId === activeUser.id || r.mentorId === activeUser.id
  );

  const handleAccept = (proposalId: string) => {
    setActionError(null);
    setActionSuccess(null);
    const result = onAcceptProposal(proposalId);
    if (result.success && result.workspaceId) {
      setActionSuccess('Collaboration accepted! Workspace created and components reserved.');
      setTimeout(() => {
        setLocation(`/workspaces/${result.workspaceId}`);
      }, 1200);
    } else {
      setActionError(result.error || 'Failed to accept proposal.');
    }
  };

  // Real Ticket Submission Handler
  const handleCreateCloudTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCloudMentor) return;
    if (!cloudQuestion.trim()) {
      setCloudTicketError('Please provide a specific description of your circuit or code question.');
      return;
    }

    try {
      const proj = projects.find((p) => p.id === cloudProjectId);
      await FirestoreAdapter.createMentorshipTicket({
        requesterId: activeUser.id,
        requesterDisplayName: activeUser.displayName,
        mentorId: selectedCloudMentor.uid,
        mentorDisplayName: selectedCloudMentor.displayName,
        projectId: cloudProjectId,
        projectTitle: proj?.name || 'Hardware Project',
        helpCategory: cloudCategory,
        question: cloudQuestion.trim(),
        notesOrCode: cloudNotes.trim() || undefined,
        status: 'open',
      });

      setCloudTicketSuccess(`Mentorship ticket submitted to ${selectedCloudMentor.displayName}!`);
      setIsCloudMentorModalOpen(false);
      setCloudQuestion('');
      setCloudNotes('');
      setActiveTab('activity');
      setTimeout(() => setCloudTicketSuccess(null), 4000);
    } catch (err: any) {
      setCloudTicketError(err?.message || 'Could not submit mentorship ticket.');
    }
  };

  // Real Ticket Reply Handler
  const handleReplyToRealTicket = async (ticketId: string) => {
    const text = ticketReplyText[ticketId];
    if (!text || !text.trim()) return;

    try {
      await FirestoreAdapter.respondToMentorshipTicket(ticketId, {
        authorId: activeUser.id,
        authorDisplayName: activeUser.displayName,
        content: text.trim(),
      });
      setTicketReplyText((prev) => ({ ...prev, [ticketId]: '' }));
    } catch (err: any) {
      alert(`Failed to send reply: ${err?.message}`);
    }
  };

  const handleResolveRealTicket = async (ticketId: string) => {
    try {
      await FirestoreAdapter.updateMentorshipTicketStatus(ticketId, 'resolved');
    } catch (err: any) {
      alert(`Failed to resolve ticket: ${err?.message}`);
    }
  };

  const handleAcceptRealTicket = async (ticketId: string) => {
    try {
      await FirestoreAdapter.updateMentorshipTicketStatus(ticketId, 'accepted');
    } catch (err: any) {
      alert(`Failed to accept ticket: ${err?.message}`);
    }
  };

  const handleDeclineRealTicket = async (ticketId: string) => {
    try {
      await FirestoreAdapter.updateMentorshipTicketStatus(ticketId, 'declined');
    } catch (err: any) {
      alert(`Failed to decline ticket: ${err?.message}`);
    }
  };

  return (
    <div className="space-y-8 pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#087F83] uppercase tracking-wider mb-1">
            <Users className="w-3.5 h-3.5" />
            <span>
              {mode === 'account'
                ? 'Phase 4B1: Real Maker Discovery & Mentorship'
                : 'Collaborative Maker Network (Demo Mode)'}
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[#132B3B]">
            Maker Network & Peer Mentorship
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {mode === 'account'
              ? 'Discover verified opt-in makers, request structured mentorship, and collaborate on sustainable builds.'
              : 'Discover teammates with complementary parts, request guidance from opted-in mentors, and coordinate shared builds.'}
          </p>
        </div>

        {/* Quick Tabs Counter Pills */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200 self-start sm:self-center overflow-x-auto">
          {mode === 'account' ? (
            <>
              <button
                onClick={() => setActiveTab('directory')}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
                  activeTab === 'directory'
                    ? 'bg-white text-[#087F83] shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Makers Directory ({realMakers.length})
              </button>
              <button
                onClick={() => setActiveTab('mentors')}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
                  activeTab === 'mentors'
                    ? 'bg-white text-[#087F83] shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Mentors ({realMentors.length})
              </button>
              <button
                onClick={() => setActiveTab('activity')}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer relative ${
                  activeTab === 'activity'
                    ? 'bg-white text-[#087F83] shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                My Tickets & Activity ({realTickets.length})
                {realTickets.filter((t) => t.status === 'open' && t.mentorId === activeUser.id).length > 0 && (
                  <span className="ml-1.5 px-1.5 py-0.2 text-[10px] font-bold bg-amber-500 text-white rounded-full">
                    {realTickets.filter((t) => t.status === 'open' && t.mentorId === activeUser.id).length}
                  </span>
                )}
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setActiveTab('partners')}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
                  activeTab === 'partners'
                    ? 'bg-white text-[#087F83] shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Project Partners
              </button>
              <button
                onClick={() => setActiveTab('mentors')}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
                  activeTab === 'mentors'
                    ? 'bg-white text-[#087F83] shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Mentors ({demoAvailableMentors.length})
              </button>
              <button
                onClick={() => setActiveTab('proposals')}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer relative ${
                  activeTab === 'proposals'
                    ? 'bg-white text-[#087F83] shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                My Activity
                {incomingProposals.filter((p) => p.status === 'pending').length > 0 && (
                  <span className="ml-1.5 px-1.5 py-0.2 text-[10px] font-bold bg-amber-500 text-white rounded-full">
                    {incomingProposals.filter((p) => p.status === 'pending').length}
                  </span>
                )}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Product Expansion Quick Actions */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-white rounded-xl border border-slate-200 shadow-2xs">
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setIsExchangeModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-teal-800 bg-teal-50 hover:bg-teal-100 border border-teal-200 rounded-lg cursor-pointer transition-colors"
          >
            <Package className="w-3.5 h-3.5 text-teal-600" />
            <span>Component Exchange & Donations ({exchangeListings.length})</span>
          </button>
          <button
            onClick={() => setIsShowcaseModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-purple-800 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-lg cursor-pointer transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5 text-purple-600" />
            <span>Community Showcase ({showcaseProjects.length})</span>
          </button>
        </div>
        <button
          onClick={() => {
            setModerationTarget({
              type: 'maker',
              id: 'general-safety-concern',
              displayName: 'Community Safety Report',
            });
            setIsModerationModalOpen(true);
          }}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-500 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 rounded-lg cursor-pointer transition-colors"
          title="File a report with the lab moderation queue"
        >
          <AlertCircle className="w-3.5 h-3.5" />
          <span>Report Concern</span>
        </button>
      </div>

      {/* Action Banners */}
      {cloudTicketSuccess && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-xs font-semibold text-emerald-800">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{cloudTicketSuccess}</span>
        </div>
      )}
      {actionSuccess && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-xs font-semibold text-emerald-800">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{actionSuccess}</span>
        </div>
      )}
      {actionError && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-xs font-semibold text-rose-800">
          <AlertCircle className="w-4 h-4 text-rose-600" />
          <span>{actionError}</span>
        </div>
      )}

      {/* ======================================================== */}
      {/* ACCOUNT MODE: TAB 1 — DISCOVERABLE MAKERS DIRECTORY      */}
      {/* ======================================================== */}
      {mode === 'account' && activeTab === 'directory' && (
        <div className="space-y-6">
          {/* Filter Bar */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-600">
              <Filter className="w-3.5 h-3.5 text-[#087F83]" />
              <span>Filter Real Discoverable Makers</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              {/* Experience Filter */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                  Experience Level
                </label>
                <select
                  value={filterExp}
                  onChange={(e) => setFilterExp(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800"
                >
                  <option value="All">All Levels</option>
                  <option value="Beginner">Beginner</option>
                  <option value="Intermediate">Intermediate</option>
                  <option value="Advanced">Advanced</option>
                </select>
              </div>

              {/* Interest Filter */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                  Interest Category
                </label>
                <select
                  value={filterInterest}
                  onChange={(e) => setFilterInterest(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800"
                >
                  <option value="All">All Interests</option>
                  <option value="robotics">Robotics</option>
                  <option value="home automation">Home Automation</option>
                  <option value="learning electronics">Learning Electronics</option>
                  <option value="environmental monitoring">Environmental Monitoring</option>
                  <option value="creative projects">Creative Projects</option>
                </select>
              </div>

              {/* Skill Search Input */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                  Skill Keyword
                </label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="e.g. Soldering, ESP32..."
                    value={filterSkill}
                    onChange={(e) => setFilterSkill(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800"
                  />
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
                </div>
              </div>

              {/* Mentors Only Checkbox */}
              <div className="flex items-center sm:pt-5">
                <label className="inline-flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700">
                  <input
                    type="checkbox"
                    checked={filterMentorOnly}
                    onChange={(e) => setFilterMentorOnly(e.target.checked)}
                    className="rounded border-slate-300 text-[#087F83] focus:ring-[#087F83]"
                  />
                  <span>Mentors Only</span>
                </label>
              </div>
            </div>
          </div>

          {/* Makers List */}
          {filteredRealMakers.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-4 shadow-2xs">
              <div className="w-12 h-12 bg-[#EAF4F3] text-[#087F83] rounded-full flex items-center justify-center mx-auto">
                <Globe className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-[#132B3B]">
                {realMakers.length === 0
                  ? 'No Discoverable Makers Published Yet'
                  : 'No Makers Match Your Selected Filters'}
              </h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                {realMakers.length === 0
                  ? 'In Account Mode, discovery is opt-in and disabled by default. Fictional demo accounts are never shown here. Be the first to publish your card and connect with peers!'
                  : 'Try clearing your skill keywords or broadening your category filter to see more makers.'}
              </p>
              {realMakers.length === 0 && (
                <button
                  onClick={() => setLocation('/profile')}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#087F83] hover:bg-[#066366] rounded-xl shadow-xs transition-colors cursor-pointer"
                >
                  <Globe className="w-3.5 h-3.5" />
                  <span>Publish Your Card in Profile</span>
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {filteredRealMakers.map((maker) => (
                <div
                  key={maker.uid}
                  className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs hover:shadow-xs transition-shadow flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        {maker.photoURL ? (
                          <img
                            src={maker.photoURL}
                            alt={maker.displayName}
                            className="w-11 h-11 rounded-full object-cover border border-slate-200"
                          />
                        ) : (
                          <div className="w-11 h-11 rounded-full bg-[#087F83] text-white flex items-center justify-center font-bold text-base">
                            {maker.displayName.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div>
                          <div className="flex items-center gap-1.5">
                            <h3 className="text-sm font-bold text-[#132B3B]">
                              {maker.displayName}
                            </h3>
                            {maker.uid === activeUser.id && (
                              <span className="text-[10px] text-[#087F83] bg-teal-50 border border-teal-200 px-1.5 py-0.2 rounded font-semibold">
                                You
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-slate-500 mt-0.5">
                            {maker.experience} Maker · {maker.collaborationPreference}
                          </div>
                        </div>
                      </div>

                      {maker.isMentor && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#087F83] bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                          <ShieldCheck className="w-3 h-3 text-[#087F83]" />
                          Mentor
                        </span>
                      )}
                    </div>

                    {maker.bio && (
                      <p className="text-xs text-slate-600 leading-relaxed">
                        {maker.bio}
                      </p>
                    )}

                    {/* Skills & Interests */}
                    <div className="space-y-2 pt-2 border-t border-slate-100">
                      {maker.skills && maker.skills.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 items-center">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mr-1">
                            Skills:
                          </span>
                          {maker.skills.map((s, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-0.5 text-[10px] bg-slate-100 text-slate-700 rounded font-medium"
                            >
                              {s}
                            </span>
                          ))}
                        </div>
                      )}

                      {maker.interests && maker.interests.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 items-center">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mr-1">
                            Interests:
                          </span>
                          {maker.interests.map((i, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-0.5 text-[10px] bg-emerald-50 text-emerald-800 border border-emerald-200 rounded font-medium capitalize"
                            >
                              {i}
                            </span>
                          ))}
                        </div>
                      )}

                      {maker.isMentor && maker.mentorTopics && maker.mentorTopics.length > 0 && (
                        <div className="mt-2 p-2.5 bg-emerald-50/50 rounded-lg border border-emerald-100 text-xs space-y-1">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-900 block">
                            Mentorship Topics:
                          </span>
                          <div className="flex flex-wrap gap-1">
                            {maker.mentorTopics.map((t) => (
                              <span
                                key={t}
                                className="px-1.5 py-0.2 text-[10px] bg-white rounded border border-emerald-200 capitalize"
                              >
                                {t.replace('-', ' ')}
                              </span>
                            ))}
                          </div>
                          {maker.mentorAvailabilityNotes && (
                            <p className="text-[11px] text-slate-500 pt-0.5">
                              {maker.mentorAvailabilityNotes}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-[11px] text-slate-400">
                      Signed-in Maker Verified
                    </span>

                    {maker.isMentor && maker.uid !== activeUser.id && (
                      <button
                        onClick={() => {
                          setSelectedCloudMentor(maker);
                          setIsCloudMentorModalOpen(true);
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#087F83] bg-[#EAF4F3] hover:bg-[#087F83] hover:text-white rounded-lg transition-colors cursor-pointer"
                      >
                        <HelpCircle className="w-3.5 h-3.5" />
                        <span>Ask This Mentor</span>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* ACCOUNT MODE: TAB 2 — REAL MENTORS DIRECTORY             */}
      {/* ======================================================== */}
      {mode === 'account' && activeTab === 'mentors' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-[#132B3B]">
                Real Opted-In Mentors (Account Mode)
              </h2>
              <p className="text-xs text-slate-500">
                Peer makers who have volunteered to review circuits, diagnose issues, and answer questions.
              </p>
            </div>
          </div>

          {realMentors.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-4 shadow-2xs">
              <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-[#132B3B]">
                No Mentors Opted-In Yet
              </h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                No makers have currently opted in as mentors in Account Mode. You can volunteer to support peers by opting in from your Profile settings!
              </p>
              <button
                onClick={() => setLocation('/profile')}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#087F83] hover:bg-[#066366] rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Opt In as a Mentor in Profile</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {realMentors.map((mentor) => (
                <div
                  key={mentor.uid}
                  className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <h3 className="text-base font-bold text-[#132B3B]">
                            {mentor.displayName}
                          </h3>
                          <span className="inline-flex items-center gap-0.5 text-[10px] text-[#087F83] bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200 font-semibold">
                            <ShieldCheck className="w-3 h-3 text-[#087F83]" />
                            Opted-In Mentor
                          </span>
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5">
                          Self-declared experience: <strong>{mentor.experience}</strong>
                        </div>
                      </div>
                    </div>

                    <p className="text-xs text-slate-600 leading-relaxed">
                      {mentor.bio || 'Available for electronics and programming mentorship.'}
                    </p>

                    {mentor.mentorTopics && mentor.mentorTopics.length > 0 && (
                      <div className="space-y-1.5">
                        <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                          Help Topics Supported:
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {mentor.mentorTopics.map((topic) => (
                            <span
                              key={topic}
                              className="px-2 py-0.5 text-[11px] rounded bg-slate-100 text-slate-700 capitalize"
                            >
                              {topic.replace('-', ' ')}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {mentor.mentorAvailabilityNotes && (
                      <div className="p-3 bg-emerald-50/60 rounded-lg border border-emerald-100 text-xs text-slate-600">
                        <strong className="text-[#132B3B]">Availability Notes:</strong>{' '}
                        {mentor.mentorAvailabilityNotes}
                      </div>
                    )}
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-[11px] text-slate-400">
                      Self-reported proficiency
                    </span>

                    {mentor.uid !== activeUser.id && (
                      <button
                        onClick={() => {
                          setSelectedCloudMentor(mentor);
                          setIsCloudMentorModalOpen(true);
                        }}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-[#087F83] hover:bg-[#066366] rounded-lg shadow-xs transition-colors cursor-pointer"
                      >
                        <HelpCircle className="w-3.5 h-3.5" />
                        <span>Ask This Mentor</span>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* ACCOUNT MODE: TAB 3 — MY MENTORSHIP TICKETS & ACTIVITY   */}
      {/* ======================================================== */}
      {mode === 'account' && activeTab === 'activity' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-[#132B3B] flex items-center gap-1.5">
                <HelpCircle className="w-4 h-4 text-[#087F83]" />
                <span>Mentorship Tickets ({realTickets.length})</span>
              </h2>
              <p className="text-xs text-slate-500">
                Private structured help requests between you and assigned mentors.
              </p>
            </div>
          </div>

          {realTickets.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-xs text-slate-500 italic space-y-2">
              <p>You have no active mentorship tickets.</p>
              <p className="text-[11px] text-slate-400">
                Select an opted-in mentor from the Mentors tab or click "Ask a Mentor" from the 3D Build Studio to open a ticket.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {realTickets.map((ticket) => {
                const isMentorForThis = ticket.mentorId === activeUser.id;
                const otherPartyName = isMentorForThis
                  ? ticket.requesterDisplayName
                  : ticket.mentorDisplayName;

                return (
                  <div
                    key={ticket.id}
                    className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-4"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <div className="text-xs text-slate-500">
                          {isMentorForThis
                            ? `Question from ${otherPartyName}`
                            : `Asked to mentor ${otherPartyName}`} ·{' '}
                          <strong className="text-slate-700">{ticket.projectTitle}</strong>
                        </div>
                        <h3 className="text-sm font-bold text-[#132B3B] mt-0.5">
                          {ticket.question}
                        </h3>
                      </div>

                      <span
                        className={`px-2.5 py-0.5 text-xs font-semibold rounded-md self-start sm:self-center capitalize ${
                          ticket.status === 'open'
                            ? 'bg-amber-50 text-amber-800 border border-amber-200'
                            : ticket.status === 'accepted'
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                            : ticket.status === 'resolved'
                            ? 'bg-slate-100 text-slate-700'
                            : 'bg-rose-50 text-rose-800'
                        }`}
                      >
                        {ticket.status}
                      </span>
                    </div>

                    {/* Step context if present */}
                    {ticket.guideStepTitle && (
                      <div className="p-2.5 bg-slate-50 rounded-lg text-xs text-slate-600 flex items-center gap-2">
                        <span className="font-semibold text-slate-700">Guide Context:</span>
                        <span>
                          Step {ticket.guideStepIndex !== undefined ? ticket.guideStepIndex + 1 : ''}: {ticket.guideStepTitle}
                        </span>
                      </div>
                    )}

                    {/* Notes or code */}
                    {ticket.notesOrCode && (
                      <pre className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs font-mono text-slate-700 overflow-x-auto whitespace-pre-wrap">
                        {ticket.notesOrCode}
                      </pre>
                    )}

                    {/* Mentor acceptance controls if status is open and user is mentor */}
                    {isMentorForThis && ticket.status === 'open' && (
                      <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleDeclineRealTicket(ticket.id)}
                          className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-800"
                        >
                          Decline Request
                        </button>
                        <button
                          onClick={() => handleAcceptRealTicket(ticket.id)}
                          className="px-4 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs"
                        >
                          Accept Ticket
                        </button>
                      </div>
                    )}

                    {/* Threaded responses */}
                    <div className="space-y-2 pt-2 border-t border-slate-100">
                      <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                        Responses ({ticket.responses.length}):
                      </div>

                      {ticket.responses.length === 0 ? (
                        <div className="text-xs text-slate-400 italic">
                          No replies posted yet.
                        </div>
                      ) : (
                        ticket.responses.map((resp) => {
                          const isAuthor = resp.authorId === activeUser.id;
                          return (
                            <div
                              key={resp.id}
                              className={`p-3 rounded-lg text-xs space-y-1 ${
                                isAuthor
                                  ? 'bg-[#EAF4F3]/60 border border-[#087F83]/20 ml-6'
                                  : 'bg-slate-50 border border-slate-200 mr-6'
                              }`}
                            >
                              <div className="flex items-center justify-between text-[11px]">
                                <span className="font-bold text-[#132B3B]">
                                  {resp.authorDisplayName} {isAuthor && '(You)'}
                                </span>
                                <span className="text-slate-400">
                                  {new Date(resp.createdAt).toLocaleTimeString([], {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })}
                                </span>
                              </div>
                              <p className="text-slate-700 leading-relaxed whitespace-pre-wrap">
                                {resp.content}
                              </p>
                            </div>
                          );
                        })
                      )}
                    </div>

                    {/* Reply input & Resolution controls if ticket is active */}
                    {['open', 'accepted'].includes(ticket.status) && (
                      <div className="pt-2 border-t border-slate-100 space-y-2">
                        <div className="flex gap-2">
                          <input
                            type="text"
                            placeholder="Type reply or guidance..."
                            value={ticketReplyText[ticket.id] || ''}
                            onChange={(e) =>
                              setTicketReplyText((prev) => ({
                                ...prev,
                                [ticket.id]: e.target.value,
                              }))
                            }
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleReplyToRealTicket(ticket.id);
                              }
                            }}
                            className="flex-1 px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800"
                          />
                          <button
                            onClick={() => handleReplyToRealTicket(ticket.id)}
                            className="px-3.5 py-1.5 text-xs font-semibold text-white bg-[#087F83] hover:bg-[#066366] rounded-lg"
                          >
                            Reply
                          </button>
                        </div>

                        <div className="flex justify-end pt-1">
                          <button
                            onClick={() => handleResolveRealTicket(ticket.id)}
                            className="text-xs font-semibold text-emerald-700 hover:text-emerald-900"
                          >
                            ✔ Mark Ticket Resolved
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* DEMO MODE TABS (Preserved for backwards compatibility)    */}
      {/* ======================================================== */}
      {mode === 'demo' && activeTab === 'partners' && (
        <div className="space-y-6">
          {/* Project Selector Bar */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex-1">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Select Project to Find Partners:
                </label>
                <select
                  value={selectedProjectId}
                  onChange={(e) => setSelectedProjectId(e.target.value)}
                  className="w-full max-w-lg px-3.5 py-2.5 text-xs font-medium bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:border-[#087F83] transition-colors"
                >
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.difficulty} · {p.category})
                    </option>
                  ))}
                </select>
              </div>

              {/* Individual Coverage badge */}
              {userProjectMatch && (
                <div className="p-3 bg-[#F7F9F8] rounded-xl border border-slate-200 text-right shrink-0">
                  <div className="text-[11px] text-slate-500">Your Individual Coverage</div>
                  <div className="text-xl font-bold font-mono text-[#132B3B] tabular-nums">
                    {userProjectMatch.coveragePercentage}%
                  </div>
                  <div className="text-[11px] text-slate-500">
                    {userProjectMatch.matchedWorkingUnits} of {userProjectMatch.totalRequiredUnits} units owned
                  </div>
                </div>
              )}
            </div>

            {/* Missing Requirements pills */}
            {userProjectMatch && userProjectMatch.missingCount > 0 && (
              <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center gap-2 text-xs text-slate-600">
                <span className="font-semibold text-slate-700">Deficits to fill:</span>
                {userProjectMatch.requirementMatches
                  .filter((r) => r.missingQuantity > 0)
                  .map((r, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-0.5 rounded bg-amber-50 text-amber-900 border border-amber-200/80 font-mono text-[11px]"
                    >
                      {r.missingQuantity}× {r.requirement.name.split('(')[0].trim()}
                    </span>
                  ))}
              </div>
            )}
          </div>

          {/* Partner Candidates Grid */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-[#132B3B]">
                  Suggested Teammates for {selectedProject?.name}
                </h2>
                <p className="text-xs text-slate-500">
                  Makers with shareable, eligible working parts and complementary maker skills.
                </p>
              </div>
            </div>

            {partnerSuggestions.length === 0 ? (
              <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-xs text-slate-500 space-y-2">
                <p>No candidates available with complementary shareable stock.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {partnerSuggestions.map((suggestion) => {
                  const candidate = suggestion.maker;

                  return (
                    <div
                      key={candidate.id}
                      className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs hover:shadow-xs transition-shadow flex flex-col justify-between space-y-4"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="flex items-center gap-1.5">
                              <h3 className="text-sm font-bold text-[#132B3B]">
                                {candidate.displayName}
                              </h3>
                              <span className="text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.2 rounded">
                                Demo Maker
                              </span>
                            </div>
                            <div className="text-xs text-slate-500 mt-0.5">
                              {candidate.experience} · {candidate.locationLabel || 'Campus Hub'}
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <span className="inline-flex items-center gap-1 text-xs font-mono font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                              {suggestion.combinedCoveragePercentage}% Combined
                            </span>
                            {suggestion.coverageImprovementPercentage > 0 && (
                              <div className="text-[10px] text-emerald-700 font-semibold mt-0.5">
                                +{suggestion.coverageImprovementPercentage} percentage points boost
                              </div>
                            )}
                          </div>
                        </div>

                        <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                          {candidate.bio}
                        </p>

                        <div className="mt-3 p-3 bg-[#EAF4F3]/60 rounded-lg border border-[#087F83]/15 text-xs text-[#132B3B] leading-relaxed">
                          <strong className="text-[#087F83]">Match Breakdown:</strong>{' '}
                          {suggestion.matchExplanation}
                        </div>

                        {suggestion.partnerOfferedItems.length > 0 && (
                          <div className="mt-3 space-y-1.5">
                            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                              Offered Hardware:
                            </div>
                            <ul className="text-xs text-slate-700 space-y-1">
                              {suggestion.partnerOfferedItems.map((offered, idx) => (
                                <li key={idx} className="flex items-center gap-1.5">
                                  <span className="text-[#087F83] font-bold">✔</span>
                                  <span>
                                    {offered.offeredQuantity}× {offered.item.name}
                                  </span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>

                      <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-3">
                        <span className="text-[11px] text-slate-400 capitalize">
                          {candidate.collaborationPreference}
                        </span>

                        <button
                          onClick={() => setActiveProposalCandidate(suggestion)}
                          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-[#087F83] hover:bg-[#066366] rounded-lg shadow-xs transition-colors cursor-pointer"
                        >
                          <Send className="w-3.5 h-3.5" />
                          <span>Propose Collaboration</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* DEMO MODE: TAB 2 — MENTORS */}
      {mode === 'demo' && activeTab === 'mentors' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-[#132B3B]">
                Opted-In Peer & Lab Mentors (Demo Mode)
              </h2>
              <p className="text-xs text-slate-500">
                Experienced electronics builders offering advice on circuit design, troubleshooting, and code.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {demoAvailableMentors.map((mentor) => (
              <div
                key={mentor.id}
                className="bg-white rounded-xl border border-slate-200 p-6 shadow-2xs flex flex-col justify-between space-y-4"
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <h3 className="text-base font-bold text-[#132B3B]">
                          {mentor.displayName}
                        </h3>
                        <span className="inline-flex items-center gap-0.5 text-[10px] text-[#087F83] bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200 font-semibold">
                          <ShieldCheck className="w-3 h-3 text-[#087F83]" />
                          Verified Mentor
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        Self-declared experience: <strong>{mentor.experience}</strong> · {mentor.locationLabel}
                      </div>
                    </div>
                  </div>

                  <p className="text-xs text-slate-600 mt-2.5 leading-relaxed">
                    {mentor.bio}
                  </p>

                  {mentor.mentorProfile && (
                    <div className="mt-3 space-y-2">
                      <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                        Help Topics Supported:
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {mentor.mentorProfile.topics.map((topic) => (
                          <span
                            key={topic}
                            className="px-2 py-0.5 text-[11px] rounded bg-slate-100 text-slate-700 capitalize"
                          >
                            {topic.replace('-', ' ')}
                          </span>
                        ))}
                      </div>

                      <div className="p-3 bg-[#EAF4F3]/60 rounded-lg border border-[#087F83]/15 text-xs text-slate-600 mt-2">
                        <strong className="text-[#132B3B]">Availability:</strong>{' '}
                        {mentor.mentorProfile.availabilityNotes}
                      </div>
                    </div>
                  )}
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[11px] text-slate-400">
                    Language: {mentor.mentorProfile?.preferredLanguage || 'English'}
                  </span>

                  <button
                    onClick={() => {
                      setActiveMentorToRequest(mentor);
                      setIsMentorModalOpen(true);
                    }}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-[#087F83] hover:text-white bg-[#EAF4F3] hover:bg-[#087F83] border border-[#087F83]/30 rounded-lg transition-colors cursor-pointer"
                  >
                    <HelpCircle className="w-3.5 h-3.5" />
                    <span>Ask this Mentor</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* DEMO MODE: TAB 3 — MY ACTIVITY */}
      {mode === 'demo' && activeTab === 'proposals' && (
        <div className="space-y-8">
          {/* Active Workspaces Section */}
          <section className="space-y-3">
            <h2 className="text-base font-bold text-[#132B3B] flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-[#087F83]" />
              <span>My Active Workspaces ({userWorkspaces.length})</span>
            </h2>

            {userWorkspaces.length === 0 ? (
              <div className="p-4 bg-white rounded-xl border border-slate-200 text-xs text-slate-500 italic">
                You have no active collaborative workspaces. Propose or accept a collaboration to start building together!
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {userWorkspaces.map((ws) => {
                  const proj = projects.find((p) => p.id === ws.projectId);
                  return (
                    <div
                      key={ws.id}
                      className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs hover:shadow-xs transition-shadow flex flex-col justify-between space-y-3"
                    >
                      <div>
                        <div className="flex items-center justify-between text-xs text-slate-500">
                          <span>{proj?.category}</span>
                          <span className="font-semibold text-emerald-700 capitalize">{ws.status}</span>
                        </div>
                        <h3 className="text-sm font-bold text-[#132B3B] mt-1">{proj?.name}</h3>
                        <p className="text-xs text-slate-500 line-clamp-2 mt-1">
                          Team: {ws.memberIds.map((id) => allMakers.find((m) => m.id === id)?.displayName || id).join(' & ')}
                        </p>
                      </div>

                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                        <span className="text-[11px] text-slate-400">
                          {ws.reservations.length} components reserved
                        </span>
                        <button
                          onClick={() => setLocation(`/workspaces/${ws.id}`)}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-[#087F83] hover:underline cursor-pointer"
                        >
                          <span>Open Workspace</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* Incoming Proposals */}
          <section className="space-y-3">
            <h2 className="text-base font-bold text-[#132B3B] flex items-center gap-1.5">
              <Send className="w-4 h-4 text-[#087F83]" />
              <span>Incoming Proposals for {activeUser.displayName} ({incomingProposals.length})</span>
            </h2>

            {incomingProposals.length === 0 ? (
              <div className="p-4 bg-white rounded-xl border border-slate-200 text-xs text-slate-500 italic">
                No incoming proposals for your current profile.
              </div>
            ) : (
              <div className="space-y-4">
                {incomingProposals.map((prop) => {
                  const sender = allMakers.find((m) => m.id === prop.senderId);
                  const proj = projects.find((p) => p.id === prop.projectId);

                  return (
                    <div key={prop.id} className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                          <div className="text-xs text-slate-500">Proposal from <strong>{sender?.displayName}</strong></div>
                          <h3 className="text-base font-bold text-[#132B3B]">{proj?.name}</h3>
                        </div>
                        <span className={`px-2.5 py-0.5 text-xs font-bold rounded-md self-start sm:self-center capitalize ${
                          prop.status === 'pending'
                            ? 'bg-amber-50 text-amber-800 border border-amber-200'
                            : prop.status === 'accepted'
                            ? 'bg-emerald-50 text-emerald-800'
                            : 'bg-slate-100 text-slate-700'
                        }`}>
                          {prop.status}
                        </span>
                      </div>

                      <div className="p-3 bg-slate-50 rounded-lg text-xs text-slate-700 italic">
                        "{prop.message}"
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                        <div className="p-3 rounded-lg border border-slate-200 bg-[#F7F9F8]">
                          <span className="font-bold text-slate-700 block mb-1">{sender?.displayName} offers:</span>
                          <ul className="space-y-1">
                            {prop.proposedSenderContributions.map((c, i) => (
                              <li key={i} className="text-slate-600">• {c.quantity}× {c.name}</li>
                            ))}
                          </ul>
                        </div>
                        <div className="p-3 rounded-lg border border-slate-200 bg-[#F7F9F8]">
                          <span className="font-bold text-slate-700 block mb-1">Requested from you:</span>
                          <ul className="space-y-1">
                            {prop.proposedReceiverContributions.map((c, i) => (
                              <li key={i} className="text-slate-600">• {c.quantity}× {c.name}</li>
                            ))}
                          </ul>
                        </div>
                      </div>

                      {prop.status === 'pending' && (
                        <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-3">
                          <button
                            onClick={() => onDeclineProposal(prop.id)}
                            className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-800"
                          >
                            Decline
                          </button>
                          <button
                            onClick={() => handleAccept(prop.id)}
                            className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Accept & Reserve Parts</span>
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* Outgoing Proposals */}
          <section className="space-y-3">
            <h2 className="text-base font-bold text-[#132B3B]">
              Outgoing Proposals Sent by You ({outgoingProposals.length})
            </h2>

            {outgoingProposals.length === 0 ? (
              <div className="p-4 bg-white rounded-xl border border-slate-200 text-xs text-slate-500 italic">
                You haven't sent any proposals yet. Select a project in the Project Partners tab to invite teammates!
              </div>
            ) : (
              <div className="space-y-3">
                {outgoingProposals.map((prop) => {
                  const receiver = allMakers.find((m) => m.id === prop.receiverId);
                  const proj = projects.find((p) => p.id === prop.projectId);

                  return (
                    <div
                      key={prop.id}
                      className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                    >
                      <div>
                        <div className="font-bold text-[#132B3B]">
                          {proj?.name} (Sent to {receiver?.displayName})
                        </div>
                        <div className="text-slate-500 mt-0.5">
                          Status: <strong className="capitalize">{prop.status}</strong> · Sent{' '}
                          {new Date(prop.createdAt).toLocaleDateString()}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {prop.status === 'pending' && (
                          <button
                            onClick={() => onCancelProposal(prop.id)}
                            className="text-slate-500 hover:text-rose-600 px-2.5 py-1 rounded border border-slate-200 hover:border-rose-200"
                          >
                            Cancel Proposal
                          </button>
                        )}
                        {prop.status === 'accepted' && prop.workspaceId && (
                          <button
                            onClick={() => setLocation(`/workspaces/${prop.workspaceId}`)}
                            className="text-[#087F83] font-semibold hover:underline"
                          >
                            Open Workspace →
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* Demo Mentorship Tickets */}
          <section className="space-y-3">
            <h2 className="text-base font-bold text-[#132B3B] flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-[#087F83]" />
              <span>Mentorship Tickets ({myMentorRequests.length})</span>
            </h2>

            {myMentorRequests.length === 0 ? (
              <div className="p-4 bg-white rounded-xl border border-slate-200 text-xs text-slate-500 italic">
                No active mentorship questions or tickets.
              </div>
            ) : (
              <div className="space-y-4">
                {myMentorRequests.map((req) => {
                  const isMentorForThis = req.mentorId === activeUser.id;
                  const otherParty = allMakers.find(
                    (m) => m.id === (isMentorForThis ? req.requesterId : req.mentorId)
                  );
                  const proj = projects.find((p) => p.id === req.projectId);

                  return (
                    <div key={req.id} className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                          <div className="text-xs text-slate-500">
                            {isMentorForThis ? `Question from ${otherParty?.displayName}` : `Asked to ${otherParty?.displayName}`} · {proj?.name}
                          </div>
                          <h3 className="text-sm font-bold text-[#132B3B]">{req.question}</h3>
                        </div>
                        <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-md self-start sm:self-center capitalize ${
                          req.status === 'resolved' ? 'bg-slate-100 text-slate-700' : 'bg-emerald-50 text-emerald-800'
                        }`}>
                          {req.status}
                        </span>
                      </div>

                      {req.notesOrCode && (
                        <pre className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs font-mono text-slate-700 overflow-x-auto">
                          {req.notesOrCode}
                        </pre>
                      )}

                      <div className="space-y-2 pt-2 border-t border-slate-100">
                        {req.responses.map((resp) => (
                          <div key={resp.id} className="p-3 bg-slate-50 rounded-lg text-xs space-y-1">
                            <span className="font-bold text-[#132B3B]">
                              {allMakers.find((m) => m.id === resp.authorId)?.displayName || resp.authorId}:
                            </span>
                            <p className="text-slate-600">{resp.content}</p>
                          </div>
                        ))}
                      </div>

                      {req.status !== 'resolved' && (
                        <div className="pt-2 border-t border-slate-100 flex gap-2">
                          <input
                            type="text"
                            placeholder="Type reply..."
                            value={mentorReplyText[req.id] || ''}
                            onChange={(e) =>
                              setMentorReplyText((prev) => ({
                                ...prev,
                                [req.id]: e.target.value,
                              }))
                            }
                            className="flex-1 px-3 py-1 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800"
                          />
                          <button
                            onClick={() => {
                              const text = mentorReplyText[req.id];
                              if (text && text.trim()) {
                                onRespondMentorRequest(req.id, text.trim());
                                setMentorReplyText((prev) => ({ ...prev, [req.id]: '' }));
                              }
                            }}
                            className="px-3 py-1 text-xs font-semibold text-white bg-[#087F83] rounded-lg"
                          >
                            Reply
                          </button>
                          <button
                            onClick={() => onResolveMentorRequest(req.id)}
                            className="text-xs font-semibold text-emerald-700 hover:text-emerald-900 ml-2"
                          >
                            Resolve
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      )}

      {/* Structured Real Mentorship Modal (Phase 4B1 Account Mode) */}
      {isCloudMentorModalOpen && selectedCloudMentor && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 space-y-5 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="p-1.5 bg-[#EAF4F3] text-[#087F83] rounded-lg">
                  <ShieldCheck className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="text-base font-bold text-[#132B3B]">
                    Ask Mentor: {selectedCloudMentor.displayName}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Submit a structured help ticket backed by Cloud Firestore
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsCloudMentorModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {cloudTicketError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs font-semibold text-rose-800">
                {cloudTicketError}
              </div>
            )}

            <form onSubmit={handleCreateCloudTicket} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Project Recipe Context
                </label>
                <select
                  value={cloudProjectId}
                  onChange={(e) => setCloudProjectId(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800"
                >
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Help Category
                </label>
                <select
                  value={cloudCategory}
                  onChange={(e) => setCloudCategory(e.target.value as any)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800"
                >
                  <option value="understanding-circuit">Understanding Circuit & Schematic</option>
                  <option value="troubleshooting">Troubleshooting & Signal Debugging</option>
                  <option value="programming">Firmware & Code</option>
                  <option value="testing-component">Component Verification & Testing</option>
                  <option value="choosing-components">Choosing Components & Equivalents</option>
                  <option value="planning-assembly">Planning Physical Assembly</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Describe Your Specific Question / Issue <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={3}
                  required
                  value={cloudQuestion}
                  onChange={(e) => setCloudQuestion(e.target.value)}
                  placeholder="e.g. When powering the servo, the voltage drops to 3.8V and the board brownouts. Should I add an electrolytic buffer capacitor or isolate the supply?"
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Code Snippet or Multimeter Readings (Optional)
                </label>
                <textarea
                  rows={2}
                  value={cloudNotes}
                  onChange={(e) => setCloudNotes(e.target.value)}
                  placeholder="// Paste short code snippet, pin voltage, or multimeter reading..."
                  className="w-full px-3 py-2 text-xs font-mono bg-slate-50 border border-slate-200 rounded-lg text-slate-800"
                />
              </div>

              <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl text-[11px] text-slate-600">
                <strong>Privacy Notice:</strong> Only you and {selectedCloudMentor.displayName} have read/write access to this ticket and its replies.
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCloudMentorModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-semibold text-white bg-[#087F83] hover:bg-[#066366] rounded-xl shadow-xs"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Send Ticket</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Demo Modals */}
      {activeProposalCandidate && (
        <ProposalModal
          isOpen={Boolean(activeProposalCandidate)}
          onClose={() => setActiveProposalCandidate(null)}
          project={selectedProject}
          partnerSuggestion={activeProposalCandidate}
          activeUser={activeUser}
          onSubmitProposal={(prop: CollaborationProposal) => {
            onSendProposal(prop);
            setActiveProposalCandidate(null);
            setActionSuccess(`Collaboration proposal sent to ${activeProposalCandidate.maker.displayName}!`);
            setTimeout(() => setActionSuccess(null), 4000);
          }}
        />
      )}

      {isMentorModalOpen && (
        <MentorRequestModal
          isOpen={isMentorModalOpen}
          onClose={() => setIsMentorModalOpen(false)}
          selectedMentor={activeMentorToRequest}
          allMentors={demoAvailableMentors}
          projects={projects}
          defaultProjectId={selectedProjectId}
          activeUser={activeUser}
          onSubmitRequest={(req) => {
            onSubmitMentorRequest(req);
            setIsMentorModalOpen(false);
            setActionSuccess(`Mentorship request submitted to ${activeMentorToRequest?.displayName || 'mentor'}!`);
            setTimeout(() => setActionSuccess(null), 4000);
          }}
        />
      )}

      {/* Product Expansion Modals */}
      {isExchangeModalOpen && (
        <ExchangeListingModal
          isOpen={isExchangeModalOpen}
          onClose={() => setIsExchangeModalOpen(false)}
          listings={exchangeListings}
          userInventory={userInventory}
          activeUser={activeUser}
          onPublishListing={handlePublishListing}
          onRequestListing={async (listingId) => {
            await handleUpdateExchangeStatus(listingId, 'claimed');
            setActionSuccess('Exchange claim request sent to component donor!');
            setTimeout(() => setActionSuccess(null), 4000);
          }}
          onAcceptRequest={async (listingId) => {
            await handleUpdateExchangeStatus(listingId, 'claimed');
            setActionSuccess('Claim accepted! Arrange physical pickup at safe drop box.');
            setTimeout(() => setActionSuccess(null), 4000);
          }}
          onConfirmHandover={async (listingId) => {
            await handleUpdateExchangeStatus(listingId, 'completed');
            setActionSuccess('Component handover confirmed! Reuse completed.');
            setTimeout(() => setActionSuccess(null), 4000);
          }}
          onCancelListing={async (listingId) => {
            await handleUpdateExchangeStatus(listingId, 'cancelled');
            setActionSuccess('Listing cancelled and stock released.');
            setTimeout(() => setActionSuccess(null), 4000);
          }}
        />
      )}

      {isShowcaseModalOpen && (
        <ShowcaseModal
          isOpen={isShowcaseModalOpen}
          onClose={() => setIsShowcaseModalOpen(false)}
          showcaseProjects={showcaseProjects}
          activeUser={activeUser}
          onPublishShowcase={handlePublishShowcase}
          onUnpublishShowcase={handleUnpublishShowcase}
        />
      )}

      {isModerationModalOpen && (
        <ModerationReportModal
          isOpen={isModerationModalOpen}
          onClose={() => setIsModerationModalOpen(false)}
          targetType={moderationTarget.type}
          targetId={moderationTarget.id}
          targetDisplayName={moderationTarget.displayName}
          activeUser={activeUser}
          onSubmitReport={handleSubmitModeration}
        />
      )}

      {isReviewModalOpen && (
        <InteractionReviewModal
          isOpen={isReviewModalOpen}
          onClose={() => setIsReviewModalOpen(false)}
          interactionType={reviewTarget.type}
          interactionId={reviewTarget.id}
          targetMakerId={reviewTarget.targetMakerId}
          targetMakerDisplayName={reviewTarget.targetMakerDisplayName}
          activeUser={activeUser}
          onSubmitReview={handleSubmitReview}
        />
      )}
    </div>
  );
}
