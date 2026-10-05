/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Trophy,
  Award,
  Sparkles,
  Wrench,
  RotateCcw,
  Cpu,
  Layers,
  ShieldCheck,
  Leaf,
  Scale,
  Users,
  CheckCircle2,
  Info,
} from 'lucide-react';
import { EcoLeaderboardEntry, BuilderLeaderboardEntry, MakerProfile } from '../types';
import { StorageService } from '../services/storageService';
import { FirestoreAdapter } from '../services/firestoreAdapter';
import { AppMode } from '../contexts/AuthContext';
import { BADGE_DEFINITIONS } from '../utils/gamification';

interface LeaderboardsPageProps {
  activeUser: MakerProfile;
  mode?: AppMode;
  googleUser?: { uid?: string } | null;
}

function renderBadgeIcon(iconName?: string) {
  switch (iconName) {
    case 'Leaf':
      return <Leaf className="w-3.5 h-3.5 text-emerald-600" />;
    case 'Cpu':
      return <Cpu className="w-3.5 h-3.5 text-teal-600" />;
    case 'Trophy':
      return <Trophy className="w-3.5 h-3.5 text-amber-500" />;
    case 'Wrench':
      return <Wrench className="w-3.5 h-3.5 text-blue-600" />;
    case 'Layers':
      return <Layers className="w-3.5 h-3.5 text-purple-600" />;
    case 'Sparkles':
      return <Sparkles className="w-3.5 h-3.5 text-amber-500" />;
    case 'Users':
      return <Users className="w-3.5 h-3.5 text-indigo-600" />;
    case 'Award':
      return <Award className="w-3.5 h-3.5 text-teal-600" />;
    case 'RotateCcw':
      return <RotateCcw className="w-3.5 h-3.5 text-emerald-600" />;
    default:
      return <Award className="w-3.5 h-3.5 text-amber-500" />;
  }
}

