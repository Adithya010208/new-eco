/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import {
  User as UserIcon,
  LogOut,
  Sparkles,
  Cloud,
  ChevronDown,
  ExternalLink,
  ShieldCheck,
  AlertCircle,
  X,
  Layers,
} from 'lucide-react';
import { Link } from 'wouter';

interface AuthBadgeProps {
  onOpenDemoSwitcher?: () => void;
}

export function AuthBadge({ onOpenDemoSwitcher }: AuthBadgeProps) {
  const {
    user,
    authLoading,
    isConfigured,
    authError,
    mode,
    userProfile,
    setMode,
    signInWithGoogle,
    signOut,
    clearError,
  } = useAuth();

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
    };
    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isDropdownOpen]);

  const handleSignIn = async () => {
    setIsSigningIn(true);
    await signInWithGoogle();
    setIsSigningIn(false);
  };

  const handleSignOut = async () => {
    setIsDropdownOpen(false);
    await signOut();
  };

  if (authLoading) {
    return (
      <div className="inline-flex items-center gap-2 px-3 py-1.5 text-xs text-slate-400 bg-slate-50 border border-slate-200 rounded-lg animate-pulse">
        <div className="w-2 h-2 rounded-full bg-slate-300" />
        <span>Authenticating...</span>
      </div>
    );
  }

  // When User is Authenticated and in Account Mode
  if (user && mode === 'account') {
    const displayName =
      userProfile?.displayName || user.displayName || user.email?.split('@')[0] || 'Maker';
    const photoURL = userProfile?.photoURL || user.photoURL;

    return (
      <div className="relative inline-block text-left" ref={dropdownRef}>
        <button
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          className="inline-flex items-center gap-2 px-2.5 py-1.5 text-xs font-semibold bg-emerald-50 hover:bg-emerald-100/70 text-[#132B3B] border border-emerald-600/30 rounded-lg transition-colors cursor-pointer shadow-2xs"
          aria-label="Account menu"
          aria-expanded={isDropdownOpen}
        >
          {photoURL ? (
            <img
              src={photoURL}
              alt={displayName}
              className="w-5 h-5 rounded-full object-cover border border-emerald-500/40"
            />
          ) : (
            <div className="w-5 h-5 rounded-full bg-[#087F83] text-white flex items-center justify-center text-[10px] font-bold">
              {displayName.charAt(0).toUpperCase()}
            </div>
          )}

          <div className="flex items-center gap-1.5">
            <span className="font-bold text-[#132B3B] max-w-[110px] truncate">
              {displayName}
            </span>
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider bg-emerald-600 text-white rounded">
              <Cloud className="w-2.5 h-2.5" />
              Account
            </span>
          </div>

          <ChevronDown className="w-3.5 h-3.5 text-slate-500 ml-0.5" />
        </button>

        {isDropdownOpen && (
          <div className="absolute right-0 mt-1.5 w-72 bg-white rounded-xl shadow-xl border border-slate-200 z-50 overflow-hidden divide-y divide-slate-100">
            {/* Header info */}
            <div className="p-3 bg-slate-50">
              <div className="flex items-center gap-2.5">
                {photoURL ? (
                  <img
                    src={photoURL}
                    alt={displayName}
                    className="w-9 h-9 rounded-full object-cover border border-slate-200"
                  />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-[#087F83] text-white flex items-center justify-center text-sm font-bold">
                    {displayName.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-bold text-[#132B3B] truncate">
                    {displayName}
                  </div>
                  {user.email && (
                    <div className="text-[11px] text-slate-500 truncate">
                      {user.email}
                    </div>
                  )}
                  <div className="text-[10px] text-emerald-700 font-medium flex items-center gap-1 mt-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    Cloud Firestore Active
                  </div>
                </div>
              </div>
            </div>

            {/* Menu Actions */}
            <div className="py-1">
              <Link
                href="/profile"
                onClick={() => setIsDropdownOpen(false)}
                className="flex items-center gap-2 px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 transition-colors"
              >
                <UserIcon className="w-3.5 h-3.5 text-slate-500" />
                <span>Profile & Maker Preferences</span>
              </Link>

              <button
                onClick={() => {
                  setIsDropdownOpen(false);
                  setMode('demo');
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 transition-colors text-left cursor-pointer"
              >
                <Layers className="w-3.5 h-3.5 text-amber-600" />
                <div className="flex-1">
                  <div className="font-semibold text-slate-800">
                    Switch to Demo Mode
                  </div>
                  <div className="text-[10px] text-slate-500">
                    Explore fictional makers & proposals
                  </div>
                </div>
              </button>
            </div>

            {/* Sign Out */}
            <div className="p-1">
              <button
                onClick={handleSignOut}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-rose-700 hover:bg-rose-50 rounded-lg transition-colors text-left cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5 text-rose-500" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // When User is Authenticated but currently switched into Demo Mode
  if (user && mode === 'demo') {
    return (
      <div className="flex items-center gap-1.5">
        <button
          onClick={() => setMode('account')}
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-lg transition-colors cursor-pointer shadow-2xs whitespace-nowrap"
          title="Return to your private Cloud account"
        >
          <Cloud className="w-3.5 h-3.5 text-emerald-600" />
          <span className="hidden sm:inline">Return to</span>
          <span className="font-bold">Account Mode</span>
        </button>
      </div>
    );
  }

  // When User is NOT Authenticated (Guest in Demo Mode)
  return (
    <>
      <button
        onClick={handleSignIn}
        disabled={isSigningIn}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#132B3B] bg-white hover:bg-slate-50 border border-slate-300 rounded-lg shadow-2xs transition-colors cursor-pointer whitespace-nowrap disabled:opacity-50"
      >
        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
          <path
            fill="#4285F4"
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
          />
          <path
            fill="#34A853"
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
          />
          <path
            fill="#FBBC05"
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
          />
          <path
            fill="#EA4335"
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
          />
        </svg>
        <span>{isSigningIn ? 'Signing In...' : 'Sign In'}</span>
      </button>

      {/* Auth Error Notification Dialog */}
      {authError && (
        <div className="fixed bottom-4 right-4 max-w-sm z-50 bg-white border border-rose-200 rounded-xl p-4 shadow-xl flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div className="space-y-1 text-xs text-slate-700 flex-1">
            <div className="font-bold text-rose-800">Authentication Note</div>
            <p className="leading-relaxed">{authError}</p>
          </div>
          <button
            onClick={clearError}
            className="text-slate-400 hover:text-slate-600 p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </>
  );
}
