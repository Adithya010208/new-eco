/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  serverTimestamp,
  Unsubscribe,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from './firebase';
import { ComponentItem, UserProfile } from '../types';
import { BuildGuideProgress } from '../studio/types';

export interface CloudUserProfile {
  displayName: string;
  email?: string;
  photoURL?: string;
  experience: 'Beginner' | 'Intermediate' | 'Advanced';
  interests?: string[];
  skills?: string[];
  preferredDifficulty?: 'Beginner' | 'Intermediate' | 'Advanced';
  availableTime?: string;
  collaborationPreference?:
    | 'Open to team builds'
    | 'Mentoring only'
    | 'Project-specific'
    | 'Solo maker';
  bio?: string;
  createdAt?: string;
  updatedAt?: string;
}

export class FirestoreAdapter {
  /**
   * Loads user profile from Firestore: users/{uid}
   */
  static async getUserProfile(uid: string): Promise<CloudUserProfile | null> {
    if (!db) return null;
    const docPath = `users/${uid}`;
    try {
      const snap = await getDoc(doc(db, 'users', uid));
      if (snap.exists()) {
        return snap.data() as CloudUserProfile;
      }
      return null;
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, docPath);
    }
  }

  /**
   * Initializes or updates user profile in Firestore: users/{uid}
   */
  static async saveUserProfile(
    uid: string,
    profile: CloudUserProfile
  ): Promise<void> {
    if (!db) return;
    const docPath = `users/${uid}`;
    try {
      const cleanData: Record<string, any> = {
        displayName: (profile.displayName || 'Maker').slice(0, 100),
        experience: profile.experience || 'Beginner',
        interests: (profile.interests || []).slice(0, 30),
        skills: (profile.skills || []).slice(0, 30),
        preferredDifficulty: profile.preferredDifficulty || 'Beginner',
        availableTime: (profile.availableTime || '1-2 hours / week').slice(0, 100),
        collaborationPreference:
          profile.collaborationPreference || 'Solo maker',
        updatedAt: new Date().toISOString(),
      };

      if (profile.email) cleanData.email = profile.email.slice(0, 200);
      if (profile.photoURL) cleanData.photoURL = profile.photoURL.slice(0, 500);
      if (profile.bio) cleanData.bio = profile.bio.slice(0, 500);
      if (profile.createdAt) cleanData.createdAt = profile.createdAt;
      else cleanData.createdAt = new Date().toISOString();

      await setDoc(doc(db, 'users', uid), cleanData, { merge: true });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, docPath);
    }
  }

  /**
   * Subscribes to the user's private inventory items: users/{uid}/inventory
   */
  static subscribeToInventory(
    uid: string,
    onData: (items: ComponentItem[]) => void,
    onError?: (err: Error) => void
  ): Unsubscribe {
    if (!db) {
      onData([]);
      return () => {};
    }

    const collPath = `users/${uid}/inventory`;
    const collRef = collection(db, 'users', uid, 'inventory');

    return onSnapshot(
      collRef,
      (snapshot) => {
        const items: ComponentItem[] = [];
        snapshot.forEach((d) => {
          items.push(d.data() as ComponentItem);
        });
        onData(items);
      },
      (error) => {
        console.error(`[Firestore Error on ${collPath}]`, error);
        if (onError) onError(error);
        try {
          handleFirestoreError(error, OperationType.LIST, collPath);
        } catch {}
      }
    );
  }

  /**
   * Adds a new component to private inventory: users/{uid}/inventory/{itemId}
   */
  static async addInventoryItem(uid: string, item: ComponentItem): Promise<void> {
    if (!db) return;
    const sanitizedId = item.id.replace(/[^a-zA-Z0-9_-]/g, '_');
    const docPath = `users/${uid}/inventory/${sanitizedId}`;

    const cleanItem: ComponentItem = {
      id: sanitizedId,
      ownerId: uid,
      catalogId: item.catalogId.slice(0, 100),
      name: item.name.slice(0, 150),
      category: item.category,
      totalQuantity: Math.max(0, Math.min(10000, Number(item.totalQuantity) || 1)),
      reservedQuantity: 0,
      installedQuantity: Math.max(
        0,
        Math.min(
          item.totalQuantity,
          Number(item.installedQuantity) || 0
        )
      ),
      condition: item.condition,
      source: item.source,
      unitMassGrams:
        item.unitMassGrams !== null && item.unitMassGrams !== undefined
          ? Math.max(0, Math.min(50000, Number(item.unitMassGrams)))
          : null,
      notes: (item.notes || '').slice(0, 1000),
      photoPreview: item.photoPreview ? item.photoPreview.slice(0, 2000) : null,
      verificationStatus: item.verificationStatus || 'untested',
      lastUpdated: new Date().toISOString(),
    };

    try {
      await setDoc(doc(db, 'users', uid, 'inventory', sanitizedId), cleanItem);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, docPath);
    }
  }

  /**
   * Updates an existing component in private inventory: users/{uid}/inventory/{itemId}
   */
  static async updateInventoryItem(
    uid: string,
    item: ComponentItem
  ): Promise<void> {
    if (!db) return;
    const docPath = `users/${uid}/inventory/${item.id}`;

    const cleanItem: ComponentItem = {
      id: item.id,
      ownerId: uid,
      catalogId: item.catalogId.slice(0, 100),
      name: item.name.slice(0, 150),
      category: item.category,
      totalQuantity: Math.max(0, Math.min(10000, Number(item.totalQuantity) || 1)),
      reservedQuantity: 0,
      installedQuantity: Math.max(
        0,
        Math.min(
          item.totalQuantity,
          Number(item.installedQuantity) || 0
        )
      ),
      condition: item.condition,
      source: item.source,
      unitMassGrams:
        item.unitMassGrams !== null && item.unitMassGrams !== undefined
          ? Math.max(0, Math.min(50000, Number(item.unitMassGrams)))
          : null,
      notes: (item.notes || '').slice(0, 1000),
      photoPreview: item.photoPreview ? item.photoPreview.slice(0, 2000) : null,
      verificationStatus: item.verificationStatus || 'untested',
      lastUpdated: new Date().toISOString(),
    };

    try {
      await setDoc(doc(db, 'users', uid, 'inventory', item.id), cleanItem, {
        merge: true,
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, docPath);
    }
  }

  /**
   * Deletes an inventory item from: users/{uid}/inventory/{itemId}
   */
  static async deleteInventoryItem(uid: string, itemId: string): Promise<void> {
    if (!db) return;
    const docPath = `users/${uid}/inventory/${itemId}`;
    try {
      await deleteDoc(doc(db, 'users', uid, 'inventory', itemId));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, docPath);
    }
  }

  /**
   * Subscribes to the user's private saved project IDs: users/{uid}/savedProjects
   */
  static subscribeToSavedProjects(
    uid: string,
    onData: (savedIds: string[]) => void,
    onError?: (err: Error) => void
  ): Unsubscribe {
    if (!db) {
      onData([]);
      return () => {};
    }

    const collPath = `users/${uid}/savedProjects`;
    const collRef = collection(db, 'users', uid, 'savedProjects');

    return onSnapshot(
      collRef,
      (snapshot) => {
        const ids: string[] = [];
        snapshot.forEach((d) => {
          ids.push(d.id);
        });
        onData(ids);
      },
      (error) => {
        console.error(`[Firestore Error on ${collPath}]`, error);
        if (onError) onError(error);
        try {
          handleFirestoreError(error, OperationType.LIST, collPath);
        } catch {}
      }
    );
  }

  /**
   * Toggles save status for a project: users/{uid}/savedProjects/{projectId}
   */
  static async toggleSaveProject(
    uid: string,
    projectId: string,
    currentlySaved: boolean
  ): Promise<boolean> {
    if (!db) return false;
    const docPath = `users/${uid}/savedProjects/${projectId}`;

    try {
      if (currentlySaved) {
        await deleteDoc(doc(db, 'users', uid, 'savedProjects', projectId));
        return false;
      } else {
        await setDoc(doc(db, 'users', uid, 'savedProjects', projectId), {
          projectId,
          savedAt: new Date().toISOString(),
        });
        return true;
      }
    } catch (err) {
      handleFirestoreError(
        err,
        currentlySaved ? OperationType.DELETE : OperationType.CREATE,
        docPath
      );
    }
  }

  /**
   * Loads standalone guide progress: users/{uid}/guideProgress/{progressId}
   */
  static async getGuideProgress(
    uid: string,
    projectId: string,
    recipeVersion: string = 'v1'
  ): Promise<BuildGuideProgress | null> {
    if (!db) return null;
    const progressId = `${projectId}_${recipeVersion}`.replace(/[^a-zA-Z0-9_-]/g, '_');
    const docPath = `users/${uid}/guideProgress/${progressId}`;

    try {
      const snap = await getDoc(
        doc(db, 'users', uid, 'guideProgress', progressId)
      );
      if (snap.exists()) {
        const data = snap.data();
        return {
          makerId: uid,
          projectId: data.projectId,
          recipeVersion: data.recipeVersion,
          currentStepIndex: data.currentStepIndex ?? 0,
          completedStepIndices: data.completedStepIndices ?? [],
          playbackSpeed: data.playbackSpeed ?? 1,
          isLearningCompleted: Boolean(data.isLearningCompleted),
          lastUpdated: data.lastUpdated || new Date().toISOString(),
        };
      }
      return null;
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, docPath);
    }
  }

  /**
   * Saves standalone guide progress: users/{uid}/guideProgress/{progressId}
   */
  static async saveGuideProgress(
    uid: string,
    progress: BuildGuideProgress
  ): Promise<void> {
    if (!db) return;
    const progressId = `${progress.projectId}_${progress.recipeVersion || 'v1'}`.replace(
      /[^a-zA-Z0-9_-]/g,
      '_'
    );
    const docPath = `users/${uid}/guideProgress/${progressId}`;

    const cleanData = {
      progressId,
      projectId: progress.projectId.slice(0, 100),
      recipeVersion: (progress.recipeVersion || 'v1').slice(0, 20),
      currentStepIndex: Math.max(0, Math.min(20, progress.currentStepIndex || 0)),
      completedStepIndices: (progress.completedStepIndices || []).slice(0, 20),
      playbackSpeed: Math.max(0.5, Math.min(5, progress.playbackSpeed || 1)),
      isLearningCompleted: Boolean(
        progress.isLearningCompleted ??
          (progress.completedStepIndices &&
            progress.completedStepIndices.length >= 6)
      ),
      lastUpdated: new Date().toISOString(),
    };

    try {
      await setDoc(
        doc(db, 'users', uid, 'guideProgress', progressId),
        cleanData,
        { merge: true }
      );
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, docPath);
    }
  }

  /**
   * Resets standalone guide progress: users/{uid}/guideProgress/{progressId}
   */
  static async resetGuideProgress(
    uid: string,
    projectId: string,
    recipeVersion: string = 'v1'
  ): Promise<void> {
    if (!db) return;
    const progressId = `${projectId}_${recipeVersion}`.replace(/[^a-zA-Z0-9_-]/g, '_');
    const docPath = `users/${uid}/guideProgress/${progressId}`;

    try {
      await deleteDoc(doc(db, 'users', uid, 'guideProgress', progressId));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, docPath);
    }
  }
}
