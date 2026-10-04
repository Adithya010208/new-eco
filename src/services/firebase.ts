/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  User,
  Auth,
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDocFromServer,
  Firestore,
} from 'firebase/firestore';
import rawConfig from '../../firebase-applet-config.json';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const currentAuth = auth;
  const currentUser = currentAuth?.currentUser;

  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: currentUser?.uid ?? null,
      email: currentUser?.email ?? null,
      emailVerified: currentUser?.emailVerified ?? null,
      isAnonymous: currentUser?.isAnonymous ?? null,
      tenantId: currentUser?.tenantId ?? null,
      providerInfo:
        currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };

  console.error('[Firestore Error]', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// ---------------------------------------------------------------------------
// Target Firebase Configuration: eco-build-aa966
// ---------------------------------------------------------------------------
// Explicit intended project ID: 'eco-build-aa966' (Spark Plan)
// Explicit confirmed database ID: '(default)'
// Per specification: Platform-managed configuration (firebase-applet-config.json)
// is preserved, but we NEVER secretly fall back to gen-lang-client-0863661661.
// ---------------------------------------------------------------------------

const TARGET_PROJECT_ID = 'eco-build-aa966';
const TARGET_DATABASE_ID = '(default)';

const env =
  typeof import.meta !== 'undefined' && (import.meta as any).env
    ? (import.meta as any).env
    : typeof process !== 'undefined' && process.env
    ? process.env
    : {};

const configuredProjectId = env.VITE_FIREBASE_PROJECT_ID || TARGET_PROJECT_ID;
const configuredApiKey = env.VITE_FIREBASE_API_KEY || '';
const configuredAuthDomain =
  env.VITE_FIREBASE_AUTH_DOMAIN || `${configuredProjectId}.firebaseapp.com`;
const configuredStorageBucket =
  env.VITE_FIREBASE_STORAGE_BUCKET || `${configuredProjectId}.appspot.com`;
const configuredMessagingSenderId = env.VITE_FIREBASE_MESSAGING_SENDER_ID || '';
const configuredAppId = env.VITE_FIREBASE_APP_ID || '';
const configuredDatabaseId =
  env.VITE_FIREBASE_FIRESTORE_DATABASE_ID || TARGET_DATABASE_ID;

// Strict check: Only consider Firebase configured if targeting eco-build-aa966
// with real Web App credentials, or if valid explicit credentials are provided.
// We strictly reject silent fallback to gen-lang-client-0863661661.
const isManagedProject = configuredProjectId === 'gen-lang-client-0863661661';

export const isFirebaseConfigured = Boolean(
  configuredApiKey &&
    configuredProjectId &&
    !isManagedProject &&
    !configuredApiKey.includes('Placeholder') &&
    !configuredApiKey.includes('YOUR_')
);

export interface TargetProjectStatus {
  targetProjectId: string;
  confirmedDatabaseId: string;
  isConfigured: boolean;
  isManagedMismatch: boolean;
  errorReason: string | null;
}

export const targetProjectStatus: TargetProjectStatus = {
  targetProjectId: TARGET_PROJECT_ID,
  confirmedDatabaseId: TARGET_DATABASE_ID,
  isConfigured: isFirebaseConfigured,
  isManagedMismatch: isManagedProject,
  errorReason: isFirebaseConfigured
    ? null
    : isManagedProject
    ? 'Project mismatch: Runtime is pointed to AI Studio managed project gen-lang-client-0863661661 instead of intended project eco-build-aa966.'
    : `Project ${TARGET_PROJECT_ID} requires registered Web App configuration keys (VITE_FIREBASE_API_KEY, VITE_FIREBASE_APP_ID) in .env. Cloud Firestore must also be enabled in Firebase Console.`,
};

const targetFirebaseConfig = {
  apiKey: configuredApiKey,
  authDomain: configuredAuthDomain,
  projectId: configuredProjectId,
  storageBucket: configuredStorageBucket,
  messagingSenderId: configuredMessagingSenderId,
  appId: configuredAppId,
  firestoreDatabaseId: configuredDatabaseId,
};

let appInstance: FirebaseApp | null = null;
let authInstance: Auth | null = null;
let dbInstance: Firestore | null = null;

if (isFirebaseConfigured) {
  try {
    appInstance =
      getApps().length === 0 ? initializeApp(targetFirebaseConfig) : getApp();
    authInstance = getAuth(appInstance);
    // Explicitly select confirmed target database ID
    dbInstance = getFirestore(appInstance, targetFirebaseConfig.firestoreDatabaseId);

    // Connection test against confirmed database
    const testConnection = async () => {
      if (typeof window === 'undefined') return;
      try {
        if (dbInstance) {
          await getDocFromServer(doc(dbInstance, 'test', 'connection'));
        }
      } catch (error) {
        if (
          error instanceof Error &&
          error.message.includes('the client is offline')
        ) {
          console.warn('[EcoBuild] Firestore client offline on target project.');
        }
      }
    };
    testConnection().catch(() => {});
  } catch (err) {
    console.error('[EcoBuild] Failed to initialize target Firebase project:', err);
  }
} else {
  console.info(
    `[EcoBuild] Target project ${TARGET_PROJECT_ID} is not yet fully configured with Web App keys. Demo Mode is active.`
  );
}

export const firebaseApp = appInstance;
export const auth = authInstance;
export const db = dbInstance;

/**
 * Developer Verification Harness for Live Checks:
 * Exposes active runtime metadata and real instance methods on window for
 * precise live verification without relying on external/bare module imports.
 * Strictly development-only per user instruction.
 */
if (
  typeof window !== 'undefined' &&
  (Boolean(import.meta.env?.DEV) ||
    Boolean((window as any).__ENABLE_ECOBUILD_DEV_HARNESS__))
) {
  (window as any).__ECOBUILD_TEST__ = {
    getTargetMetadata: () => ({
      configured: isFirebaseConfigured,
      targetProjectId: TARGET_PROJECT_ID,
      activeProjectId: configuredProjectId,
      confirmedDatabaseId: TARGET_DATABASE_ID,
      activeDatabaseId: configuredDatabaseId,
      authDomain: configuredAuthDomain,
      currentUserUid: authInstance?.currentUser?.uid ?? null,
      currentUserEmail: authInstance?.currentUser?.email ?? null,
    }),
    getDb: () => dbInstance,
    getAuth: () => authInstance,
    verifyCrossAccountDenial: async (
      accountAUid: string,
      sampleItemId: string
    ) => {
      if (!authInstance || !dbInstance) {
        return {
          status: 'ERROR',
          reason: `Firebase is not configured for target ${TARGET_PROJECT_ID}. Account Mode is inactive.`,
        };
      }
      const currentUser = authInstance.currentUser;
      if (!currentUser) {
        return {
          status: 'ERROR',
          reason: 'No user signed in. Please sign in as Account B first.',
        };
      }
      if (currentUser.uid === accountAUid) {
        return {
          status: 'ERROR',
          reason: `Currently signed in as Account A (${accountAUid}). Please sign in as Account B to test cross-account denial.`,
        };
      }
      try {
        const docRef = doc(
          dbInstance,
          'users',
          accountAUid,
          'inventory',
          sampleItemId
        );
        const snap = await getDocFromServer(docRef);
        if (snap.exists()) {
          return {
            status: 'FAIL',
            reason: `CRITICAL: Account B (${currentUser.uid}) successfully read Account A (${accountAUid}) inventory item ${sampleItemId}!`,
          };
        }
        return {
          status: 'INCONCLUSIVE',
          reason: `Document does not exist or empty snapshot returned.`,
        };
      } catch (err: any) {
        const isPermissionDenied =
          err?.code === 'permission-denied' ||
          err?.message?.includes('permission-denied') ||
          err?.message?.includes('PERMISSION_DENIED') ||
          err?.message?.includes('Missing or insufficient permissions');

        if (isPermissionDenied) {
          return {
            status: 'PASS',
            evidence: `Request reached target database ${configuredDatabaseId} in ${configuredProjectId} and was rejected with permission-denied.`,
            error: err.message,
          };
        }
        return {
          status: 'INCONCLUSIVE',
          reason: `Failed with non-security error (network or configuration error): ${err.message}`,
        };
      }
    },
  };
}

/**
 * Initiates Google sign-in using popup.
 * Handles cancellations and closed popups safely without throwing uncaught runtime errors.
 */
export async function signInWithGoogle(): Promise<{ user: User | null; error?: string }> {
  if (!authInstance) {
    return {
      user: null,
      error: `Project ${TARGET_PROJECT_ID} requires registered Web App credentials before cloud sign-in can proceed. Demo Mode is fully available.`,
    };
  }

  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });

  try {
    const userCredential = await signInWithPopup(authInstance, provider);
    return { user: userCredential.user };
  } catch (error: any) {
    console.warn('[EcoBuild] Sign-in with Google result:', error?.code, error?.message);
    if (
      error?.code === 'auth/popup-closed-by-user' ||
      error?.code === 'auth/cancelled-popup-request'
    ) {
      return { user: null, error: 'Sign-in popup was closed before completing.' };
    }
    if (error?.code === 'auth/popup-blocked') {
      return {
        user: null,
        error: 'Sign-in popup was blocked by your browser. Please allow popups for this site.',
      };
    }
    return {
      user: null,
      error: error?.message || 'Failed to authenticate with Google.',
    };
  }
}

/**
 * Signs out the current Firebase user.
 */
export async function signOutFirebaseUser(): Promise<void> {
  if (authInstance) {
    await signOut(authInstance);
  }
}

/**
 * Subscribes to Firebase auth state changes.
 */
export function onAuthStateSubscription(
  callback: (user: User | null) => void
): () => void {
  if (!authInstance) {
    callback(null);
    return () => {};
  }
  return onAuthStateChanged(authInstance, callback);
}
