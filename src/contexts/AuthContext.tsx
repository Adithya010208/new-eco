/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from 'react';
import { User } from 'firebase/auth';
import {
  auth,
  isFirebaseConfigured,
  signInWithGoogle as firebaseSignIn,
  signOutFirebaseUser,
  onAuthStateSubscription,
} from '../services/firebase';
import { FirestoreAdapter, CloudUserProfile } from '../services/firestoreAdapter';

export type AppMode = 'demo' | 'account';

interface AuthContextValue {
  user: User | null;
  authLoading: boolean;
  isConfigured: boolean;
  authError: string | null;
  mode: AppMode;
  userProfile: CloudUserProfile | null;
  setMode: (mode: AppMode) => void;
  signInWithGoogle: () => Promise<boolean>;
  signOut: () => Promise<void>;
  updateCloudProfile: (profile: Partial<CloudUserProfile>) => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [mode, setModeState] = useState<AppMode>(() => {
    // Check local preference if set
    const saved = localStorage.getItem('ecobuild_app_mode');
    return (saved === 'account' ? 'account' : 'demo') as AppMode;
  });
  const [userProfile, setUserProfile] = useState<CloudUserProfile | null>(null);

  // Sync mode changes to storage
  const setMode = useCallback((newMode: AppMode) => {
    setModeState(newMode);
    localStorage.setItem('ecobuild_app_mode', newMode);
  }, []);

  // Listen for Firebase auth state changes (session restoration)
  useEffect(() => {
    if (!isFirebaseConfigured) {
      setAuthLoading(false);
      setModeState('demo');
      return;
    }

    const unsubscribe = onAuthStateSubscription(async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        // Authenticated: load/initialize profile
        try {
          let profile = await FirestoreAdapter.getUserProfile(currentUser.uid);
          if (!profile) {
            // First time sign-in: seed basic profile from Google identity
            const newProfile: CloudUserProfile = {
              displayName: currentUser.displayName || currentUser.email?.split('@')[0] || 'Maker',
              email: currentUser.email || undefined,
              photoURL: currentUser.photoURL || undefined,
              experience: 'Beginner',
              interests: ['robotics', 'home automation', 'learning electronics'],
              skills: ['circuit prototyping'],
              preferredDifficulty: 'Beginner',
              availableTime: '1-2 hours / week',
              collaborationPreference: 'Solo maker',
              bio: 'EcoBuild hardware maker building sustainable electronics projects.',
            };
            await FirestoreAdapter.saveUserProfile(currentUser.uid, newProfile);
            profile = newProfile;
          }
          setUserProfile(profile);
          setModeState('account');
        } catch (err: any) {
          console.error('[EcoBuild Auth] Error loading cloud profile:', err);
          setAuthError(err?.message || 'Could not load cloud profile from Firestore.');
        }
      } else {
        // Logged out
        setUserProfile(null);
        setModeState('demo');
      }
      setAuthLoading(false);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const signInWithGoogle = useCallback(async (): Promise<boolean> => {
    setAuthError(null);
    const { user: signedInUser, error } = await firebaseSignIn();
    if (error) {
      setAuthError(error);
      return false;
    }
    if (signedInUser) {
      setMode('account');
      return true;
    }
    return false;
  }, [setMode]);

  const signOut = useCallback(async (): Promise<void> => {
    try {
      await signOutFirebaseUser();
      setUser(null);
      setUserProfile(null);
      setMode('demo');
      setAuthError(null);
    } catch (err: any) {
      console.error('[EcoBuild Auth] Sign out error:', err);
      setAuthError(err?.message || 'Failed to sign out.');
    }
  }, [setMode]);

  const updateCloudProfile = useCallback(
    async (updated: Partial<CloudUserProfile>): Promise<void> => {
      if (!user) return;
      const merged: CloudUserProfile = {
        displayName: updated.displayName || userProfile?.displayName || user.displayName || 'Maker',
        experience: updated.experience || userProfile?.experience || 'Beginner',
        interests: updated.interests || userProfile?.interests || ['learning electronics'],
        skills: updated.skills || userProfile?.skills || [],
        preferredDifficulty: updated.preferredDifficulty || userProfile?.preferredDifficulty || 'Beginner',
        availableTime: updated.availableTime || userProfile?.availableTime || '1-2 hours / week',
        collaborationPreference: updated.collaborationPreference || userProfile?.collaborationPreference || 'Solo maker',
        bio: updated.bio !== undefined ? updated.bio : userProfile?.bio,
        photoURL: updated.photoURL || userProfile?.photoURL || user.photoURL || undefined,
        email: user.email || userProfile?.email || undefined,
      };

      await FirestoreAdapter.saveUserProfile(user.uid, merged);
      setUserProfile(merged);
    },
    [user, userProfile]
  );

  const clearError = useCallback(() => setAuthError(null), []);

  const value: AuthContextValue = {
    user,
    authLoading,
    isConfigured: isFirebaseConfigured,
    authError,
    mode,
    userProfile,
    setMode,
    signInWithGoogle,
    signOut,
    updateCloudProfile,
    clearError,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
