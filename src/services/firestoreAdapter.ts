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
  query,
  where,
  limit,
  orderBy,
  runTransaction,
  Firestore,
  Unsubscribe,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from './firebase';
import {
  ComponentItem,
  UserProfile,
  DiscoverableMakerProfile,
  CloudMentorshipTicket,
  SharedComponentRecord,
  CloudProposalRecord,
  CloudWorkspaceRecord,
  ComponentTestRecord,
  ReuseLedgerEntry,
  ComponentExchangeListing,
  ShowcaseProject,
  VerifiedInteractionReview,
  ModerationReport,
  OrganizationInventory,
  WorkspaceTask,
  WorkspaceMessage,
  EcoPointTransaction,
  CompletedProjectRecord,
  EcoLeaderboardEntry,
  BuilderLeaderboardEntry,
} from '../types';
import { BuildGuideProgress } from '../studio/types';
import {
  ECO_POINT_VALUES,
  calculateEcoRank,
  calculateBuilderRank,
  evaluateBadges,
} from '../utils/gamification';

export interface ComponentReservationRequest {
  ownerUid: string;
  itemId: string;
  quantity: number;
}

export interface ReservationResult {
  success: boolean;
  reservationId: string;
  error?: string;
}

export interface PhysicalBuildAllocationParams {
  operationId: string;
  projectId: string;
  projectTitle: string;
  workspaceId?: string;
  makerDisplayName: string;
  notes?: string;
  allocations: Array<{
    inventoryItemId: string;
    catalogId: string;
    name: string;
    quantity: number;
    unitMassGrams: number | null;
  }>;
}

