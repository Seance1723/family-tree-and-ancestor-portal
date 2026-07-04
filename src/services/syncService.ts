import { 
  db, 
  collection, 
  doc, 
  setDoc, 
  deleteDoc, 
  getDocs, 
  getDoc,
  query, 
  where 
} from "./firebase";
import { 
  FamilyMember, 
  HistoricalDocument, 
  AnniversaryReminder,
  LineageAccessRequest
} from "../types";
import {
  saveOfflineMember,
  deleteOfflineMember,
  getOfflineMembers,
  saveOfflineDocument,
  deleteOfflineDocument,
  getOfflineDocuments,
  saveOfflineReminder,
  deleteOfflineReminder,
  getOfflineReminders
} from "../utils/indexedDB";

// Collection names
const MEMBERS_COLL = "family_members";
const DOCS_COLL = "historical_documents";
const REMINDERS_COLL = "reminders";

// Helper to check network status
export function isOnline(): boolean {
  return navigator.onLine;
}

// -----------------------------------------------------------------------------
// SYNC ENGINE - PUSH & PULL DATA
// -----------------------------------------------------------------------------
export async function syncDatabase(userId: string): Promise<{
  pushed: number;
  pulled: number;
  errors: string[];
}> {
  const result = { pushed: 0, pulled: 0, errors: [] as string[] };
  if (!isOnline()) return result;

  try {
    // 1. PUSH MEMBERS
    const localMembers = await getOfflineMembers();
    for (const member of localMembers) {
      if (member.userId !== userId) continue;
      
      if (member.pendingSync === "delete") {
        try {
          await deleteDoc(doc(db, MEMBERS_COLL, member.id));
          await deleteOfflineMember(member.id);
          result.pushed++;
        } catch (err: any) {
          result.errors.push(`Failed to delete member ${member.name}: ${err.message}`);
        }
      } else if (member.pendingSync === "create" || member.pendingSync === "update" || !member.synced) {
        try {
          const { synced, pendingSync, ...firestoreData } = member;
          await setDoc(doc(db, MEMBERS_COLL, member.id), firestoreData);
          await saveOfflineMember({ ...member, synced: true, pendingSync: null });
          result.pushed++;
        } catch (err: any) {
          result.errors.push(`Failed to sync member ${member.name}: ${err.message}`);
        }
      }
    }

    // 2. PUSH DOCUMENTS
    const localDocs = await getOfflineDocuments();
    for (const d of localDocs) {
      if (d.userId !== userId) continue;

      if (d.pendingSync === "delete") {
        try {
          await deleteDoc(doc(db, DOCS_COLL, d.id));
          await deleteOfflineDocument(d.id);
          result.pushed++;
        } catch (err: any) {
          result.errors.push(`Failed to delete document ${d.title}: ${err.message}`);
        }
      } else if (d.pendingSync === "create" || d.pendingSync === "update" || !d.synced) {
        try {
          const { synced, pendingSync, ...firestoreData } = d;
          await setDoc(doc(db, DOCS_COLL, d.id), firestoreData);
          await saveOfflineDocument({ ...d, synced: true, pendingSync: null });
          result.pushed++;
        } catch (err: any) {
          result.errors.push(`Failed to sync document ${d.title}: ${err.message}`);
        }
      }
    }

    // 3. PUSH REMINDERS
    const localReminders = await getOfflineReminders();
    for (const r of localReminders) {
      if (r.userId !== userId) continue;

      if (r.pendingSync === "delete") {
        try {
          await deleteDoc(doc(db, REMINDERS_COLL, r.id));
          await deleteOfflineReminder(r.id);
          result.pushed++;
        } catch (err: any) {
          result.errors.push(`Failed to delete reminder ${r.title}: ${err.message}`);
        }
      } else if (r.pendingSync === "create" || r.pendingSync === "update" || !r.synced) {
        try {
          const { synced, pendingSync, ...firestoreData } = r;
          await setDoc(doc(db, REMINDERS_COLL, r.id), firestoreData);
          await saveOfflineReminder({ ...r, synced: true, pendingSync: null });
          result.pushed++;
        } catch (err: any) {
          result.errors.push(`Failed to sync reminder ${r.title}: ${err.message}`);
        }
      }
    }

    // 4. PULL RECENT MEMBERS
    try {
      const memberQuery = query(collection(db, MEMBERS_COLL), where("userId", "==", userId));
      const memberSnap = await getDocs(memberQuery);
      const syncedIds = new Set<string>();
      
      memberSnap.forEach((d) => {
        const data = d.data() as FamilyMember;
        syncedIds.add(data.id);
        saveOfflineMember({ ...data, synced: true, pendingSync: null });
        result.pulled++;
      });

      // Remove local items not in server (and not pending sync)
      const currentLocals = await getOfflineMembers();
      for (const lm of currentLocals) {
        if (lm.userId === userId && !syncedIds.has(lm.id) && !lm.pendingSync) {
          await deleteOfflineMember(lm.id);
        }
      }
    } catch (err: any) {
      result.errors.push(`Failed to pull members: ${err.message}`);
    }

    // 5. PULL RECENT DOCUMENTS
    try {
      const docQuery = query(collection(db, DOCS_COLL), where("userId", "==", userId));
      const docSnap = await getDocs(docQuery);
      const syncedDocIds = new Set<string>();

      docSnap.forEach((d) => {
        const data = d.data() as HistoricalDocument;
        syncedDocIds.add(data.id);
        saveOfflineDocument({ ...data, synced: true, pendingSync: null });
        result.pulled++;
      });

      const currentLocalDocs = await getOfflineDocuments();
      for (const ld of currentLocalDocs) {
        if (ld.userId === userId && !syncedDocIds.has(ld.id) && !ld.pendingSync) {
          await deleteOfflineDocument(ld.id);
        }
      }
    } catch (err: any) {
      result.errors.push(`Failed to pull documents: ${err.message}`);
    }

    // 6. PULL RECENT REMINDERS
    try {
      const remQuery = query(collection(db, REMINDERS_COLL), where("userId", "==", userId));
      const remSnap = await getDocs(remQuery);
      const syncedRemIds = new Set<string>();

      remSnap.forEach((d) => {
        const data = d.data() as AnniversaryReminder;
        syncedRemIds.add(data.id);
        saveOfflineReminder({ ...data, synced: true, pendingSync: null });
        result.pulled++;
      });

      const currentLocalRems = await getOfflineReminders();
      for (const lr of currentLocalRems) {
        if (lr.userId === userId && !syncedRemIds.has(lr.id) && !lr.pendingSync) {
          await deleteOfflineReminder(lr.id);
        }
      }
    } catch (err: any) {
      result.errors.push(`Failed to pull reminders: ${err.message}`);
    }

  } catch (error: any) {
    result.errors.push(`General sync error: ${error.message}`);
  }

  return result;
}

