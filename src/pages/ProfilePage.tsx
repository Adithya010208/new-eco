/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  UserProfile,
  ProjectDifficulty,
  DiscoverableMakerProfile,
  CollaborationPreference,
  MentorshipHelpCategory,
  MakerProfile,
  ComponentItem,
  EcoPointTransaction,
  CompletedProjectRecord,
  ReuseLedgerEntry,
} from '../types';
import { AppMode } from '../contexts/AuthContext';
import { FirestoreAdapter } from '../services/firestoreAdapter';
import { StorageService } from '../services/storageService';
import { InstitutionalPilotSection } from '../components/profile/InstitutionalPilotSection';
import { Modal } from '../components/common/Modal';
import { LanguageSelector } from '../components/common/LanguageSelector';
import {
  calculateEcoRank,
  calculateBuilderRank,
  evaluateBadges,
  BADGE_DEFINITIONS,
} from '../utils/gamification';
import {
  User,
  Check,
  Shield,
  RotateCcw,
  Sparkles,
  Info,
  Clock,
  Compass,
  Cloud,
  CheckCircle2,
  Globe,
  Eye,
  EyeOff,
  Lock,
  HelpCircle,
  AlertTriangle,
  Send,
  Plus,
  X,
  Trophy,
  Award,
  Leaf,
  Scale,
  Wrench,
  Layers,
  ShieldCheck,
  Activity,
} from 'lucide-react';

interface ProfilePageProps {
  profile: UserProfile;
  onSaveProfile: (profile: UserProfile) => void;
  onOpenResetDemo: () => void;
  mode?: AppMode;
  googleUser?: {
    uid?: string;
    email?: string | null;
    photoURL?: string | null;
    emailVerified?: boolean;
    displayName?: string | null;
  } | null;
  activeUser?: MakerProfile;
  userInventory?: ComponentItem[];
  userLedgerCount?: number;
  userLedgerEntries?: ReuseLedgerEntry[];
  userCompletedProjects?: CompletedProjectRecord[];
}

const AVAILABLE_INTERESTS = [
  { id: 'robotics', label: 'Robotics' },
  { id: 'home automation', label: 'Home Automation' },
  { id: 'learning electronics', label: 'Learning Electronics' },
  { id: 'environmental monitoring', label: 'Environmental Monitoring' },
  { id: 'creative projects', label: 'Creative Projects' },
];

const MENTOR_TOPICS: { id: MentorshipHelpCategory; label: string }[] = [
  { id: 'choosing-components', label: 'Choosing Components & Equivalents' },
  { id: 'understanding-circuit', label: 'Understanding Circuit Schematics' },
  { id: 'programming', label: 'Firmware & Arduino Programming' },
  { id: 'testing-component', label: 'Component Testing & Verification' },
  { id: 'troubleshooting', label: 'Circuit Troubleshooting' },
  { id: 'planning-assembly', label: 'Planning Physical Assembly' },
];

function renderProfileBadgeIcon(iconName: string) {
  switch (iconName) {
    case 'Leaf':
      return <Leaf className="w-4 h-4 text-emerald-600" />;
    case 'Scale':
      return <Scale className="w-4 h-4 text-teal-600" />;
    case 'Award':
      return <Award className="w-4 h-4 text-amber-500" />;
    case 'Wrench':
      return <Wrench className="w-4 h-4 text-blue-600" />;
    case 'Layers':
      return <Layers className="w-4 h-4 text-purple-600" />;
    case 'Sparkles':
      return <Sparkles className="w-4 h-4 text-amber-500" />;
    case 'Users':
      return <User className="w-4 h-4 text-indigo-600" />;
    case 'ShieldCheck':
      return <ShieldCheck className="w-4 h-4 text-emerald-600" />;
    case 'RotateCcw':
      return <RotateCcw className="w-4 h-4 text-emerald-600" />;
    default:
      return <Award className="w-4 h-4 text-teal-600" />;
  }
}