export interface PhysicalBuildResult {
  success: boolean;
  isDuplicate: boolean;
  entryId: string;
  totalMassGrams: number;
}

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
  // ========================================================
  // 1. Private User Profile: users/{uid}
  // ========================================================

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

  // ========================================================
  // 2. Private Inventory Subcollection: users/{uid}/inventory
  // ========================================================

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
        Math.min(item.totalQuantity, Number(item.installedQuantity) || 0)
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
      isSharedForCollaboration: Boolean(item.isSharedForCollaboration),
      testRecords: (item.testRecords || []).slice(0, 50),
      provenanceBatchId: item.provenanceBatchId ? item.provenanceBatchId.slice(0, 100) : undefined,
      reuseCycleCount: Math.max(0, Math.min(1000, Number(item.reuseCycleCount) || 0)),
    };

    try {
      await setDoc(doc(db, 'users', uid, 'inventory', sanitizedId), cleanItem);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, docPath);
    }
  }

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
      reservedQuantity: Math.max(0, Math.min(item.totalQuantity, Number(item.reservedQuantity) || 0)),
      installedQuantity: Math.max(
        0,
        Math.min(item.totalQuantity, Number(item.installedQuantity) || 0)
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
      isSharedForCollaboration: Boolean(item.isSharedForCollaboration),
      testRecords: (item.testRecords || []).slice(0, 50),
      provenanceBatchId: item.provenanceBatchId ? item.provenanceBatchId.slice(0, 100) : undefined,
      reuseCycleCount: Math.max(0, Math.min(1000, Number(item.reuseCycleCount) || 0)),
    };

    try {
      await setDoc(doc(db, 'users', uid, 'inventory', item.id), cleanItem, {
        merge: true,
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, docPath);
    }
  }

  static async deleteInventoryItem(uid: string, itemId: string): Promise<void> {
    if (!db) return;
    const docPath = `users/${uid}/inventory/${itemId}`;
    try {
      await deleteDoc(doc(db, 'users', uid, 'inventory', itemId));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, docPath);
    }
  }

  // ========================================================
  // 3. Saved Projects Subcollection: users/{uid}/savedProjects
  // ========================================================

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

  // ========================================================
  // 4. Standalone Guide Progress: users/{uid}/guideProgress
  // ========================================================

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

  // ========================================================
  // 5. PHASE 4B1: Discoverable Profiles (discoverable_profiles/{uid})
  // ========================================================

  static async getDiscoverableProfile(
    uid: string
  ): Promise<DiscoverableMakerProfile | null> {
    if (!db) return null;
    const docPath = `discoverable_profiles/${uid}`;
    try {
      const snap = await getDoc(doc(db, 'discoverable_profiles', uid));
      if (snap.exists()) {
        return snap.data() as DiscoverableMakerProfile;
      }
      return null;
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, docPath);
    }
  }

  static async saveDiscoverableProfile(
    uid: string,
    profile: DiscoverableMakerProfile
  ): Promise<void> {
    if (!db) return;
    const docPath = `discoverable_profiles/${uid}`;
    const cleanData: DiscoverableMakerProfile = {
      uid,
      displayName: (profile.displayName || 'Maker').slice(0, 100),
      photoURL: profile.photoURL ? profile.photoURL.slice(0, 500) : null,
      bio: (profile.bio || '').slice(0, 500),
      experience: profile.experience || 'Beginner',
      interests: (profile.interests || []).slice(0, 30),
      skills: (profile.skills || []).slice(0, 30),
      collaborationPreference: profile.collaborationPreference || 'Solo maker',
      isDiscoverable: Boolean(profile.isDiscoverable),
      isMentor: Boolean(profile.isMentor),
      mentorTopics: (profile.mentorTopics || []).slice(0, 10),
      mentorAvailabilityNotes: (profile.mentorAvailabilityNotes || '').slice(0, 300),
      createdAt: profile.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    try {
      await setDoc(doc(db, 'discoverable_profiles', uid), cleanData, {
        merge: true,
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, docPath);
    }
  }

  static async unpublishDiscoverableProfile(uid: string): Promise<void> {
    if (!db) return;
    const docPath = `discoverable_profiles/${uid}`;
    try {
      await updateDoc(doc(db, 'discoverable_profiles', uid), {
        isDiscoverable: false,
        updatedAt: new Date().toISOString(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, docPath);
    }
  }

  static subscribeToDiscoverableMakers(
    onData: (makers: DiscoverableMakerProfile[]) => void,
    filters?: {
      experience?: string;
      skill?: string;
      interest?: string;
      mentorOnly?: boolean;
    },
    onError?: (err: Error) => void
  ): Unsubscribe {
    if (!db) {
      onData([]);
      return () => {};
    }

    const collPath = 'discoverable_profiles';
    const q = query(
      collection(db, collPath),
      where('isDiscoverable', '==', true),
      limit(50)
    );

    return onSnapshot(
      q,
      (snapshot) => {
        let makers: DiscoverableMakerProfile[] = [];
        snapshot.forEach((d) => {
          makers.push(d.data() as DiscoverableMakerProfile);
        });

        // In-memory filters for compound criteria
        if (filters?.experience) {
          makers = makers.filter((m) => m.experience === filters.experience);
        }
        if (filters?.skill) {
          makers = makers.filter((m) =>
            m.skills.some((s) => s.toLowerCase().includes(filters.skill!.toLowerCase()))
          );
        }
        if (filters?.interest) {
          makers = makers.filter((m) =>
            m.interests.some((i) => i.toLowerCase().includes(filters.interest!.toLowerCase()))
          );
        }
        if (filters?.mentorOnly) {
          makers = makers.filter((m) => m.isMentor);
        }

        onData(makers);
      },
      (error) => {
        console.error(`[Firestore Error on ${collPath}]`, error);
        if (onError) onError(error);
      }
    );
  }

  // ========================================================
  // 6. PHASE 4B1: Mentorship Tickets (mentorship_tickets/{ticketId})
  // ========================================================

  static async createMentorshipTicket(
    ticket: Omit<CloudMentorshipTicket, 'id' | 'createdAt' | 'updatedAt' | 'responses'>
  ): Promise<string> {
    if (!db) throw new Error('Database unavailable.');
    const ticketId = `ticket-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
    const docPath = `mentorship_tickets/${ticketId}`;
    const nowIso = new Date().toISOString();

    const cleanTicket: CloudMentorshipTicket = {
      ...ticket,
      id: ticketId,
      question: ticket.question.slice(0, 1000),
      notesOrCode: (ticket.notesOrCode || '').slice(0, 2000),
      status: 'open',
      responses: [],
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    try {
      await setDoc(doc(db, 'mentorship_tickets', ticketId), cleanTicket);
      return ticketId;
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, docPath);
    }
  }

  static subscribeToUserMentorshipTickets(
    uid: string,
    onData: (tickets: CloudMentorshipTicket[]) => void,
    onError?: (err: Error) => void
  ): Unsubscribe {
    if (!db) {
      onData([]);
      return () => {};
    }

    const collPath = 'mentorship_tickets';
    // Subscriptions for tickets where user is requester
    const qRequester = query(
      collection(db, collPath),
      where('requesterId', '==', uid),
      limit(50)
    );

    // Subscriptions for tickets where user is assigned mentor
    const qMentor = query(
      collection(db, collPath),
      where('mentorId', '==', uid),
      limit(50)
    );

    let requesterTickets: CloudMentorshipTicket[] = [];
    let mentorTickets: CloudMentorshipTicket[] = [];

    const emit = () => {
      const mergedMap = new Map<string, CloudMentorshipTicket>();
      requesterTickets.forEach((t) => mergedMap.set(t.id, t));
      mentorTickets.forEach((t) => mergedMap.set(t.id, t));
      const sorted = Array.from(mergedMap.values()).sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      onData(sorted);
    };

    const unsub1 = onSnapshot(
      qRequester,
      (snap) => {
        requesterTickets = snap.docs.map((d) => d.data() as CloudMentorshipTicket);
        emit();
      },
      (err) => onError && onError(err)
    );

    const unsub2 = onSnapshot(
      qMentor,
      (snap) => {
        mentorTickets = snap.docs.map((d) => d.data() as CloudMentorshipTicket);
        emit();
      },
      (err) => onError && onError(err)
    );

    return () => {
      unsub1();
      unsub2();
    };
  }

  static async sendMentorshipResponse(
    ticketId: string,
    reply: { authorId: string; content: string; authorDisplayName?: string },
    firestoreDb: Firestore | any = db
  ): Promise<string> {
    if (!firestoreDb) throw new Error('Database unavailable.');
    const responseId = `resp-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
    const docPath = `mentorship_tickets/${ticketId}/responses/${responseId}`;

    const newResponse = {
      id: responseId,
      ticketId,
      authorId: reply.authorId,
      authorDisplayName: (reply.authorDisplayName || '').slice(0, 100),
      content: reply.content.slice(0, 2000),
      createdAt: new Date().toISOString(),
    };

    try {
      await setDoc(doc(firestoreDb, 'mentorship_tickets', ticketId, 'responses', responseId), newResponse);
      return responseId;
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, docPath);
    }
  }

  static subscribeToMentorshipResponses(
    ticketId: string,
    onData: (responses: any[]) => void,
    onError?: (err: Error) => void,
    firestoreDb: Firestore | any = db
  ): Unsubscribe {
    if (!firestoreDb) {
      onData([]);
      return () => {};
    }

    const collRef = collection(firestoreDb, 'mentorship_tickets', ticketId, 'responses');
    const q = query(collRef, orderBy('createdAt', 'asc'));

    return onSnapshot(
      q,
      (snapshot) => {
        const responses: any[] = [];
        snapshot.forEach((d) => responses.push(d.data()));
        onData(responses);
      },
      (error) => {
        if (onError) onError(error);
      }
    );
  }

  static async respondToMentorshipTicket(
    ticketId: string,
    reply: { authorId: string; authorDisplayName: string; content: string },
    firestoreDb: Firestore | any = db
  ): Promise<void> {
    if (!firestoreDb) return;
    const docPath = `mentorship_tickets/${ticketId}`;
    try {
      const snap = await getDoc(doc(firestoreDb, 'mentorship_tickets', ticketId));
      if (!snap.exists()) return;
      const current = snap.data() as CloudMentorshipTicket;

      await this.sendMentorshipResponse(ticketId, reply, firestoreDb);

      if (current.status === 'open' && reply.authorId === current.mentorId) {
        await updateDoc(doc(firestoreDb, 'mentorship_tickets', ticketId), {
          status: 'accepted',
          updatedAt: new Date().toISOString(),
        });
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, docPath);
    }
  }

  static async updateMentorshipTicketStatus(
    ticketId: string,
    status: CloudMentorshipTicket['status'],
    resolvedAt?: string
  ): Promise<void> {
    if (!db) return;
    const docPath = `mentorship_tickets/${ticketId}`;
    try {
      const updateData: Record<string, any> = {
        status,
        updatedAt: new Date().toISOString(),
      };
      if (resolvedAt || status === 'resolved') {
        updateData.resolvedAt = resolvedAt || new Date().toISOString();
      }
      await updateDoc(doc(db, 'mentorship_tickets', ticketId), updateData);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, docPath);
    }
  }

  // ========================================================
  // 7. PHASE 4B2: Explicit Component Sharing (shared_components/{shareId})
  // ========================================================

  static async shareComponentForCollaboration(
    uid: string,
    item: ComponentItem,
    ownerDisplayName: string
  ): Promise<void> {
    if (!db) return;
    const shareId = `${uid}_${item.id}`.replace(/[^a-zA-Z0-9_-]/g, '_');
    const docPath = `shared_components/${shareId}`;

    const cleanShare: SharedComponentRecord = {
      id: shareId,
      ownerId: uid,
      ownerDisplayName: ownerDisplayName.slice(0, 100),
      inventoryItemId: item.id,
      catalogId: item.catalogId.slice(0, 100),
      name: item.name.slice(0, 150),
      category: item.category,
      quantity: Math.max(
        1,
        Math.min(
          item.totalQuantity,
          item.totalQuantity - item.reservedQuantity - item.installedQuantity
        )
      ),
      condition: 'working', // Only working condition is eligible for collaborative sharing
      verificationStatus: item.verificationStatus,
      unitMassGrams: item.unitMassGrams,
      isShared: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    try {
      await setDoc(doc(db, 'shared_components', shareId), cleanShare);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, docPath);
    }
  }

  static async unshareComponent(uid: string, itemId: string): Promise<void> {
    if (!db) return;
    const shareId = `${uid}_${itemId}`.replace(/[^a-zA-Z0-9_-]/g, '_');
    const docPath = `shared_components/${shareId}`;
    try {
      await deleteDoc(doc(db, 'shared_components', shareId));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, docPath);
    }
  }

  static subscribeToSharedComponents(
    onData: (shares: SharedComponentRecord[]) => void,
    onError?: (err: Error) => void
  ): Unsubscribe {
    if (!db) {
      onData([]);
      return () => {};
    }

    const collPath = 'shared_components';
    const q = query(
      collection(db, collPath),
      where('isShared', '==', true),
      limit(100)
    );

    return onSnapshot(
      q,
      (snapshot) => {
        const shares: SharedComponentRecord[] = [];
        snapshot.forEach((d) => shares.push(d.data() as SharedComponentRecord));
        onData(shares);
      },
      (error) => {
        console.error(`[Firestore Error on ${collPath}]`, error);
        if (onError) onError(error);
      }
    );
  }

  // ========================================================
  // 8. PHASE 4B2: Cloud Collaboration Proposals & Workspaces
  // ========================================================

  static async sendCloudProposal(proposal: CloudProposalRecord): Promise<void> {
    if (!db) return;
    const docPath = `collaboration_proposals/${proposal.id}`;
    try {
      await setDoc(doc(db, 'collaboration_proposals', proposal.id), {
        ...proposal,
        createdAt: proposal.createdAt || new Date().toISOString(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, docPath);
    }
  }

  static subscribeToUserProposals(
    uid: string,
    onData: (proposals: CloudProposalRecord[]) => void,
    onError?: (err: Error) => void
  ): Unsubscribe {
    if (!db) {
      onData([]);
      return () => {};
    }

    const collPath = 'collaboration_proposals';
    const qSender = query(
      collection(db, collPath),
      where('senderId', '==', uid),
      limit(50)
    );
    const qReceiver = query(
      collection(db, collPath),
      where('receiverId', '==', uid),
      limit(50)
    );

    let senderProposals: CloudProposalRecord[] = [];
    let receiverProposals: CloudProposalRecord[] = [];

    const emit = () => {
      const mergedMap = new Map<string, CloudProposalRecord>();
      senderProposals.forEach((p) => mergedMap.set(p.id, p));
      receiverProposals.forEach((p) => mergedMap.set(p.id, p));
      const sorted = Array.from(mergedMap.values()).sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      onData(sorted);
    };

    const unsub1 = onSnapshot(
      qSender,
      (snap) => {
        senderProposals = snap.docs.map((d) => d.data() as CloudProposalRecord);
        emit();
      },
      (err) => onError && onError(err)
    );

    const unsub2 = onSnapshot(
      qReceiver,
      (snap) => {
        receiverProposals = snap.docs.map((d) => d.data() as CloudProposalRecord);
        emit();
      },
      (err) => onError && onError(err)
    );

    return () => {
      unsub1();
      unsub2();
    };
  }

  static async updateCloudProposalStatus(
    proposalId: string,
    status: CloudProposalRecord['status'],
    responseData?: { workspaceId?: string; rejectionReason?: string }
  ): Promise<void> {
    if (!db) return;
    const docPath = `collaboration_proposals/${proposalId}`;
    try {
      await updateDoc(doc(db, 'collaboration_proposals', proposalId), {
        status,
        respondedAt: new Date().toISOString(),
        ...(responseData || {}),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, docPath);
    }
  }

  static async createCloudWorkspace(
    workspace: CloudWorkspaceRecord
  ): Promise<string> {
    if (!db) throw new Error('Database unavailable.');
    const docPath = `project_workspaces/${workspace.id}`;
    try {
      await setDoc(doc(db, 'project_workspaces', workspace.id), {
        ...workspace,
        createdAt: workspace.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      return workspace.id;
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, docPath);
    }
  }

  static subscribeToUserWorkspaces(
    uid: string,
    onData: (workspaces: CloudWorkspaceRecord[]) => void,
    onError?: (err: Error) => void
  ): Unsubscribe {
    if (!db) {
      onData([]);
      return () => {};
    }

    const collPath = 'project_workspaces';
    const q = query(
      collection(db, collPath),
      where('memberIds', 'array-contains', uid),
      limit(50)
    );

    return onSnapshot(
      q,
      (snap) => {
        const list = snap.docs.map((d) => d.data() as CloudWorkspaceRecord);
        onData(list);
      },
      (err) => onError && onError(err)
    );
  }

  static async addCloudWorkspaceTask(
    workspaceId: string,
    task: Omit<WorkspaceTask, 'id' | 'createdAt'>
  ): Promise<void> {
    if (!db) return;
    const docPath = `project_workspaces/${workspaceId}`;
    try {
      const snap = await getDoc(doc(db, 'project_workspaces', workspaceId));
      if (!snap.exists()) return;
      const ws = snap.data() as CloudWorkspaceRecord;
      const newTask: WorkspaceTask = {
        ...task,
        id: `task-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
        workspaceId,
        createdAt: new Date().toISOString(),
      };
      await updateDoc(doc(db, 'project_workspaces', workspaceId), {
        tasks: [...ws.tasks, newTask],
        updatedAt: new Date().toISOString(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, docPath);
    }
  }

  static async updateCloudWorkspaceTask(
    workspaceId: string,
    task: WorkspaceTask
  ): Promise<void> {
    if (!db) return;
    const docPath = `project_workspaces/${workspaceId}`;
    try {
      const snap = await getDoc(doc(db, 'project_workspaces', workspaceId));
      if (!snap.exists()) return;
      const ws = snap.data() as CloudWorkspaceRecord;
      const updated = ws.tasks.map((t) => (t.id === task.id ? task : t));
      await updateDoc(doc(db, 'project_workspaces', workspaceId), {
        tasks: updated,
        updatedAt: new Date().toISOString(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, docPath);
    }
  }

  static async deleteCloudWorkspaceTask(
    workspaceId: string,
    taskId: string
  ): Promise<void> {
    if (!db) return;
    const docPath = `project_workspaces/${workspaceId}`;
    try {
      const snap = await getDoc(doc(db, 'project_workspaces', workspaceId));
      if (!snap.exists()) return;
      const ws = snap.data() as CloudWorkspaceRecord;
      const updated = ws.tasks.filter((t) => t.id !== taskId);
      await updateDoc(doc(db, 'project_workspaces', workspaceId), {
        tasks: updated,
        updatedAt: new Date().toISOString(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, docPath);
    }
  }

  static async sendWorkspaceMessage(
    workspaceId: string,
    message: { authorId: string; content: string; authorDisplayName?: string },
    firestoreDb: Firestore | any = db
  ): Promise<string> {
    if (!firestoreDb) throw new Error('Database unavailable');
    const messageId = `msg-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
    const docPath = `project_workspaces/${workspaceId}/messages/${messageId}`;

    const docData: Record<string, any> = {
      id: messageId,
      workspaceId,
      authorId: message.authorId,
      content: message.content.slice(0, 2000),
      createdAt: new Date().toISOString(),
    };
    if (message.authorDisplayName) {
      docData.authorDisplayName = message.authorDisplayName.slice(0, 100);
    }

    try {
      await setDoc(doc(firestoreDb, 'project_workspaces', workspaceId, 'messages', messageId), docData);
      return messageId;
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, docPath);
    }
  }

  static subscribeToWorkspaceMessages(
    workspaceId: string,
    onData: (messages: WorkspaceMessage[]) => void,
    onError?: (err: Error) => void,
    firestoreDb: Firestore | any = db
  ): Unsubscribe {
    if (!firestoreDb) {
      onData([]);
      return () => {};
    }

    const collRef = collection(firestoreDb, 'project_workspaces', workspaceId, 'messages');
    const q = query(collRef, orderBy('createdAt', 'asc'));

    return onSnapshot(
      q,
      (snapshot) => {
        const messages: WorkspaceMessage[] = [];
        snapshot.forEach((d) => messages.push(d.data() as WorkspaceMessage));
        onData(messages);
      },
      (error) => {
        if (onError) onError(error);
      }
    );
  }

  static async addCloudWorkspaceMessage(
    workspaceId: string,
    message: { authorId: string; content: string; authorDisplayName?: string },
    firestoreDb: Firestore | any = db
  ): Promise<string> {
    return this.sendWorkspaceMessage(workspaceId, message, firestoreDb);
  }

  static async cancelCloudWorkspace(
    workspaceId: string,
    firestoreDb: Firestore | any = db
  ): Promise<void> {
    if (!firestoreDb) return;
    const docPath = `project_workspaces/${workspaceId}`;
    try {
      await updateDoc(doc(firestoreDb, 'project_workspaces', workspaceId), {
        status: 'cancelled',
        updatedAt: new Date().toISOString(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, docPath);
    }
  }

  static async leaveWorkspace(
    workspaceId: string,
    memberUid: string,
    firestoreDb: Firestore | any = db
  ): Promise<void> {
    if (!firestoreDb) throw new Error('Database unavailable');
    const docPath = `project_workspaces/${workspaceId}`;
    try {
      const snap = await getDoc(doc(firestoreDb, 'project_workspaces', workspaceId));
      if (!snap.exists()) throw new Error('Workspace not found');
      const ws = snap.data() as CloudWorkspaceRecord;
      if (ws.creatorId === memberUid) {
        throw new Error('Creator cannot self-remove from workspace.');
      }
      if (!ws.memberIds.includes(memberUid)) {
        throw new Error('User is not a member of this workspace.');
      }
      const updatedMembers = ws.memberIds.filter((id) => id !== memberUid);
      const updatedRoles = { ...(ws.memberRoles || {}) };
      delete updatedRoles[memberUid];

      await updateDoc(doc(firestoreDb, 'project_workspaces', workspaceId), {
        memberIds: updatedMembers,
        memberRoles: updatedRoles,
        updatedAt: new Date().toISOString(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, docPath);
    }
  }

  static async addWorkspaceMember(
    workspaceId: string,
    newMemberId: string,
    acceptedProposalId: string,
    role?: string,
    firestoreDb: Firestore | any = db
  ): Promise<void> {
    if (!firestoreDb) throw new Error('Database unavailable');
    const docPath = `project_workspaces/${workspaceId}`;
    try {
      const snap = await getDoc(doc(firestoreDb, 'project_workspaces', workspaceId));
      if (!snap.exists()) throw new Error('Workspace not found');
      const ws = snap.data() as CloudWorkspaceRecord;
      if (ws.memberIds.includes(newMemberId)) {
        throw new Error('Maker is already a member.');
      }
      const updatedMembers = [...ws.memberIds, newMemberId];
      const updatedRoles = { ...(ws.memberRoles || {}) };
      if (role) updatedRoles[newMemberId] = role;

      await updateDoc(doc(firestoreDb, 'project_workspaces', workspaceId), {
        memberIds: updatedMembers,
        memberRoles: updatedRoles,
        acceptedProposalId,
        updatedAt: new Date().toISOString(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, docPath);
    }
  }

  static async saveWorkspaceGuideProgress(
    workspaceId: string,
    progress: {
      projectId: string;
      recipeVersion: string;
      currentStepIndex: number;
      completedStepIndices?: number[];
      playbackSpeed?: number;
      isLearningCompleted?: boolean;
    },
    authorUid: string,
    firestoreDb: Firestore | any = db
  ): Promise<void> {
    if (!firestoreDb) throw new Error('Database unavailable');
    const progressId = `${progress.projectId}_${progress.recipeVersion}`;
    const docPath = `project_workspaces/${workspaceId}/guideProgress/${progressId}`;

    const cleanProgress: Record<string, any> = {
      progressId,
      projectId: progress.projectId,
      recipeVersion: progress.recipeVersion,
      currentStepIndex: Math.floor(progress.currentStepIndex),
      completedStepIndices: progress.completedStepIndices || [],
      lastUpdated: new Date().toISOString(),
      lastUpdatedBy: authorUid,
    };
    if (progress.playbackSpeed !== undefined) cleanProgress.playbackSpeed = progress.playbackSpeed;
    if (progress.isLearningCompleted !== undefined) cleanProgress.isLearningCompleted = progress.isLearningCompleted;

    try {
      await setDoc(doc(firestoreDb, 'project_workspaces', workspaceId, 'guideProgress', progressId), cleanProgress, {
        merge: true,
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, docPath);
    }
  }

  static subscribeToWorkspaceGuideProgress(
    workspaceId: string,
    projectId: string,
    recipeVersion: string,
    onData: (progress: any | null) => void,
    onError?: (err: Error) => void,
    firestoreDb: Firestore | any = db
  ): Unsubscribe {
    if (!firestoreDb) {
      onData(null);
      return () => {};
    }

    const progressId = `${projectId}_${recipeVersion}`;
    return onSnapshot(
      doc(firestoreDb, 'project_workspaces', workspaceId, 'guideProgress', progressId),
      (snap) => {
        if (snap.exists()) {
          onData(snap.data());
        } else {
          onData(null);
        }
      },
      (error) => {
        if (onError) onError(error);
      }
    );
  }

  static async reserveStockTransaction(
    requests: ComponentReservationRequest[],
    workspaceId: string,
    firestoreDb: Firestore | any = db
  ): Promise<ReservationResult> {
    if (!firestoreDb) throw new Error('Database unavailable');
    const reservationId = `res-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;

    return await runTransaction(firestoreDb, async (transaction) => {
      // 1. Transactional reads of all items
      const reads: Array<{ ref: any; data: ComponentItem; requestedQty: number }> = [];

      for (const req of requests) {
        const itemRef = doc(firestoreDb, 'users', req.ownerUid, 'inventory', req.itemId);
        const snap = await transaction.get(itemRef);
        if (!snap.exists()) {
          throw new Error(`Inventory item ${req.itemId} not found for user ${req.ownerUid}`);
        }
        const data = snap.data() as ComponentItem;
        const available = data.totalQuantity - (data.reservedQuantity || 0) - (data.installedQuantity || 0);
        if (available < req.quantity) {
          throw new Error(
            `Insufficient available stock for ${data.name}. Available: ${available}, requested: ${req.quantity}`
          );
        }
        reads.push({ ref: itemRef, data, requestedQty: req.quantity });
      }

      // 2. Transactional writes
      for (const { ref, data, requestedQty } of reads) {
        const newReserved = (data.reservedQuantity || 0) + requestedQty;
        transaction.update(ref, {
          reservedQuantity: newReserved,
          lastUpdated: new Date().toISOString(),
        });
      }

      return { success: true, reservationId };
    });
  }

  static async releaseReservationTransaction(
    releases: ComponentReservationRequest[],
    firestoreDb: Firestore | any = db
  ): Promise<void> {
    if (!firestoreDb) throw new Error('Database unavailable');

    await runTransaction(firestoreDb, async (transaction) => {
      const reads: Array<{ ref: any; data: ComponentItem; releaseQty: number }> = [];

      for (const req of releases) {
        const itemRef = doc(firestoreDb, 'users', req.ownerUid, 'inventory', req.itemId);
        const snap = await transaction.get(itemRef);
        if (!snap.exists()) continue;
        const data = snap.data() as ComponentItem;
        reads.push({ ref: itemRef, data, releaseQty: req.quantity });
      }

      for (const { ref, data, releaseQty } of reads) {
        const currentReserved = data.reservedQuantity || 0;
        const newReserved = Math.max(0, currentReserved - releaseQty);
        transaction.update(ref, {
          reservedQuantity: newReserved,
          lastUpdated: new Date().toISOString(),
        });
      }
    });
  }

  static async acceptProposalTransaction(
    proposalId: string,
    receiverUid: string,
    workspaceId: string,
    firestoreDb: Firestore | any = db
  ): Promise<void> {
    if (!firestoreDb) throw new Error('Database unavailable');

    await runTransaction(firestoreDb, async (transaction) => {
      const propRef = doc(firestoreDb, 'collaboration_proposals', proposalId);
      const propSnap = await transaction.get(propRef);
      if (!propSnap.exists()) {
        throw new Error('Proposal not found');
      }
      const prop = propSnap.data() as CloudProposalRecord;
      if (prop.receiverId !== receiverUid) {
        throw new Error('Only the receiver can accept this proposal.');
      }
      if (prop.status !== 'pending') {
        throw new Error(`Proposal is already ${prop.status}; duplicate acceptance rejected.`);
      }

      transaction.update(propRef, {
        status: 'accepted',
        workspaceId,
        respondedAt: new Date().toISOString(),
      });
    });
  }

  static async recordPhysicalBuildAtomic(
    uid: string,
    params: PhysicalBuildAllocationParams,
    firestoreDb: Firestore | any = db
  ): Promise<PhysicalBuildResult> {
    if (!firestoreDb) throw new Error('Database unavailable');

    return await runTransaction(firestoreDb, async (transaction) => {
      const ledgerRef = doc(firestoreDb, 'users', uid, 'reuseLedger', params.operationId);
      const existingLedgerSnap = await transaction.get(ledgerRef);

      // Enforce operation idempotency: if ledger entry exists, return existing record without duplicate increments
      if (existingLedgerSnap.exists()) {
        const existingData = existingLedgerSnap.data() as ReuseLedgerEntry;
        return {
          success: true,
          isDuplicate: true,
          entryId: params.operationId,
          totalMassGrams: existingData.totalMassGrams || 0,
        };
      }

      // Read all inventory items first
      const itemReads: Array<{ ref: any; data: ComponentItem; allocQty: number }> = [];
      let totalCalculatedMass = 0;

      for (const alloc of params.allocations) {
        const itemRef = doc(firestoreDb, 'users', uid, 'inventory', alloc.inventoryItemId);
        const itemSnap = await transaction.get(itemRef);
        if (!itemSnap.exists()) {
          throw new Error(
            `Fabricated allocation rejected: Component ${alloc.inventoryItemId} does not exist in inventory.`
          );
        }
        const itemData = itemSnap.data() as ComponentItem;
        const total = itemData.totalQuantity || 0;
        const installed = itemData.installedQuantity || 0;
        const available = total - installed;

        if (available < alloc.quantity) {
          throw new Error(
            `Fabricated allocation rejected: Insufficient stock for ${itemData.name}. Needed: ${alloc.quantity}, available: ${available}`
          );
        }

        const mass = alloc.unitMassGrams ?? itemData.unitMassGrams ?? 0;
        totalCalculatedMass += (Number(mass) || 0) * alloc.quantity;

        itemReads.push({
          ref: itemRef,
          data: itemData,
          allocQty: alloc.quantity,
        });
      }

      // Update inventory items: release reserved, increment installed and reuseCycleCount
      for (const { ref, data, allocQty } of itemReads) {
        const newReserved = Math.max(0, (data.reservedQuantity || 0) - allocQty);
        const newInstalled = (data.installedQuantity || 0) + allocQty;
        const newCycleCount = (data.reuseCycleCount || 0) + 1;

        transaction.update(ref, {
          reservedQuantity: newReserved,
          installedQuantity: newInstalled,
          reuseCycleCount: newCycleCount,
          verificationStatus: 'user-reported-working',
          lastUpdated: new Date().toISOString(),
        });
      }

      // Create ledger entry: explicitly labeled user-reported (uncertified)
      const ledgerData: ReuseLedgerEntry = {
        id: params.operationId,
        timestamp: new Date().toISOString(),
        eventType: 'physical-build-completed',
        verificationLevel: 'user-reported',
        notes: (params.notes || '') + ' [user-reported physical assembly log (uncertified)]',
        totalMassGrams: totalCalculatedMass,
        makerId: uid,
        makerDisplayName: params.makerDisplayName,
        projectId: params.projectId,
        projectTitle: params.projectTitle,
        allocatedItems: params.allocations,
      };
      if (params.workspaceId) {
        ledgerData.workspaceId = params.workspaceId;
      }

      transaction.set(ledgerRef, ledgerData);

      return {
        success: true,
        isDuplicate: false,
        entryId: params.operationId,
        totalMassGrams: totalCalculatedMass,
      };
    });
  }

  static async recordBuildReversalAtomic(
    uid: string,
    buildOperationId: string,
    reversalOperationId: string,
    reason: string,
    firestoreDb: Firestore | any = db
  ): Promise<void> {
    if (!firestoreDb) throw new Error('Database unavailable');

    await runTransaction(firestoreDb, async (transaction) => {
      // 1. Check if reversal already exists
      const reversalRef = doc(firestoreDb, 'users', uid, 'reuseLedger', reversalOperationId);
      const revSnap = await transaction.get(reversalRef);
      if (revSnap.exists()) {
        throw new Error(
          `Repeated reversal rejected: Reversal operation ${reversalOperationId} has already been applied.`
        );
      }

      // 2. Read original build ledger record
      const buildRef = doc(firestoreDb, 'users', uid, 'reuseLedger', buildOperationId);
      const buildSnap = await transaction.get(buildRef);
      if (!buildSnap.exists()) {
        throw new Error(`Build allocation record ${buildOperationId} not found.`);
      }
      const buildData = buildSnap.data() as ReuseLedgerEntry;

      // 3. Read allocated inventory items
      const itemReads: Array<{ ref: any; data: ComponentItem; allocQty: number }> = [];
      const allocated = buildData.allocatedItems || [];

      for (const item of allocated) {
        const itemRef = doc(firestoreDb, 'users', uid, 'inventory', item.inventoryItemId);
        const itemSnap = await transaction.get(itemRef);
        if (itemSnap.exists()) {
          itemReads.push({
            ref: itemRef,
            data: itemSnap.data() as ComponentItem,
            allocQty: item.quantity,
          });
        }
      }

      // 4. Reverse inventory adjustments
      for (const { ref, data, allocQty } of itemReads) {
        const newInstalled = Math.max(0, (data.installedQuantity || 0) - allocQty);
        const newCycleCount = Math.max(0, (data.reuseCycleCount || 1) - 1);
        transaction.update(ref, {
          installedQuantity: newInstalled,
          reuseCycleCount: newCycleCount,
          lastUpdated: new Date().toISOString(),
        });
      }

      // 5. Append reversal ledger entry
      const reversalData: ReuseLedgerEntry = {
        id: reversalOperationId,
        timestamp: new Date().toISOString(),
        eventType: 'correction_reversal',
        verificationLevel: 'user-reported',
        notes: `${reason} (Reversal of ${buildOperationId}) [user-reported reversal log]`,
        totalMassGrams: buildData.totalMassGrams ?? null,
        makerId: uid,
        projectId: buildData.projectId,
        projectTitle: buildData.projectTitle,
      };
      if (buildData.workspaceId) {
        reversalData.workspaceId = buildData.workspaceId;
      }

      transaction.set(reversalRef, reversalData);
    });
  }

  // ========================================================
  // 9. PHASE 6: Physical Test Records & Reuse Accounting
  // ========================================================

  static async addPhysicalTestRecord(
    uid: string,
    itemId: string,
    record: ComponentTestRecord
  ): Promise<void> {
    if (!db) return;
    const docPath = `users/${uid}/inventory/${itemId}`;
    try {
      const snap = await getDoc(doc(db, 'users', uid, 'inventory', itemId));
      if (!snap.exists()) return;
      const item = snap.data() as ComponentItem;
      const currentRecords = item.testRecords || [];
      const updatedRecords = [...currentRecords, record];

      // Update verification status based on physical test record
      const updatedStatus =
        record.result === 'pass'
          ? 'recorded-test'
          : item.verificationStatus;

      await updateDoc(doc(db, 'users', uid, 'inventory', itemId), {
        testRecords: updatedRecords,
        verificationStatus: updatedStatus,
        lastUpdated: new Date().toISOString(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, docPath);
    }
  }

  static async recordReuseLedgerEntry(
    uid: string,
    entry: ReuseLedgerEntry
  ): Promise<void> {
    if (!db) return;
    const entryId = entry.id || `rl-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
    const docPath = `users/${uid}/reuseLedger/${entryId}`;
    try {
      await setDoc(doc(db, 'users', uid, 'reuseLedger', entryId), {
        ...entry,
        id: entryId,
        timestamp: entry.timestamp || new Date().toISOString(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, docPath);
    }
  }

  static subscribeToReuseLedger(
    uid: string,
    onData: (entries: ReuseLedgerEntry[]) => void,
    onError?: (err: Error) => void
  ): Unsubscribe {
    if (!db) {
      onData([]);
      return () => {};
    }

    const collPath = `users/${uid}/reuseLedger`;
    const collRef = collection(db, 'users', uid, 'reuseLedger');

    return onSnapshot(
      collRef,
      (snapshot) => {
        const entries: ReuseLedgerEntry[] = [];
        snapshot.forEach((d) => entries.push(d.data() as ReuseLedgerEntry));
        const sorted = entries.sort(
          (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );
        onData(sorted);
      },
      (error) => {
        console.error(`[Firestore Error on ${collPath}]`, error);
        if (onError) onError(error);
      }
    );
  }

  // ========================================================
  // 10. PHASE 7: Extensions (Listings, Showcase, Moderation, Orgs)
  // ========================================================

  static async publishExchangeListing(
    listing: ComponentExchangeListing
  ): Promise<void> {
    if (!db) return;
    const docPath = `component_exchange_listings/${listing.id}`;
    try {
      await setDoc(doc(db, 'component_exchange_listings', listing.id), {
        ...listing,
        createdAt: listing.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, docPath);
    }
  }

  static subscribeToExchangeListings(
    onData: (listings: ComponentExchangeListing[]) => void,
    onError?: (err: Error) => void
  ): Unsubscribe {
    if (!db) {
      onData([]);
      return () => {};
    }

    const collPath = 'component_exchange_listings';
    const q = query(
      collection(db, collPath),
      where('status', 'in', ['available', 'requested']),
      limit(50)
    );

    return onSnapshot(
      q,
      (snap) => {
        const list = snap.docs.map((d) => d.data() as ComponentExchangeListing);
        onData(list);
      },
      (err) => onError && onError(err)
    );
  }

  static async updateExchangeListingStatus(
    listingId: string,
    status: ComponentExchangeListing['status'],
    requesterId?: string,
    requesterDisplayName?: string
  ): Promise<void> {
    if (!db) return;
    const docPath = `component_exchange_listings/${listingId}`;
    try {
      const updateData: Record<string, any> = {
        status,
        updatedAt: new Date().toISOString(),
      };
      if (requesterId) updateData.requesterId = requesterId;
      if (requesterDisplayName) updateData.requesterDisplayName = requesterDisplayName;
      await updateDoc(doc(db, 'component_exchange_listings', listingId), updateData);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, docPath);
    }
  }

  static async publishShowcaseProject(showcase: ShowcaseProject): Promise<void> {
    if (!db) return;
    const docPath = `showcase_projects/${showcase.id}`;
    try {
      await setDoc(doc(db, 'showcase_projects', showcase.id), {
        ...showcase,
        createdAt: showcase.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, docPath);
    }
  }

  static subscribeToShowcaseProjects(
    onData: (projects: ShowcaseProject[]) => void,
    onError?: (err: Error) => void
  ): Unsubscribe {
    if (!db) {
      onData([]);
      return () => {};
    }

    const collPath = 'showcase_projects';
    const q = query(
      collection(db, collPath),
      where('isPublished', '==', true),
      limit(50)
    );

    return onSnapshot(
      q,
      (snap) => {
        const list = snap.docs.map((d) => d.data() as ShowcaseProject);
        onData(list);
      },
      (err) => onError && onError(err)
    );
  }

  static async submitModerationReport(report: ModerationReport): Promise<void> {
    if (!db) return;
    const docPath = `moderation_reports/${report.id}`;
    try {
      await setDoc(doc(db, 'moderation_reports', report.id), {
        ...report,
        createdAt: report.createdAt || new Date().toISOString(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, docPath);
    }
  }

  static async submitInteractionReview(
    review: Omit<VerifiedInteractionReview, 'id'> & { id?: string }
  ): Promise<void> {
    if (!db) return;
    const reviewId = `${review.interactionId}_${review.reviewerId}`;
    const docPath = `interaction_reviews/${reviewId}`;
    try {
      await setDoc(doc(db, 'interaction_reviews', reviewId), {
        ...review,
        id: reviewId,
        createdAt: review.createdAt || new Date().toISOString(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, docPath);
    }
  }

  static async getOrganizationInventory(
    orgId: string
  ): Promise<OrganizationInventory | null> {
    if (!db) return null;
    const docPath = `organizations/${orgId}`;
    try {
      const snap = await getDoc(doc(db, 'organizations', orgId));
      if (snap.exists()) {
        return snap.data() as OrganizationInventory;
      }
      return null;
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, docPath);
    }
  }

  // ==========================================
  // Eco Points System (Phase 2)
  // ==========================================

  static async awardEcoPoints(
    userId: string,
    tx: Omit<EcoPointTransaction, 'id' | 'createdAt'>
  ): Promise<EcoPointTransaction | null> {
    if (!db) return null;
    const txId = `tx-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
    const docPath = `eco_point_transactions/${txId}`;

    try {
      // Check deduplication
      if (tx.referenceType && tx.referenceId) {
        const dupQuery = query(
          collection(db, 'eco_point_transactions'),
          where('userId', '==', userId),
          where('referenceType', '==', tx.referenceType),
          where('referenceId', '==', tx.referenceId),
          limit(1)
        );
        const dupSnap = await getDocs(dupQuery);
        if (!dupSnap.empty) {
          console.warn('[EcoBuild] Eco points already awarded in cloud for:', tx.referenceType, tx.referenceId);
          return null;
        }
      }

      const fullTx: EcoPointTransaction = {
        ...tx,
        id: txId,
        userId,
        createdAt: new Date().toISOString(),
      };

      await setDoc(doc(db, 'eco_point_transactions', txId), fullTx);

      // Fetch user profile and discoverable profile to update total points and rank
      const userRef = doc(db, 'users', userId);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        const udata = userSnap.data();
        const currentPoints = (udata.ecoPoints || 0) + tx.points;
        const newRank = calculateEcoRank(currentPoints);
        await updateDoc(userRef, {
          ecoPoints: currentPoints,
          ecoRank: newRank,
          updatedAt: new Date().toISOString(),
        });

        // Also update discoverable_profiles if published
        const discRef = doc(db, 'discoverable_profiles', userId);
        const discSnap = await getDoc(discRef);
        if (discSnap.exists()) {
          await updateDoc(discRef, {
            ecoPoints: currentPoints,
            ecoRank: newRank,
            updatedAt: new Date().toISOString(),
          });
        }
      }

      return fullTx;
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, docPath);
      return null;
    }
  }

  static subscribeToEcoPointTransactions(
    userId: string,
    onData: (txs: EcoPointTransaction[]) => void,
    onError?: (err: Error) => void
  ): Unsubscribe {
    if (!db) {
      onData([]);
      return () => {};
    }

    const collPath = 'eco_point_transactions';
    const q = query(
      collection(db, collPath),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc'),
      limit(50)
    );

    return onSnapshot(
      q,
      (snap) => {
        const list = snap.docs.map((d) => d.data() as EcoPointTransaction);
        onData(list);
      },
      (err) => onError && onError(err)
    );
  }

  // ==========================================
  // Builder Progress & Completed Projects (Phase 3 & 10)
  // ==========================================

  static async recordCompletedProject(
    userId: string,
    record: Omit<CompletedProjectRecord, 'id' | 'completedAt'>
  ): Promise<CompletedProjectRecord | null> {
    if (!db) return null;
    const recordId = `cp-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
    const docPath = `completed_projects/${recordId}`;

    try {
      const fullRecord: CompletedProjectRecord = {
        ...record,
        id: recordId,
        userId,
        completedAt: new Date().toISOString(),
      };

      await setDoc(doc(db, 'completed_projects', recordId), fullRecord);

      // Award 50 physical build points
      await this.awardEcoPoints(userId, {
        userId,
        eventType: 'physical-build',
        points: ECO_POINT_VALUES['physical-build'],
        referenceType: 'project',
        referenceId: record.projectId,
        reason: `Verified physical completion of ${record.projectTitle}`,
        verificationSource: 'physical-ledger',
      });

      // Update user's verified completed projects count and builder rank
      const userRef = doc(db, 'users', userId);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        const udata = userSnap.data();
        const newCount = (udata.verifiedCompletedProjects || 0) + 1;
        const newRank = calculateBuilderRank(newCount);
        const updateObj: Record<string, any> = {
          verifiedCompletedProjects: newCount,
          builderRank: newRank,
          updatedAt: new Date().toISOString(),
        };
        if (record.difficulty === 'Advanced' || udata.highestDifficultyCompleted === 'Advanced') {
          updateObj.highestDifficultyCompleted = 'Advanced';
        } else if (record.difficulty === 'Intermediate' || udata.highestDifficultyCompleted === 'Intermediate') {
          updateObj.highestDifficultyCompleted = 'Intermediate';
        } else {
          updateObj.highestDifficultyCompleted = 'Beginner';
        }

        await updateDoc(userRef, updateObj);

        // Also sync to discoverable profile if exists
        const discRef = doc(db, 'discoverable_profiles', userId);
        const discSnap = await getDoc(discRef);
        if (discSnap.exists()) {
          await updateDoc(discRef, updateObj);
        }
      }

      return fullRecord;
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, docPath);
      return null;
    }
  }

  static subscribeToCompletedProjects(
    userId: string,
    onData: (records: CompletedProjectRecord[]) => void,
    onError?: (err: Error) => void
  ): Unsubscribe {
    if (!db) {
      onData([]);
      return () => {};
    }

    const collPath = 'completed_projects';
    const q = query(
      collection(db, collPath),
      where('userId', '==', userId),
      orderBy('completedAt', 'desc'),
      limit(50)
    );

    return onSnapshot(
      q,
      (snap) => {
        const list = snap.docs.map((d) => d.data() as CompletedProjectRecord);
        onData(list);
      },
      (err) => onError && onError(err)
    );
  }

  // ==========================================
  // Atomic Exchange Transfer (Phase 9)
  // ==========================================

  static async completeExchangeAtomicTransfer(
    listingId: string,
    recipientId: string,
    recipientDisplayName: string
  ): Promise<{ success: boolean; error?: string }> {
    if (!db) return { success: false, error: 'Database not initialized' };

    try {
      const listingRef = doc(db, 'component_exchange_listings', listingId);
      const listingSnap = await getDoc(listingRef);
      if (!listingSnap.exists()) return { success: false, error: 'Listing not found' };
      const listing = listingSnap.data() as ComponentExchangeListing;

      if (listing.status === 'completed') {
        return { success: false, error: 'Listing has already been completed' };
      }

      // Update listing
      await updateDoc(listingRef, {
        status: 'completed',
        completedAt: new Date().toISOString(),
        requesterId: recipientId,
        requesterDisplayName: recipientDisplayName,
        updatedAt: new Date().toISOString(),
      });

      // Deduct from seller's inventory if item exists
      if (listing.componentInventoryId) {
        const sellerInvRef = doc(db, 'users', listing.ownerId, 'inventory', listing.componentInventoryId);
        const sellerInvSnap = await getDoc(sellerInvRef);
        if (sellerInvSnap.exists()) {
          const sellerItem = sellerInvSnap.data() as ComponentItem;
          const newQty = Math.max(0, sellerItem.totalQuantity - listing.quantity);
          await updateDoc(sellerInvRef, {
            totalQuantity: newQty,
            lastUpdated: new Date().toISOString(),
          });
        }
      }

      // Add to recipient's inventory
      const recItemId = `item-ex-${Date.now().toString(36)}`;
      const recItemRef = doc(db, 'users', recipientId, 'inventory', recItemId);
      await setDoc(recItemRef, {
        id: recItemId,
        ownerId: recipientId,
        catalogId: listing.catalogId,
        name: listing.componentName || listing.name || 'Component',
        category: listing.category,
        totalQuantity: listing.quantity,
        reservedQuantity: 0,
        installedQuantity: 0,
        condition: listing.condition,
        source: 'salvaged',
        unitMassGrams: 35,
        verificationStatus: (listing.verificationStatus || 'untested') as any,
        lastUpdated: new Date().toISOString(),
        isSharedForCollaboration: false,
        reuseCycleCount: 1,
      });

      // Record reuse ledger entry for seller
      const sellerLedgerId = `rl-ex-donor-${Date.now().toString(36)}`;
      const sellerLedgerRef = doc(db, 'users', listing.ownerId, 'reuseLedger', sellerLedgerId);
      await setDoc(sellerLedgerRef, {
        id: sellerLedgerId,
        action: 'physical-build',
        projectName: `Exchange Transfer: ${listing.componentName || listing.name || 'Component'}`,
        timestamp: new Date().toISOString(),
        unitMassGrams: (listing.quantity || 1) * 35,
        notes: `Donated ${listing.quantity} unit(s) of ${listing.componentName || listing.name} to ${recipientDisplayName}`,
        allocatedItems: [
          {
            inventoryItemId: listing.componentInventoryId || 'inv-unknown',
            catalogId: listing.catalogId,
            name: listing.componentName || listing.name || 'Component',
            quantity: listing.quantity,
            unitMassGrams: 35,
          },
        ],
      });

      // Award Eco Points to both
      await this.awardEcoPoints(listing.ownerId, {
        userId: listing.ownerId,
        eventType: 'exchange-completed',
        points: ECO_POINT_VALUES['exchange-completed'],
        referenceType: 'exchange',
        referenceId: listing.id,
        reason: `Donated surplus ${listing.componentName} to peer maker`,
        verificationSource: 'peer-exchange',
      });

      await this.awardEcoPoints(recipientId, {
        userId: recipientId,
        eventType: 'exchange-completed',
        points: ECO_POINT_VALUES['exchange-completed'],
        referenceType: 'exchange',
        referenceId: listing.id,
        reason: `Received and saved ${listing.componentName} from e-waste`,
        verificationSource: 'peer-exchange',
      });

      return { success: true };
    } catch (err: any) {
      console.error('Failed completeExchangeAtomicTransfer:', err);
      return { success: false, error: err?.message || 'Transfer failed' };
    }
  }

  static subscribeToDiscoverableProfiles(
    onData: (profiles: DiscoverableMakerProfile[]) => void,
    onError?: (err: Error) => void
  ): Unsubscribe {
    if (!db) {
      onData([]);
      return () => {};
    }

    const collPath = 'discoverable_profiles';
    const q = query(
      collection(db, collPath),
      where('isDiscoverable', '==', true),
      limit(50)
    );

    return onSnapshot(
      q,
      (snap) => {
        const list = snap.docs.map((d) => d.data() as DiscoverableMakerProfile);
        onData(list);
      },
      (err) => onError && onError(err)
    );
  }
}