// -----------------------------------------------------------------------------
// CORE BUSINESS LOGIC ACTIONS (MUTATIONS)
// -----------------------------------------------------------------------------

// MEMBERS
export async function addOrUpdateMember(member: FamilyMember): Promise<FamilyMember> {
  // 1. Save to Offline DB first
  const updatedMember = { ...member };
  
  if (isOnline()) {
    try {
      const { synced, pendingSync, ...firestoreData } = updatedMember;
      await setDoc(doc(db, MEMBERS_COLL, member.id), firestoreData);
      updatedMember.synced = true;
      updatedMember.pendingSync = null;
    } catch (e) {
      console.warn("Write to Firestore failed, queueing offline:", e);
      updatedMember.synced = false;
      updatedMember.pendingSync = member.pendingSync || "update";
    }
  } else {
    updatedMember.synced = false;
    updatedMember.pendingSync = member.pendingSync || "update";
  }

  await saveOfflineMember(updatedMember);
  return updatedMember;
}

export async function removeMember(member: FamilyMember): Promise<void> {
  if (isOnline()) {
    try {
      await deleteDoc(doc(db, MEMBERS_COLL, member.id));
      await deleteOfflineMember(member.id);
    } catch (e) {
      console.warn("Delete Firestore failed, queueing offline delete:", e);
      await saveOfflineMember({ ...member, pendingSync: "delete", synced: false });
    }
  } else {
    await saveOfflineMember({ ...member, pendingSync: "delete", synced: false });
  }
}

