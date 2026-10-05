/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Link, useLocation } from 'wouter';
import { useTranslation } from 'react-i18next';
import {
  Compass,
  Cpu,
  BookOpen,
  Bookmark,
  User,
  Users,
  Layers,
  Activity,
  Sparkles,
  Info,
  ShieldCheck,
  Wrench,
  Trophy,
} from 'lucide-react';
import { FutureFeatureType } from '../common/FutureFeatureModal';
import { MakerProfile } from '../../types';
import { AppMode } from '../../contexts/AuthContext';

interface SidebarProps {
  inventoryCount: number;
  freeCount: number;
  savedCount: number;
  activeWorkspacesCount: number;
  activeUser: MakerProfile;
  mode?: AppMode;
  onOpenFutureFeature: (type: FutureFeatureType) => void;
}

export function Sidebar({
  inventoryCount,
  freeCount,
  savedCount,
  activeWorkspacesCount,
  activeUser,
  mode = 'demo',
  onOpenFutureFeature,
}: SidebarProps) {
  const [location] = useLocation();
  const { t } = useTranslation();

  const primaryNav = [
    {
      href: '/',
      label: t('nav.discover', 'Discover'),
      icon: Compass,
      match: (loc: string) => loc === '/',
    },
    {
      href: '/components',
      label: t('nav.components', 'My Components'),
      icon: Cpu,
      badge: `${freeCount} free`,
      match: (loc: string) => loc.startsWith('/components'),
    },
    {
      href: '/projects',
      label: t('nav.projects', 'Project Library'),
      icon: BookOpen,
      match: (loc: string) => loc.startsWith('/projects') && !loc.startsWith('/saved'),
    },
    {
      href: '/network',
      label: t('nav.network', 'Maker Network'),
      icon: Users,
      match: (loc: string) => loc.startsWith('/network') || loc.startsWith('/workspaces'),
      count: activeWorkspacesCount > 0 ? activeWorkspacesCount : undefined,
    },
    {
      href: '/studio',
      label: t('nav.studio', '3D Build Studio'),
      icon: Wrench,
      badge: 'Interactive',
      match: (loc: string) => loc.startsWith('/studio') || loc.startsWith('/build'),
    },
    {
      href: '/saved',
      label: t('nav.saved', 'Saved Projects'),
      icon: Bookmark,
      count: savedCount,
      match: (loc: string) => loc.startsWith('/saved'),
    },
    {
      href: '/leaderboards',
      label: t('nav.leaderboards', 'Leaderboards'),
      icon: Trophy,
      match: (loc: string) => loc.startsWith('/leaderboards'),
    },
    {
      href: '/impact',
      label: t('nav.impact', 'Impact & Ledger'),
      icon: Activity,
      match: (loc: string) => loc.startsWith('/impact'),
    },
    {
      href: '/profile',
      label: t('nav.profile', 'Profile & Settings'),
      icon: User,
      match: (loc: string) => loc.startsWith('/profile'),
    },
  ];

  const futureNav: { type: FutureFeatureType; label: string; icon: any }[] = [];

  return (
    <aside className="w-64 bg-white border-r border-slate-200 hidden lg:flex flex-col justify-between p-4 shrink-0 min-h-[calc(100vh-4rem)]">
      <div className="space-y-6">
        {/* Active Identity Banner */}
        <div className={`p-3 border rounded-xl space-y-1 ${
          mode === 'account'
            ? 'bg-emerald-50/70 border-emerald-200'
            : 'bg-[#F7F9F8] border-slate-200'
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              {mode === 'account' ? 'Cloud Account' : 'Active Demo Maker'}
            </span>
            <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded border ${
              mode === 'account'
                ? 'bg-emerald-600 text-white border-emerald-700'
                : 'bg-amber-50 text-amber-800 border-amber-200'
            }`}>
              {mode === 'account' ? 'Cloud' : 'Demo'}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#132B3B] truncate">
              {activeUser.displayName}
            </span>
            <span className="text-[10px] text-emerald-800 bg-emerald-50 px-1.5 py-0.2 rounded font-semibold border border-emerald-200">
              {activeUser.experience}
            </span>
          </div>
          <div className="text-[11px] text-slate-500 truncate">
            {mode === 'account' ? 'Cloud Firestore (Private)' : (activeUser.locationLabel || 'Local Maker Hub')}
          </div>
        </div>

        {/* Workbench Navigation */}
        <div>
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 px-3 mb-2">
            Workbench
          </div>
          <nav className="space-y-1">
            {primaryNav.map((item) => {
              const active = item.match(location);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center justify-between px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                    active
                      ? 'bg-[#EAF4F3] text-[#087F83] font-semibold'
                      : 'text-slate-600 hover:text-[#132B3B] hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon
                      className={`w-4 h-4 ${
                        active ? 'text-[#087F83]' : 'text-slate-400'
                      }`}
                    />
                    <span>{item.label}</span>
                  </div>

                  {item.badge && (
                    <span className="text-[10px] font-mono font-medium px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200/50">
                      {item.badge}
                    </span>
                  )}
                  {item.count !== undefined && item.count > 0 && (
                    <span className="text-xs font-mono text-slate-500">
                      {item.count}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Future Destinations section */}
        {futureNav.length > 0 && (
          <div>
            <div className="flex items-center justify-between px-3 mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Future Modules
              </span>
              <span className="text-[10px] text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded font-medium">
                Later Phase
              </span>
            </div>

            <div className="space-y-1">
              {futureNav.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.type}
                    onClick={() => onOpenFutureFeature(item.type)}
                    className="w-full flex items-center justify-between px-3 py-2 text-sm font-medium text-slate-500 hover:text-slate-800 hover:bg-slate-50 rounded-lg transition-colors text-left cursor-pointer group"
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon className="w-4 h-4 text-slate-400 group-hover:text-[#087F83] transition-colors" />
                      <span>{item.label}</span>
                    </div>
                    <Sparkles className="w-3 h-3 text-slate-300 group-hover:text-amber-500 transition-colors" />
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Persistence Note Footer */}
      <div className="p-3 bg-[#F7F9F8] border border-slate-200 rounded-xl space-y-1.5">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
          <Info className="w-3.5 h-3.5 text-[#087F83]" />
          <span>Local Demo Network</span>
        </div>
        <p className="text-[11px] text-slate-500 leading-normal">
          All proposals, reservations, and chat messages stay within this browser prototype.
        </p>
      </div>
    </aside>
  );
}