export function LeaderboardsPage({ activeUser, mode = 'demo', googleUser }: LeaderboardsPageProps) {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<'eco' | 'builder'>('eco');

  const [ecoEntries, setEcoEntries] = useState<EcoLeaderboardEntry[]>([]);
  const [builderEntries, setBuilderEntries] = useState<BuilderLeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load Leaderboard data
  useEffect(() => {
    setIsLoading(true);

    if (mode === 'account' && googleUser?.uid) {
      // In cloud mode, subscribe to discoverable profiles and construct entries
      const unsub = FirestoreAdapter.subscribeToDiscoverableProfiles((profiles) => {
        const ecoList: EcoLeaderboardEntry[] = profiles.map((p) => ({
          userId: p.uid,
          displayName: p.displayName,
          avatarUrl: p.photoURL || undefined,
          ecoPoints: p.ecoPoints || 0,
          ecoRank: p.ecoRank || 'Seedling',
          componentsReusedCount: p.reusedComponentsCount || 0,
          reuseCycleCount: p.reuseCycleCount || 0,
          isCurrentActiveUser: p.uid === googleUser.uid,
          rank: 0,
        }));

        ecoList.sort((a, b) => b.ecoPoints - a.ecoPoints);
        ecoList.forEach((e, idx) => {
          e.rank = idx + 1;
        });

        const builderList: BuilderLeaderboardEntry[] = profiles.map((p) => {
          const completedCount = p.verifiedCompletedProjects || 0;
          return {
            userId: p.uid,
            displayName: p.displayName,
            avatarUrl: p.photoURL || undefined,
            completedProjectsCount: completedCount,
            builderScore: completedCount * 60,
            builderRank: p.builderRank || 'Apprentice',
            highestDifficultyCompleted: p.highestDifficultyCompleted || 'Beginner',
            isCurrentActiveUser: p.uid === googleUser.uid,
            rank: 0,
          };
        });

        builderList.sort((a, b) => ((b.builderScore ?? 0) - (a.builderScore ?? 0)) || ((b.completedProjectsCount ?? 0) - (a.completedProjectsCount ?? 0)));
        builderList.forEach((e, idx) => {
          e.rank = idx + 1;
        });

        // If cloud user is not discoverable yet or empty, merge with fallback
        if (ecoList.length === 0) {
          setEcoEntries(StorageService.getEcoLeaderboard());
          setBuilderEntries(StorageService.getBuilderLeaderboard());
        } else {
          setEcoEntries(ecoList);
          setBuilderEntries(builderList);
        }
        setIsLoading(false);
      });

      return () => unsub();
    } else {
      // Demo Mode
      const eco = StorageService.getEcoLeaderboard();
      const builder = StorageService.getBuilderLeaderboard();
      setEcoEntries(eco);
      setBuilderEntries(builder);
      setIsLoading(false);

      const handleStorageUpdate = () => {
        setEcoEntries(StorageService.getEcoLeaderboard());
        setBuilderEntries(StorageService.getBuilderLeaderboard());
      };
      window.addEventListener('storage', handleStorageUpdate);
      return () => window.removeEventListener('storage', handleStorageUpdate);
    }
  }, [mode, googleUser?.uid]);

  const activeUserId = mode === 'account' ? googleUser?.uid : activeUser.id;

  const currentEcoStanding = useMemo(() => {
    return ecoEntries.find((e) => e.userId === activeUserId || e.isCurrentActiveUser);
  }, [ecoEntries, activeUserId]);

  const currentBuilderStanding = useMemo(() => {
    return builderEntries.find((e) => e.userId === activeUserId || e.isCurrentActiveUser);
  }, [builderEntries, activeUserId]);

  const renderBadgeIcon = (iconName?: string) => {
    switch (iconName) {
      case 'Leaf':
        return <Leaf className="w-3.5 h-3.5 text-emerald-600" />;
      case 'Scale':
        return <Scale className="w-3.5 h-3.5 text-teal-600" />;
      case 'Award':
        return <Award className="w-3.5 h-3.5 text-amber-500" />;
      case 'Wrench':
        return <Wrench className="w-3.5 h-3.5 text-blue-600" />;
      case 'Layers':
        return <Layers className="w-3.5 h-3.5 text-indigo-600" />;
      case 'Sparkles':
        return <Sparkles className="w-3.5 h-3.5 text-purple-600" />;
      case 'Users':
        return <Users className="w-3.5 h-3.5 text-sky-600" />;
      case 'ShieldCheck':
        return <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />;
      case 'RotateCcw':
        return <RotateCcw className="w-3.5 h-3.5 text-amber-600" />;
      default:
        return <Award className="w-3.5 h-3.5 text-[#087F83]" />;
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-16">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-[#132B3B] to-[#087F83] text-white p-6 sm:p-8 rounded-2xl shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/10 text-emerald-200 text-xs font-semibold backdrop-blur-xs">
              <Trophy className="w-3.5 h-3.5" />
              <span>Verified Circular Engineering</span>
            </div>
            <h1 className="text-white text-2xl sm:text-3xl font-bold tracking-tight">
              {t('leaderboards.title', 'Circular Maker Leaderboards')}
            </h1>
            <p className="text-xs sm:text-sm text-slate-200 max-w-2xl leading-relaxed">
              {t(
                'leaderboards.subtitle',
                'Recognizing verified physical circularity and engineering craftsmanship across our maker community.'
              )}
            </p>
          </div>

          {/* Quick Standing Metric Card */}
          <div className="bg-white/10 backdrop-blur-xs border border-white/20 p-4 rounded-xl shrink-0 text-right sm:text-left min-w-[200px]">
            <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-200">
              {t('leaderboards.yourRank', 'Your Standing')}
            </div>
            <div className="mt-1 flex items-baseline justify-between gap-3">
              <div>
                <div className="text-xl font-bold font-mono">
                  #{activeTab === 'eco' ? currentEcoStanding?.rank || '-' : currentBuilderStanding?.rank || '-'}
                </div>
                <div className="text-xs text-slate-300">
                  {activeTab === 'eco'
                    ? currentEcoStanding?.ecoRank || 'Seedling'
                    : currentBuilderStanding?.builderRank || 'Apprentice'}
                </div>
              </div>
              <div className="text-right">
                <div className="text-xl font-bold font-mono text-emerald-300">
                  {activeTab === 'eco'
                    ? `${currentEcoStanding?.ecoPoints || 0} pts`
                    : `${currentBuilderStanding?.completedProjectsCount || 0} builds`}
                </div>
                <div className="text-[10px] text-slate-300">
                  {activeTab === 'eco' ? 'Eco Points' : 'Completed'}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Switcher */}
      <div className="flex items-center justify-between gap-4 border-b border-slate-200 pb-2">
        <div className="flex items-center gap-2 p-1 bg-slate-100 rounded-xl">
          <button
            onClick={() => setActiveTab('eco')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
              activeTab === 'eco'
                ? 'bg-white text-[#132B3B] shadow-2xs border border-slate-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Leaf className={`w-4 h-4 ${activeTab === 'eco' ? 'text-emerald-600' : 'text-slate-400'}`} />
            <span>{t('leaderboards.tabEco', 'Leaderboard A: Eco Points (Circularity)')}</span>
          </button>

          <button
            onClick={() => setActiveTab('builder')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
              activeTab === 'builder'
                ? 'bg-white text-[#132B3B] shadow-2xs border border-slate-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Wrench className={`w-4 h-4 ${activeTab === 'builder' ? 'text-[#087F83]' : 'text-slate-400'}`} />
            <span>{t('leaderboards.tabBuilder', 'Leaderboard B: Builder Progress & Crafts')}</span>
          </button>
        </div>

        <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-500">
          <Info className="w-4 h-4 text-[#087F83]" />
          <span>Scores reflect verified bench builds & hardware events</span>
        </div>
      </div>

      {/* Main Content Table */}
      {isLoading ? (
        <div className="p-16 text-center space-y-3 bg-white rounded-2xl border border-slate-200 shadow-2xs">
          <div className="w-8 h-8 border-4 border-[#087F83] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-slate-500">{t('common.loading', 'Loading verified leaderboards...')}</p>
        </div>
      ) : activeTab === 'eco' ? (
        /* LEADERBOARD A: ECO POINTS */
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  <th className="py-3.5 px-4 w-16 text-center">{t('leaderboards.rank', 'Rank')}</th>
                  <th className="py-3.5 px-4">{t('leaderboards.maker', 'Maker')}</th>
                  <th className="py-3.5 px-4">{t('common.ecoRank', 'Eco Rank')}</th>
                  <th className="py-3.5 px-4 text-center">{t('leaderboards.reusedCount', 'Parts Reused')}</th>
                  <th className="py-3.5 px-4 text-center">{t('leaderboards.cycles', 'Reuse Cycles')}</th>
                  <th className="py-3.5 px-4">{t('leaderboards.badges', 'Top Badge')}</th>
                  <th className="py-3.5 px-4 text-right">{t('leaderboards.points', 'Eco Points')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {ecoEntries.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      {t('leaderboards.emptyEco', 'No eco point transactions recorded yet.')}
                    </td>
                  </tr>
                ) : (
                  ecoEntries.map((entry) => {
                    const isUser = entry.userId === activeUserId || entry.isCurrentActiveUser;
                    return (
                      <tr
                        key={entry.userId}
                        aria-current={isUser ? 'true' : undefined}
                        className={`transition-colors ${
                          isUser
                            ? 'bg-[#EAF4F3]/70 font-semibold text-[#132B3B] hover:bg-[#EAF4F3]'
                            : entry.rank <= 3 ? 'bg-slate-50/70 hover:bg-slate-100 text-slate-800' : 'hover:bg-slate-50 text-slate-700'
                        }`}
                      >
                        {/* Rank */}
                        <td className="py-3.5 px-4 text-center font-bold">
                          {entry.rank === 1 ? (
                            <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-amber-100 text-amber-800 font-extrabold text-xs">
                              🥇
                            </span>
                          ) : entry.rank === 2 ? (
                            <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-slate-200 text-slate-700 font-extrabold text-xs">
                              🥈
                            </span>
                          ) : entry.rank === 3 ? (
                            <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-amber-50 text-amber-900 border border-amber-200 font-extrabold text-xs">
                              🥉
                            </span>
                          ) : (
                            <span className="font-mono text-slate-400 text-xs">#{entry.rank}</span>
                          )}
                        </td>

                        {/* Maker Identity */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            {entry.avatarUrl ? (
                              <img
                                src={entry.avatarUrl}
                                alt={entry.displayName}
                                className="w-8 h-8 rounded-full object-cover border border-slate-200 shrink-0"
                              />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-[#087F83] text-white flex items-center justify-center font-bold text-xs shrink-0">
                                {entry.displayName.charAt(0).toUpperCase()}
                              </div>
                            )}
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="font-bold text-[#132B3B]">{entry.displayName}</span>
                                {isUser && (
                                  <span className="text-[10px] font-semibold bg-[#087F83] text-white px-1.5 py-0.2 rounded">
                                    You
                                  </span>
                                )}
                              </div>
                              <span className="text-[10px] text-slate-400 font-mono">
                                id: {entry.userId.substring(0, 14)}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Eco Rank */}
                        <td className="py-3.5 px-4">
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                            <Leaf className="w-3 h-3 text-emerald-600" />
                            {entry.ecoRank}
                          </span>
                        </td>

                        {/* Components Reused */}
                        <td className="py-3.5 px-4 text-center font-mono font-semibold text-slate-700">
                          {entry.componentsReusedCount}
                        </td>

                        {/* Reuse Cycles */}
                        <td className="py-3.5 px-4 text-center font-mono font-semibold text-slate-700">
                          {entry.reuseCycleCount}
                        </td>

                        {/* Top Badge */}
                        <td className="py-3.5 px-4">
                          {entry.topBadge ? (
                            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200 text-[11px]">
                              {typeof entry.topBadge === 'string' ? (
                                <>
                                  {renderBadgeIcon(entry.topBadge)}
                                  <span className="font-medium text-slate-700">{entry.topBadge}</span>
                                </>
                              ) : (
                                <>
                                  {renderBadgeIcon((entry.topBadge as any).iconName || (entry.topBadge as any).definition?.iconName)}
                                  <span className="font-medium text-slate-700">
                                    {(entry.topBadge as any).name || (entry.topBadge as any).definition?.name}
                                  </span>
                                </>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-400 text-xs italic">Eco Starter</span>
                          )}
                        </td>

                        {/* Points */}
                        <td className="py-3.5 px-4 text-right">
                          <span className="text-sm font-extrabold font-mono text-[#087F83]">
                            {entry.ecoPoints}
                          </span>
                          <span className="text-[10px] text-slate-400 ml-1">pts</span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* LEADERBOARD B: BUILDER PROGRESS & RANK */
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  <th className="py-3.5 px-4 w-16 text-center">{t('leaderboards.rank', 'Rank')}</th>
                  <th className="py-3.5 px-4">{t('leaderboards.maker', 'Maker')}</th>
                  <th className="py-3.5 px-4">{t('common.builderRank', 'Builder Rank')}</th>
                  <th className="py-3.5 px-4 text-center">{t('leaderboards.projectsCount', 'Builds Completed')}</th>
                  <th className="py-3.5 px-4 text-center">{t('leaderboards.topDifficulty', 'Highest Tier')}</th>
                  <th className="py-3.5 px-4">{t('leaderboards.badges', 'Top Badge')}</th>
                  <th className="py-3.5 px-4 text-right">{t('leaderboards.builderScore', 'Builder Score')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {builderEntries.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      {t('leaderboards.emptyBuilder', 'No completed project builds recorded yet.')}
                    </td>
                  </tr>
                ) : (
                  builderEntries.map((entry) => {
                    const isUser = entry.userId === activeUserId || entry.isCurrentActiveUser;
                    return (
                      <tr
                        key={entry.userId}
                        aria-current={isUser ? 'true' : undefined}
                        className={`transition-colors ${
                          isUser
                            ? 'bg-[#EAF4F3]/70 font-semibold text-[#132B3B] hover:bg-[#EAF4F3]'
                            : entry.rank <= 3 ? 'bg-slate-50/70 hover:bg-slate-100 text-slate-800' : 'hover:bg-slate-50 text-slate-700'
                        }`}
                      >
                        {/* Rank */}
                        <td className="py-3.5 px-4 text-center font-bold">
                          {entry.rank === 1 ? (
                            <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-amber-100 text-amber-800 font-extrabold text-xs">
                              🥇
                            </span>
                          ) : entry.rank === 2 ? (
                            <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-slate-200 text-slate-700 font-extrabold text-xs">
                              🥈
                            </span>
                          ) : entry.rank === 3 ? (
                            <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-amber-50 text-amber-900 border border-amber-200 font-extrabold text-xs">
                              🥉
                            </span>
                          ) : (
                            <span className="font-mono text-slate-400 text-xs">#{entry.rank}</span>
                          )}
                        </td>

                        {/* Maker Identity */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            {entry.avatarUrl ? (
                              <img
                                src={entry.avatarUrl}
                                alt={entry.displayName}
                                className="w-8 h-8 rounded-full object-cover border border-slate-200 shrink-0"
                              />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-[#132B3B] text-white flex items-center justify-center font-bold text-xs shrink-0">
                                {entry.displayName.charAt(0).toUpperCase()}
                              </div>
                            )}
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="font-bold text-[#132B3B]">{entry.displayName}</span>
                                {isUser && (
                                  <span className="text-[10px] font-semibold bg-[#087F83] text-white px-1.5 py-0.2 rounded">
                                    You
                                  </span>
                                )}
                              </div>
                              <span className="text-[10px] text-slate-400 font-mono">
                                id: {entry.userId.substring(0, 14)}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Builder Rank */}
                        <td className="py-3.5 px-4">
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-sky-50 text-sky-800 border border-sky-200">
                            <Wrench className="w-3 h-3 text-sky-600" />
                            {entry.builderRank}
                          </span>
                        </td>

                        {/* Completed Builds */}
                        <td className="py-3.5 px-4 text-center font-mono font-semibold text-slate-700">
                          {entry.completedProjectsCount}
                        </td>

                        {/* Highest Tier */}
                        <td className="py-3.5 px-4 text-center">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                              entry.highestDifficultyCompleted === 'Advanced'
                                ? 'bg-purple-100 text-purple-800 border border-purple-200'
                                : entry.highestDifficultyCompleted === 'Intermediate'
                                ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                            }`}
                          >
                            {entry.highestDifficultyCompleted}
                          </span>
                        </td>

                        {/* Top Badge */}
                        <td className="py-3.5 px-4">
                          {entry.topBadge ? (
                            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200 text-[11px]">
                              {typeof entry.topBadge === 'string' ? (
                                <>
                                  {renderBadgeIcon(entry.topBadge)}
                                  <span className="font-medium text-slate-700">{entry.topBadge}</span>
                                </>
                              ) : (
                                <>
                                  {renderBadgeIcon((entry.topBadge as any).iconName || (entry.topBadge as any).definition?.iconName)}
                                  <span className="font-medium text-slate-700">
                                    {(entry.topBadge as any).name || (entry.topBadge as any).definition?.name}
                                  </span>
                                </>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-400 text-xs italic">Apprentice</span>
                          )}
                        </td>

                        {/* Builder Score */}
                        <td className="py-3.5 px-4 text-right">
                          <span className="text-sm font-extrabold font-mono text-[#132B3B]">
                            {entry.builderScore}
                          </span>
                          <span className="text-[10px] text-slate-400 ml-1">pts</span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Rules & Transparency Footnote */}
      <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600 space-y-1.5">
        <div className="font-bold text-[#132B3B] flex items-center gap-1.5">
          <ShieldCheck className="w-4 h-4 text-[#087F83]" />
          <span>Leaderboard Scoring & Anti-Tamper Policy</span>
        </div>
        <p className="leading-relaxed">
          Leaderboard standings are calculated exclusively from verified workbench lifecycle records: physical builds confirmed with hardware allocations, return-to-inventory disassembly cycles, and completed component exchanges. Viewing projects or editing mock inventory does not alter scores.
        </p>
      </div>
    </div>
  );
}