// HISTORICAL DOCUMENTS
export async function addOrUpdateDoc(docData: HistoricalDocument): Promise<HistoricalDocument> {
  const updatedDoc = { ...docData };

  if (isOnline()) {
    try {
      const { synced, pendingSync, ...firestoreData } = updatedDoc;
      await setDoc(doc(db, DOCS_COLL, docData.id), firestoreData);
      updatedDoc.synced = true;
      updatedDoc.pendingSync = null;
    } catch (e) {
      console.warn("Write document to Firestore failed, queueing offline:", e);
      updatedDoc.synced = false;
      updatedDoc.pendingSync = docData.pendingSync || "update";
    }
  } else {
    updatedDoc.synced = false;
    updatedDoc.pendingSync = docData.pendingSync || "update";
  }

  await saveOfflineDocument(updatedDoc);
  return updatedDoc;
}

export async function removeDoc(docData: HistoricalDocument): Promise<void> {
  if (isOnline()) {
    try {
      await deleteDoc(doc(db, DOCS_COLL, docData.id));
      await deleteOfflineDocument(docData.id);
    } catch (e) {
      console.warn("Delete document from Firestore failed, queueing offline delete:", e);
      await saveOfflineDocument({ ...docData, pendingSync: "delete", synced: false });
    }
  } else {
    await saveOfflineDocument({ ...docData, pendingSync: "delete", synced: false });
  }
}

// REMINDERS
export async function addOrUpdateRem(reminder: AnniversaryReminder): Promise<AnniversaryReminder> {
  const updatedRem = { ...reminder };

  if (isOnline()) {
    try {
      const { synced, pendingSync, ...firestoreData } = updatedRem;
      await setDoc(doc(db, REMINDERS_COLL, reminder.id), firestoreData);
      updatedRem.synced = true;
      updatedRem.pendingSync = null;
    } catch (e) {
      console.warn("Write reminder to Firestore failed, queueing offline:", e);
      updatedRem.synced = false;
      updatedRem.pendingSync = reminder.pendingSync || "update";
    }
  } else {
    updatedRem.synced = false;
    updatedRem.pendingSync = reminder.pendingSync || "update";
  }

  await saveOfflineReminder(updatedRem);
  return updatedRem;
}

export async function removeRem(reminder: AnniversaryReminder): Promise<void> {
  if (isOnline()) {
    try {
      await deleteDoc(doc(db, REMINDERS_COLL, reminder.id));
      await deleteOfflineReminder(reminder.id);
    } catch (e) {
      console.warn("Delete reminder from Firestore failed, queueing offline delete:", e);
      await saveOfflineReminder({ ...reminder, pendingSync: "delete", synced: false });
    }
  } else {
    await saveOfflineReminder({ ...reminder, pendingSync: "delete", synced: false });
  }
}

// -----------------------------------------------------------------------------
// EXTENDED ANCESTRAL SCANNING QUERIES
// -----------------------------------------------------------------------------
export async function fetchAllPublicAncestors(excludeUserId: string): Promise<FamilyMember[]> {
  if (!isOnline()) return [];

  try {
    const q = query(collection(db, MEMBERS_COLL));
    const snap = await getDocs(q);
    const publicMembers: FamilyMember[] = [];
    
    snap.forEach((d) => {
      const m = d.data() as FamilyMember;
      if (m.userId !== excludeUserId) {
        const advVisibility = m.advanced_privacy?.profileVisibility || (m.privacy === "public" ? "public" : m.privacy === "family" ? "friends" : "private");
        if (advVisibility !== "private") {
          publicMembers.push(m);
        }
      }
    });

    return publicMembers;
  } catch (error) {
    console.error("Failed to fetch public ancestral records:", error);
    return [];
  }
}