export function ProfilePage({
  profile,
  onSaveProfile,
  onOpenResetDemo,
  mode = 'demo',
  googleUser,
  activeUser,
  userInventory = [],
  userLedgerCount = 0,
  userLedgerEntries = [],
  userCompletedProjects = [],
}: ProfilePageProps) {
  const { t } = useTranslation();
  const [displayName, setDisplayName] = useState(profile.displayName);
  const [experience, setExperience] = useState<'Beginner' | 'Intermediate' | 'Advanced'>(
    profile.experience
  );
  const [preferredDifficulty, setPreferredDifficulty] =
    useState<ProjectDifficulty>(profile.preferredDifficulty);
  const [interests, setInterests] = useState<string[]>(profile.interests);
  const [availableTime, setAvailableTime] = useState(profile.availableTime);
  const [preferredLanguage, setPreferredLanguage] = useState<'en' | 'ta' | 'hi'>(
    (profile as any).preferredLanguage || 'en'
  );
  const [isSavedBanner, setIsSavedBanner] = useState(false);

  // Discoverable Maker Profile state (Phase 4B1)
  const [isDiscoverable, setIsDiscoverable] = useState(false);
  const [bio, setBio] = useState('Sustainable maker reusing salvaged electronics.');
  const [skills, setSkills] = useState<string[]>([
    'circuit prototyping',
    'breadboard wiring',
  ]);
  const [newSkillText, setNewSkillText] = useState('');
  const [collaborationPreference, setCollaborationPreference] =
    useState<CollaborationPreference>('Open to team builds');
  const [isMentor, setIsMentor] = useState(false);
  const [mentorTopics, setMentorTopics] = useState<MentorshipHelpCategory[]>([
    'choosing-components',
    'understanding-circuit',
  ]);
  const [mentorAvailabilityNotes, setMentorAvailabilityNotes] = useState(
    'Available for questions on weekday evenings (1-2 hr turnaround).'
  );
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [discoverableStatusMsg, setDiscoverableStatusMsg] = useState<string | null>(null);
  const [isSavingDiscoverable, setIsSavingDiscoverable] = useState(false);

  // Gamification & Real Metrics State (Phase 2, 3, 5, 6)
  const [ecoTransactions, setEcoTransactions] = useState<EcoPointTransaction[]>([]);
  const [completedProjects, setCompletedProjects] = useState<CompletedProjectRecord[]>([]);
  const [ledgerEntries, setLedgerEntries] = useState<ReuseLedgerEntry[]>([]);
  const [showEcoModal, setShowEcoModal] = useState(false);

  const effectiveUserId = mode === 'account' ? googleUser?.uid : (activeUser?.id || 'maker-adithya');

  useEffect(() => {
    if (mode === 'account' && googleUser?.uid) {
      const unsubTx = FirestoreAdapter.subscribeToEcoPointTransactions(googleUser.uid, (txs) => setEcoTransactions(txs));
      const unsubCp = FirestoreAdapter.subscribeToCompletedProjects(googleUser.uid, (cps) => setCompletedProjects(cps));
      const unsubLd = FirestoreAdapter.subscribeToReuseLedger(googleUser.uid, (entries) => setLedgerEntries(entries));
      return () => {
        unsubTx();
        unsubCp();
        unsubLd();
      };
    } else {
      setEcoTransactions(StorageService.getEcoPointTransactions(effectiveUserId));
      setCompletedProjects(StorageService.getCompletedProjects(effectiveUserId));
      setLedgerEntries(StorageService.getReuseLedger(effectiveUserId));

      const handleStorageUpdate = () => {
        setEcoTransactions(StorageService.getEcoPointTransactions(effectiveUserId));
        setCompletedProjects(StorageService.getCompletedProjects(effectiveUserId));
        setLedgerEntries(StorageService.getReuseLedger(effectiveUserId));
      };
      window.addEventListener('storage', handleStorageUpdate);
      return () => window.removeEventListener('storage', handleStorageUpdate);
    }
  }, [mode, googleUser?.uid, effectiveUserId]);

  const totalEcoPoints = useMemo(() => {
    return ecoTransactions.reduce((acc, t) => acc + (t.points || 0), 0);
  }, [ecoTransactions]);

  const ecoRank = useMemo(() => calculateEcoRank(totalEcoPoints), [totalEcoPoints]);
  const builderRank = useMemo(() => calculateBuilderRank(completedProjects.length), [completedProjects.length]);

  const evaluatedBadges = useMemo(() => {
    return evaluateBadges({
      ecoPoints: totalEcoPoints,
      inventory: userInventory,
      ledgerEntries,
      completedProjects,
      isMentor,
    });
  }, [totalEcoPoints, userInventory, ledgerEntries, completedProjects, isMentor]);

  const componentsReusedCount = useMemo(() => {
    return ledgerEntries.reduce(
      (sum, e) => sum + (e.allocatedItems || []).reduce((acc, i) => acc + (i.quantity || 1), 0),
      0
    ) || (userInventory.length > 2 ? userInventory.length : 0);
  }, [ledgerEntries, userInventory]);

  const totalDivertedMassGrams = useMemo(() => {
    return ledgerEntries.reduce((sum, e) => sum + (e.unitMassGrams || 0), 0) || (componentsReusedCount * 30);
  }, [ledgerEntries, componentsReusedCount]);

  // Sync internal state when profile prop changes
  useEffect(() => {
    setDisplayName(profile.displayName);
    setExperience(profile.experience);
    setPreferredDifficulty(profile.preferredDifficulty);
    setInterests(profile.interests);
    setAvailableTime(profile.availableTime);
    if ((profile as any).preferredLanguage) {
      setPreferredLanguage((profile as any).preferredLanguage);
    }
  }, [profile]);

  // Load existing discoverable profile in Account Mode
  useEffect(() => {
    if (mode === 'account' && googleUser?.uid) {
      FirestoreAdapter.getDiscoverableProfile(googleUser.uid)
        .then((existing) => {
          if (existing) {
            setIsDiscoverable(Boolean(existing.isDiscoverable));
            if (existing.bio) setBio(existing.bio);
            if (existing.skills && existing.skills.length > 0) setSkills(existing.skills);
            if (existing.collaborationPreference)
              setCollaborationPreference(existing.collaborationPreference);
            setIsMentor(Boolean(existing.isMentor));
            if (existing.mentorTopics) setMentorTopics(existing.mentorTopics);
            if (existing.mentorAvailabilityNotes)
              setMentorAvailabilityNotes(existing.mentorAvailabilityNotes);
          }
        })
        .catch((err) => {
          console.warn('[EcoBuild] Could not load discoverable profile:', err);
        });
    }
  }, [mode, googleUser?.uid]);

  const toggleInterest = (interestId: string) => {
    if (interests.includes(interestId)) {
      setInterests(interests.filter((i) => i !== interestId));
    } else {
      setInterests([...interests, interestId]);
    }
  };

  const toggleMentorTopic = (topicId: MentorshipHelpCategory) => {
    if (mentorTopics.includes(topicId)) {
      setMentorTopics(mentorTopics.filter((t) => t !== topicId));
    } else {
      setMentorTopics([...mentorTopics, topicId]);
    }
  };

  const handleAddSkill = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newSkillText.trim();
    if (trimmed && !skills.includes(trimmed) && skills.length < 20) {
      setSkills([...skills, trimmed]);
      setNewSkillText('');
    }
  };

  const handleRemoveSkill = (skill: string) => {
    setSkills(skills.filter((s) => s !== skill));
  };

  const handleSavePrivatePreferences = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveProfile({
      displayName: displayName.trim() || 'Maker',
      experience,
      interests: interests.length > 0 ? interests : ['learning electronics'],
      preferredDifficulty,
      availableTime,
      hasCompletedOnboarding: true,
    });
    setIsSavedBanner(true);
    setTimeout(() => setIsSavedBanner(false), 3000);
  };

  const handlePublishDiscoverable = async (publish: boolean) => {
    if (mode !== 'account' || !googleUser?.uid) {
      setDiscoverableStatusMsg('Sign in to Account Mode to publish a discoverable cloud profile.');
      setTimeout(() => setDiscoverableStatusMsg(null), 4000);
      return;
    }

    setIsSavingDiscoverable(true);
    try {
      const updatedProfile: DiscoverableMakerProfile = {
        uid: googleUser.uid,
        displayName: displayName.trim() || 'Maker',
        photoURL: googleUser.photoURL || null,
        bio: bio.trim(),
        experience,
        interests,
        skills,
        collaborationPreference,
        isDiscoverable: publish,
        isMentor,
        mentorTopics: isMentor ? mentorTopics : [],
        mentorAvailabilityNotes: isMentor ? mentorAvailabilityNotes : undefined,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await FirestoreAdapter.saveDiscoverableProfile(googleUser.uid, updatedProfile);
      setIsDiscoverable(publish);
      setDiscoverableStatusMsg(
        publish
          ? 'Profile published to the Real Maker Network! Other signed-in makers can now discover you.'
          : 'Profile unpublished. You are now hidden from the Maker Network directory.'
      );
    } catch (err: any) {
      setDiscoverableStatusMsg(`Error: ${err?.message || 'Could not update discoverable profile.'}`);
    } finally {
      setIsSavingDiscoverable(false);
      setTimeout(() => setDiscoverableStatusMsg(null), 5000);
    }
  };

  return (
    <div className="max-w-4xl space-y-8 pb-16">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span
            className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${
              mode === 'account'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                : 'bg-amber-50 text-amber-800 border-amber-300'
            }`}
          >
            {mode === 'account' ? 'Cloud Account Mode' : 'Local Demo Mode'}
          </span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-[#132B3B]">
          {mode === 'account'
            ? 'Account Profile & Maker Directory Settings'
            : 'Profile & Maker Preferences'}
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Manage your private workbench preferences and opt into the discoverable maker network.
        </p>
      </div>

      {/* Mode-Specific Status Notice */}
      {mode === 'account' ? (
        <div className="p-4 bg-emerald-50/80 border border-emerald-200 rounded-xl space-y-3">
          <div className="flex items-start gap-3">
            {googleUser?.photoURL ? (
              <img
                src={googleUser.photoURL}
                alt={displayName}
                className="w-10 h-10 rounded-full object-cover border border-emerald-300 shrink-0 mt-0.5"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-[#087F83] text-white flex items-center justify-center font-bold shrink-0 mt-0.5">
                {displayName.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="text-xs text-slate-700 space-y-1 flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-[#132B3B] text-sm">{displayName}</span>
                <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-800 bg-white px-2 py-0.5 rounded border border-emerald-300">
                  <Cloud className="w-3 h-3 text-emerald-600" />
                  Cloud Firestore Active
                </span>
                <span
                  className={`inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded border ${
                    isDiscoverable
                      ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                      : 'bg-slate-100 text-slate-700 border-slate-300'
                  }`}
                >
                  <Globe className="w-3 h-3" />
                  {isDiscoverable ? 'Discoverable in Directory' : 'Private (Unpublished)'}
                </span>
              </div>
              {googleUser?.email && (
                <div className="text-slate-600 flex items-center gap-1.5 flex-wrap">
                  <span>{googleUser.email}</span>
                  <span className="text-[10px] text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
                    Google Identity Authenticated
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Self-Reported Skills & Certification Disclaimer Banner */}
          <div className="pt-2.5 border-t border-emerald-200/60 text-[11px] text-slate-600 space-y-1.5">
            <div className="font-semibold text-[#132B3B] flex items-center gap-1">
              <Info className="w-3.5 h-3.5 text-[#087F83]" />
              <span>Identity & Skill Certification Notice</span>
            </div>
            <p className="leading-relaxed text-slate-500">
              <strong>Account Authentication:</strong> Google sign-in confirms ownership of your email address for cloud workbench storage. It does not certify electronics proficiency, safety compliance, or hardware expertise.
            </p>
            <p className="leading-relaxed text-slate-500">
              <strong>Self-Reported Skills:</strong> Maker interests, experience levels, and mentorship topics are self-reported. Real tests must be physically verified on the workbench.
            </p>
          </div>
        </div>
      ) : (
        <div className="p-4 bg-[#EAF4F3] border border-[#087F83]/20 rounded-xl flex items-start gap-3">
          <Info className="w-5 h-5 text-[#087F83] shrink-0 mt-0.5" />
          <div className="text-xs text-slate-700 space-y-1">
            <p className="font-semibold text-[#132B3B]">Browser Local Session (Demo Mode)</p>
            <p className="leading-relaxed">
              You are exploring fictional maker identities. Sign in with Google anytime to switch to Account Mode and publish your real discoverable profile.
            </p>
          </div>
        </div>
      )}

      {/* Notifications */}
      {isSavedBanner && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-xs font-semibold text-emerald-800">
          <Check className="w-4 h-4 text-emerald-600" />
          <span>Private preferences successfully updated and saved to Cloud Firestore!</span>
        </div>
      )}
      {discoverableStatusMsg && (
        <div className="p-3 bg-teal-50 border border-teal-200 rounded-xl flex items-center gap-2 text-xs font-semibold text-teal-900">
          <Info className="w-4 h-4 text-teal-600" />
          <span>{discoverableStatusMsg}</span>
        </div>
      )}

      {/* ======================================================== */}
      {/* SECTION 0: CIRCULAR MAKER PORTFOLIO & ACHIEVEMENTS       */}
      {/* ======================================================== */}
      <section className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-2xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-bold text-[#087F83] uppercase tracking-wider mb-1">
              <Award className="w-3.5 h-3.5" />
              <span>Verified Circular Credentials & Achievements</span>
            </div>
            <h2 className="text-xl font-bold text-[#132B3B]">
              Maker Portfolio & Verified Credentials
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Empirically calculated metrics from verified physical workbench builds, hardware reuse, and peer collaborations.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowEcoModal(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-[#087F83] bg-[#EAF4F3] hover:bg-[#087F83] hover:text-white rounded-xl transition-colors cursor-pointer"
            >
              <Activity className="w-3.5 h-3.5" />
              <span>View Points Ledger</span>
            </button>
          </div>
        </div>

        {/* 4 Metric Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl bg-gradient-to-br from-emerald-50/60 to-teal-50/30 border border-emerald-200/60 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800">
                Eco Points
              </span>
              <Leaf className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-2xl font-extrabold text-[#132B3B] font-mono">
              {totalEcoPoints} <span className="text-xs font-normal text-slate-500 font-sans">pts</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                {ecoRank}
              </span>
              <span className="text-[10px] text-slate-400">Circularity Tier</span>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-gradient-to-br from-blue-50/60 to-indigo-50/30 border border-blue-200/60 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-blue-800">
                Builder Progress
              </span>
              <Wrench className="w-4 h-4 text-blue-600" />
            </div>
            <div className="text-2xl font-extrabold text-[#132B3B] font-mono">
              {completedProjects.length} <span className="text-xs font-normal text-slate-500 font-sans">builds</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800">
                {builderRank}
              </span>
              <span className="text-[10px] text-slate-400">Craft Rank</span>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-gradient-to-br from-purple-50/60 to-pink-50/30 border border-purple-200/60 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-purple-800">
                Components Reused
              </span>
              <RotateCcw className="w-4 h-4 text-purple-600" />
            </div>
            <div className="text-2xl font-extrabold text-[#132B3B] font-mono">
              {componentsReusedCount} <span className="text-xs font-normal text-slate-500 font-sans">units</span>
            </div>
            <div className="text-[10px] text-slate-500">
              Circulated across projects & stock
            </div>
          </div>

          <div className="p-4 rounded-xl bg-gradient-to-br from-teal-50/60 to-emerald-50/30 border border-teal-200/60 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-teal-800">
                Diverted Mass
              </span>
              <Scale className="w-4 h-4 text-[#087F83]" />
            </div>
            <div className="text-2xl font-extrabold text-[#132B3B] font-mono">
              {totalDivertedMassGrams} <span className="text-xs font-normal text-slate-500 font-sans">g</span>
            </div>
            <div className="text-[10px] text-slate-500">
              Direct physical e-waste prevented
            </div>
          </div>
        </div>

        {/* Badges Grid */}
        <div className="pt-2 border-t border-slate-100 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-[#132B3B] flex items-center gap-2">
              <Trophy className="w-4 h-4 text-amber-500" />
              <span>Verified Badges</span>
              <span className="text-xs font-normal text-slate-500">
                ({evaluatedBadges.filter((b) => b.unlocked).length} of {evaluatedBadges.length} Unlocked)
              </span>
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {evaluatedBadges.map((badge) => (
              <div
                key={badge.id}
                className={`p-3.5 rounded-xl border transition-all ${
                  badge.unlocked
                    ? 'bg-white border-emerald-200 shadow-2xs ring-1 ring-emerald-500/20'
                    : 'bg-slate-50/80 border-slate-200/80 opacity-75'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`p-2 rounded-xl shrink-0 ${
                      badge.unlocked
                        ? 'bg-emerald-50 border border-emerald-200/80'
                        : 'bg-slate-100 border border-slate-200'
                    }`}
                  >
                    {renderProfileBadgeIcon(badge.iconName)}
                  </div>
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center justify-between gap-1">
                      <h4 className="text-xs font-bold text-[#132B3B] truncate">{badge.name}</h4>
                      {badge.unlocked ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-100/80 px-1.5 py-0.5 rounded">
                          <Check className="w-2.5 h-2.5" /> Unlocked
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] text-slate-500 bg-slate-200/70 px-1.5 py-0.5 rounded">
                          <Lock className="w-2.5 h-2.5" /> Locked
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">
                      {badge.description}
                    </p>
                    {/* Progress Bar */}
                    <div className="pt-1 space-y-0.5">
                      <div className="flex items-center justify-between text-[10px] text-slate-400">
                        <span>{badge.conditionDescription}</span>
                        <span className="font-mono font-medium">
                          {badge.currentProgress}/{badge.maxProgress}
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            badge.unlocked ? 'bg-emerald-500' : 'bg-[#087F83]'
                          }`}
                          style={{ width: `${Math.min(100, badge.progressPercent)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Verified Workbench Builds (Showcase) */}
        {completedProjects.length > 0 && (
          <div className="pt-2 border-t border-slate-100 space-y-3">
            <h3 className="text-sm font-bold text-[#132B3B] flex items-center gap-2">
              <Layers className="w-4 h-4 text-blue-600" />
              <span>Verified Workbench Builds ({completedProjects.length})</span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {completedProjects.map((cp) => (
                <div
                  key={cp.id}
                  className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white transition-colors space-y-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="text-xs font-bold text-[#132B3B]">{cp.projectTitle}</h4>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        Completed {new Date(cp.completedAt).toLocaleDateString()}
                      </p>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200/60">
                      {cp.difficulty}
                    </span>
                  </div>
                  {cp.notes && (
                    <p className="text-[11px] text-slate-600 italic line-clamp-2">
                      "{cp.notes}"
                    </p>
                  )}
                  <div className="flex items-center gap-3 text-[10px] text-slate-500 pt-1 border-t border-slate-200/50">
                    <span className="inline-flex items-center gap-1 font-medium text-emerald-700">
                      <CheckCircle2 className="w-3 h-3" />
                      {cp.result || cp.buildResult || 'working'}
                    </span>
                    <span>•</span>
                    <span>{cp.componentsReusedCount || cp.reusedComponentsCount || 0} parts reused</span>
                    <span>•</span>
                    <span>{cp.totalMassGrams || cp.hardwareMassGrams || 0}g diverted</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Eco Points Ledger Modal */}
      <Modal
        isOpen={showEcoModal}
        onClose={() => setShowEcoModal(false)}
        title="Verified Eco Points History"
        maxWidth="max-w-2xl"
      >
        <div className="space-y-4">
          <div className="p-3 bg-[#EAF4F3] border border-[#087F83]/20 rounded-xl flex items-center justify-between text-xs">
            <div>
              <span className="font-bold text-[#132B3B]">Total Verified Points:</span>{' '}
              <span className="font-extrabold text-[#087F83] font-mono text-sm">{totalEcoPoints} pts</span>
            </div>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#087F83] text-white">
              {ecoRank}
            </span>
          </div>

          <div className="max-h-96 overflow-y-auto divide-y divide-slate-100">
            {ecoTransactions.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">
                No Eco Point transactions recorded yet. Complete physical builds or exchanges to earn points!
              </div>
            ) : (
              ecoTransactions.map((tx) => (
                <div key={tx.id} className="py-3 flex items-start justify-between gap-3 text-xs">
                  <div className="space-y-0.5">
                    <div className="font-semibold text-slate-800">{tx.reason}</div>
                    <div className="flex items-center gap-2 text-[10px] text-slate-400">
                      <span className="capitalize">{tx.eventType.replace(/-/g, ' ')}</span>
                      <span>•</span>
                      <span>{new Date(tx.createdAt).toLocaleDateString()}</span>
                      {tx.verificationSource && (
                        <>
                          <span>•</span>
                          <span className="font-mono text-emerald-700">{tx.verificationSource}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="font-extrabold font-mono text-emerald-600">
                      +{tx.points}
                    </span>
                    <span className="text-[10px] text-slate-400 ml-1">pts</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </Modal>

      {/* ======================================================== */}
      {/* SECTION 1: DISCOVERABLE MAKER PROFILE (PHASE 4B1)        */}
      {/* ======================================================== */}
      <section className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-2xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-bold text-[#087F83] uppercase tracking-wider mb-1">
              <Globe className="w-3.5 h-3.5" />
              <span>Phase 4B1: Discoverable Maker Profile</span>
            </div>
            <h2 className="text-lg font-bold text-[#132B3B]">
              Public Maker Network Card
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Allow other signed-in makers to discover you for peer builds and mentorship.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowPreviewModal(!showPreviewModal)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#087F83] bg-[#EAF4F3] hover:bg-[#087F83] hover:text-white rounded-lg transition-colors cursor-pointer"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>{showPreviewModal ? 'Hide Preview' : 'Preview Public Card'}</span>
            </button>
          </div>
        </div>

        {/* Discovery Default Status Notice */}
        <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex items-start gap-2.5 text-xs text-slate-600">
          <Lock className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="font-bold text-[#132B3B]">
              Privacy By Default Guarantee:
            </span>
            <p className="leading-relaxed">
              Discovery is <strong>disabled by default</strong>. Your private inventory, email address, exact location, and private bookmarks are NEVER made public or shared in the directory. Only the fields explicitly configured below are visible to signed-in users.
            </p>
          </div>
        </div>

        {/* Live Preview Card */}
        {showPreviewModal && (
          <div className="p-5 bg-gradient-to-br from-[#F7F9F8] to-[#EAF4F3]/40 border-2 border-dashed border-[#087F83]/40 rounded-xl space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#087F83] flex items-center gap-1">
                <Eye className="w-3.5 h-3.5" /> Live Preview: What Other Signed-In Makers See
              </span>
              <span className="text-[10px] text-slate-400 bg-white px-2 py-0.5 rounded border border-slate-200">
                Read-Only Preview
              </span>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  {googleUser?.photoURL ? (
                    <img
                      src={googleUser.photoURL}
                      alt={displayName}
                      className="w-12 h-12 rounded-full object-cover border border-slate-200"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-[#087F83] text-white flex items-center justify-center font-bold text-lg">
                      {displayName.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <h3 className="text-base font-bold text-[#132B3B]">{displayName}</h3>
                    <div className="text-xs text-slate-500 mt-0.5">
                      {experience} Maker · {collaborationPreference}
                    </div>
                  </div>
                </div>

                {isMentor && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#087F83] bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                    <Shield className="w-3 h-3 text-[#087F83]" />
                    Opted-In Mentor
                  </span>
                )}
              </div>

              <p className="text-xs text-slate-600 leading-relaxed italic">
                "{bio || 'No bio provided yet.'}"
              </p>

              {/* Skills and interests tags */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <div className="flex flex-wrap gap-1.5 items-center">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mr-1">
                    Skills:
                  </span>
                  {skills.length === 0 ? (
                    <span className="text-xs text-slate-400 italic">None added</span>
                  ) : (
                    skills.map((s, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 text-[11px] bg-slate-100 text-slate-700 rounded font-medium"
                      >
                        {s}
                      </span>
                    ))
                  )}
                </div>

                <div className="flex flex-wrap gap-1.5 items-center">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mr-1">
                    Interests:
                  </span>
                  {interests.map((i, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-0.5 text-[11px] bg-emerald-50 text-emerald-800 border border-emerald-200 rounded font-medium capitalize"
                    >
                      {i}
                    </span>
                  ))}
                </div>

                {isMentor && (
                  <div className="mt-2 p-3 bg-emerald-50/60 rounded-lg border border-emerald-200 text-xs text-slate-700 space-y-1">
                    <span className="font-bold text-[#132B3B] block">
                      Mentorship Topics Offered:
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {mentorTopics.map((t) => (
                        <span
                          key={t}
                          className="px-2 py-0.5 text-[10px] bg-white rounded border border-emerald-200 capitalize font-medium"
                        >
                          {t.replace('-', ' ')}
                        </span>
                      ))}
                    </div>
                    {mentorAvailabilityNotes && (
                      <div className="text-[11px] text-slate-500 pt-1">
                        <strong>Availability:</strong> {mentorAvailabilityNotes}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Privacy verification guarantee badge */}
              <div className="pt-2 text-[11px] text-slate-500 flex flex-wrap items-center gap-3">
                <span className="flex items-center gap-1 text-emerald-700 font-medium">
                  <Check className="w-3.5 h-3.5 text-emerald-600" /> Email withheld
                </span>
                <span className="flex items-center gap-1 text-emerald-700 font-medium">
                  <Check className="w-3.5 h-3.5 text-emerald-600" /> Private inventory hidden
                </span>
                <span className="flex items-center gap-1 text-emerald-700 font-medium">
                  <Check className="w-3.5 h-3.5 text-emerald-600" /> Visible to signed-in makers only
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Bio field */}
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
            Public Bio / Intro (Max 500 characters)
          </label>
          <textarea
            rows={3}
            maxLength={500}
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Share your electronics background, recent salvage builds, and what kind of projects you enjoy collaborating on..."
            className="w-full px-3.5 py-2.5 text-xs bg-slate-50 focus:bg-white border border-slate-200 rounded-lg text-slate-800 focus:border-[#087F83] transition-colors"
          />
          <div className="text-[11px] text-slate-400 mt-1 flex justify-between">
            <span>Visible to other signed-in makers when published.</span>
            <span>{bio.length}/500</span>
          </div>
        </div>

        {/* Maker Skills Tags */}
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
            Self-Reported Skills & Specialties
          </label>
          <div className="flex flex-wrap gap-1.5 mb-2.5">
            {skills.map((skill, idx) => (
              <span
                key={idx}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs bg-slate-100 text-slate-700 rounded-lg font-medium"
              >
                <span>{skill}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveSkill(skill)}
                  className="text-slate-400 hover:text-rose-600"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>

          <div className="flex gap-2 max-w-md">
            <input
              type="text"
              placeholder="e.g. Soldering, ESP32, 3D CAD, I2C debugging..."
              value={newSkillText}
              onChange={(e) => setNewSkillText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddSkill(e);
                }
              }}
              className="flex-1 px-3 py-1.5 text-xs bg-slate-50 focus:bg-white border border-slate-200 rounded-lg text-slate-800"
            />
            <button
              type="button"
              onClick={handleAddSkill}
              className="px-3 py-1.5 text-xs font-semibold text-[#087F83] bg-[#EAF4F3] hover:bg-[#087F83] hover:text-white rounded-lg transition-colors cursor-pointer"
            >
              Add Skill
            </button>
          </div>
        </div>

        {/* Collaboration Preference */}
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
            Collaboration Preference
          </label>
          <select
            value={collaborationPreference}
            onChange={(e) => setCollaborationPreference(e.target.value as any)}
            className="w-full max-w-md px-3.5 py-2.5 text-xs bg-slate-50 focus:bg-white border border-slate-200 rounded-lg text-slate-800 focus:border-[#087F83]"
          >
            <option value="Open to team builds">Open to team builds (hardware & code sharing)</option>
            <option value="Mentoring only">Mentoring only (advice and circuit review)</option>
            <option value="Project-specific">Project-specific (only on matching recipes)</option>
            <option value="Solo maker">Solo maker (showcase only, no team requests)</option>
          </select>
        </div>

        {/* Mentorship Opt-In Controls */}
        <div className="pt-4 border-t border-slate-100 space-y-4">
          <div className="flex items-start gap-3">
            <input
              type="checkbox"
              id="isMentorToggle"
              checked={isMentor}
              onChange={(e) => setIsMentor(e.target.checked)}
              className="mt-0.5 rounded border-slate-300 text-[#087F83] focus:ring-[#087F83]"
            />
            <label htmlFor="isMentorToggle" className="cursor-pointer">
              <span className="font-bold text-xs text-[#132B3B] block">
                Opt in as a Peer & Lab Mentor
              </span>
              <span className="text-[11px] text-slate-500 leading-normal block">
                Allow beginners and fellow makers to send you structured mentorship help tickets on specific project stages. You can decline or accept tickets at any time.
              </span>
            </label>
          </div>

          {isMentor && (
            <div className="pl-6 space-y-4 pt-2">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-2">
                  Select Mentoring Help Topics You Are Comfortable Supporting:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {MENTOR_TOPICS.map((topic) => {
                    const isChecked = mentorTopics.includes(topic.id);
                    return (
                      <button
                        type="button"
                        key={topic.id}
                        onClick={() => toggleMentorTopic(topic.id)}
                        className={`p-2.5 text-left text-xs rounded-lg border transition-colors cursor-pointer flex items-center justify-between ${
                          isChecked
                            ? 'bg-emerald-50 border-emerald-300 text-emerald-950 font-medium'
                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        <span>{topic.label}</span>
                        {isChecked ? (
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                        ) : (
                          <span className="w-3.5 h-3.5 rounded border border-slate-300" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Availability Notes (e.g. response cadence, preferred topics):
                </label>
                <input
                  type="text"
                  maxLength={300}
                  value={mentorAvailabilityNotes}
                  onChange={(e) => setMentorAvailabilityNotes(e.target.value)}
                  placeholder="e.g. 1-2 day turnaround; prefer circuit debugging questions..."
                  className="w-full max-w-lg px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800"
                />
              </div>
            </div>
          )}
        </div>

        {/* Publish / Unpublish Actions */}
        <div className="pt-6 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-slate-500">
            {isDiscoverable ? (
              <span className="text-emerald-700 font-semibold flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5" /> Published and discoverable in Maker Directory
              </span>
            ) : (
              <span className="text-slate-400 flex items-center gap-1.5">
                <EyeOff className="w-3.5 h-3.5" /> Currently hidden from Maker Directory
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {isDiscoverable && (
              <button
                type="button"
                disabled={isSavingDiscoverable}
                onClick={() => handlePublishDiscoverable(false)}
                className="px-3.5 py-2 text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
              >
                Unpublish Profile
              </button>
            )}

            <button
              type="button"
              disabled={isSavingDiscoverable}
              onClick={() => handlePublishDiscoverable(true)}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 text-xs font-semibold text-white bg-[#087F83] hover:bg-[#066366] rounded-xl shadow-xs transition-colors cursor-pointer disabled:opacity-50"
            >
              <Globe className="w-3.5 h-3.5" />
              <span>
                {isSavingDiscoverable
                  ? 'Saving...'
                  : isDiscoverable
                  ? 'Update Published Profile'
                  : 'Publish to Maker Network'}
              </span>
            </button>
          </div>
        </div>
      </section>

      {/* ======================================================== */}
      {/* SECTION 2: PRIVATE PREFERENCES & RANKING WEIGHTS         */}
      {/* ======================================================== */}
      <form
        onSubmit={handleSavePrivatePreferences}
        className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-2xs space-y-6"
      >
        <div className="pb-4 border-b border-slate-100">
          <h2 className="text-lg font-bold text-[#132B3B]">
            Private Recommendation Preferences
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure how recipes and potential hardware matches are scored and ordered for you.
          </p>
        </div>

        {/* Display Name */}
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
            Display Name
          </label>
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="w-full max-w-md px-3.5 py-2.5 text-sm bg-slate-50 focus:bg-white border border-slate-200 rounded-lg text-slate-800 focus:border-[#087F83] transition-colors"
          />
        </div>

        {/* Experience Level */}
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
            Electronics Experience Level
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {(['Beginner', 'Intermediate', 'Advanced'] as const).map((lvl) => (
              <button
                type="button"
                key={lvl}
                onClick={() => setExperience(lvl)}
                className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                  experience === lvl
                    ? 'border-[#087F83] bg-[#EAF4F3] text-[#132B3B]'
                    : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-600'
                }`}
              >
                <div className="text-sm font-bold">{lvl}</div>
                <div className="text-[11px] text-slate-500 mt-1">
                  {lvl === 'Beginner' && 'Breadboards, LEDs, basic Arduino sketches.'}
                  {lvl === 'Intermediate' && 'I2C displays, sensor integration, state logic.'}
                  {lvl === 'Advanced' && 'Custom drivers, RTOS, robotics kinematics.'}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Preferred Project Difficulty */}
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
            Preferred Recipe Difficulty
          </label>
          <div className="flex flex-wrap gap-2.5">
            {(['Beginner', 'Intermediate', 'Advanced'] as const).map((diff) => (
              <button
                type="button"
                key={diff}
                onClick={() => setPreferredDifficulty(diff)}
                className={`px-4 py-2 text-xs font-semibold rounded-lg border transition-colors cursor-pointer ${
                  preferredDifficulty === diff
                    ? 'bg-[#087F83] text-white border-[#087F83]'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                {diff}
              </button>
            ))}
          </div>
        </div>

        {/* Topic Interests */}
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
            Maker Interests (Select all that apply)
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {AVAILABLE_INTERESTS.map((interest) => {
              const isSelected = interests.includes(interest.id);
              return (
                <button
                  type="button"
                  key={interest.id}
                  onClick={() => toggleInterest(interest.id)}
                  className={`flex items-center justify-between p-3 rounded-lg border text-xs font-medium transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-[#EAF4F3] border-[#087F83] text-[#132B3B] font-semibold'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <span>{interest.label}</span>
                  {isSelected ? (
                    <Check className="w-4 h-4 text-[#087F83]" />
                  ) : (
                    <span className="w-4 h-4 rounded border border-slate-300" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Available Time Preference */}
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
            Available Time Cadence
          </label>
          <select
            value={availableTime}
            onChange={(e) => setAvailableTime(e.target.value)}
            className="w-full max-w-md px-3.5 py-2.5 text-sm bg-slate-50 focus:bg-white border border-slate-200 rounded-lg text-slate-800 focus:border-[#087F83] transition-colors"
          >
            <option value="Rapid 30-min sprints">Rapid 30-min quick builds</option>
            <option value="1-2 hours / week">1–2 hours per week</option>
            <option value="Weekend projects (3-5 hours)">Weekend projects (3–5 hours)</option>
            <option value="Flexible / As time permits">Flexible / Open ended</option>
          </select>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-6 border-t border-slate-100">
          {mode === 'demo' ? (
            <button
              type="button"
              onClick={onOpenResetDemo}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Demo to Defaults</span>
            </button>
          ) : (
            <div className="text-[11px] text-slate-400">
              Changes sync automatically to your Firestore document.
            </div>
          )}

          <button
            type="submit"
            className="px-6 py-2.5 text-xs font-semibold text-white bg-[#087F83] hover:bg-[#066366] rounded-xl shadow-xs transition-colors cursor-pointer"
          >
            Save Private Preferences
          </button>
        </div>
      </form>

      {/* Institutional Lab Pilot & Academic Pathways Section */}
      <InstitutionalPilotSection
        activeUser={activeUser || {
          id: googleUser?.uid || 'user-1',
          displayName: displayName || 'Maker',
          isDemo: mode === 'demo',
          experience: experience,
          skills: ['circuit prototyping'],
          interests: interests,
          collaborationPreference: 'Open to team builds',
        }}
        userInventory={userInventory}
        userLedgerCount={userLedgerCount}
      />
    </div>
  );
}