// -----------------------------------------------------------------------------
// LINEAGE ACCESS REQUEST FUNCTIONS
// -----------------------------------------------------------------------------
const REQUESTS_COLL = "lineage_requests";

export async function addOrUpdateAccessRequest(request: LineageAccessRequest): Promise<void> {
  if (!isOnline()) return;
  try {
    await setDoc(doc(db, REQUESTS_COLL, request.id), request);
  } catch (error) {
    console.error("Failed to set access request in Firestore:", error);
    throw error;
  }
}

export async function fetchIncomingAccessRequests(userId: string): Promise<LineageAccessRequest[]> {
  if (!isOnline()) return [];
  try {
    const q = query(collection(db, REQUESTS_COLL), where("toUserId", "==", userId));
    const snap = await getDocs(q);
    const requests: LineageAccessRequest[] = [];
    snap.forEach((d) => {
      requests.push(d.data() as LineageAccessRequest);
    });
    return requests.sort((a, b) => b.createdAt - a.createdAt);
  } catch (error) {
    console.error("Failed to fetch incoming requests:", error);
    return [];
  }
}

export async function fetchOutgoingAccessRequests(userId: string): Promise<LineageAccessRequest[]> {
  if (!isOnline()) return [];
  try {
    const q = query(collection(db, REQUESTS_COLL), where("fromUserId", "==", userId));
    const snap = await getDocs(q);
    const requests: LineageAccessRequest[] = [];
    snap.forEach((d) => {
      requests.push(d.data() as LineageAccessRequest);
    });
    return requests.sort((a, b) => b.createdAt - a.createdAt);
  } catch (error) {
    console.error("Failed to fetch outgoing requests:", error);
    return [];
  }
}

export async function fetchFamilyMemberById(memberId: string): Promise<FamilyMember | null> {
  if (!isOnline()) return null;
  try {
    const docRef = doc(db, MEMBERS_COLL, memberId);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return snap.data() as FamilyMember;
    }
    return null;
  } catch (error) {
    console.error("Failed to fetch family member by ID:", error);
    return null;
  }
}

// -----------------------------------------------------------------------------
// PLAYGROUND SEEDER COORDINATOR
// -----------------------------------------------------------------------------
import { generateTreeA, generateTreeB } from "../utils/seeder";

export async function seedPlaygroundTrees(userId: string, masterKey: string): Promise<{
  pushedA: number;
  pushedB: number;
}> {
  const treeA = generateTreeA(userId, masterKey);
  const treeB = generateTreeB("simulated_user_b", "MarcusVaultSecureKey123");

  let pushedA = 0;
  let pushedB = 0;

  // 1. Seed Tree A to active user (both local IndexedDB and Firestore)
  for (const m of treeA) {
    try {
      await saveOfflineMember(m); // Save to IndexedDB
      if (isOnline()) {
        const { synced, pendingSync, ...firestoreData } = m;
        await setDoc(doc(db, MEMBERS_COLL, m.id), firestoreData);
      }
      pushedA++;
    } catch (e) {
      console.error("Failed to seed tree A member:", e);
    }
  }

  // 2. Seed Tree B to simulated user B in Firestore
  if (isOnline()) {
    for (const m of treeB) {
      try {
        const { synced, pendingSync, ...firestoreData } = m;
        await setDoc(doc(db, MEMBERS_COLL, m.id), firestoreData);
        pushedB++;
      } catch (e) {
        console.error("Failed to seed tree B member:", e);
      }
    }
  }

  return { pushedA, pushedB };
}
