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

// Helper to check network status
export function isOnline(): boolean {
  return navigator.onLine;
}

function getToken(): string | null {
  return localStorage.getItem("ft_auth_token");
}

function authHeaders() {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function apiPost(path: string, body: any) {
  const res = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed: ${res.status}`);
  return data;
}

async function apiGet(path: string) {
  const res = await fetch(path, { headers: { ...authHeaders() } });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed: ${res.status}`);
  return data;
}

async function apiDelete(path: string) {
  const res = await fetch(path, { method: "DELETE", headers: { ...authHeaders() } });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed: ${res.status}`);
  return data;
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
    const localMembers = await getOfflineMembers();
    const localDocs = await getOfflineDocuments();
    const localReminders = await getOfflineReminders();

    const membersToPush = localMembers.filter((m) => m.userId === userId);
    const docsToPush = localDocs.filter((d) => d.userId === userId);
    const remindersToPush = localReminders.filter((r) => r.userId === userId);

    const res = await apiPost("/api/sync", {
      members: membersToPush,
      documents: docsToPush,
      reminders: remindersToPush,
    });

    result.pushed = res.pushed ?? 0;

    const serverMembers = res.members as FamilyMember[] || [];
    const serverDocs = res.documents as HistoricalDocument[] || [];
    const serverReminders = res.reminders as AnniversaryReminder[] || [];

    const memberIds = new Set(serverMembers.map((m) => m.id));
    const docIds = new Set(serverDocs.map((d) => d.id));
    const reminderIds = new Set(serverReminders.map((r) => r.id));

    for (const m of serverMembers) {
      await saveOfflineMember({ ...m, synced: true, pendingSync: null });
      result.pulled++;
    }
    for (const d of serverDocs) {
      await saveOfflineDocument({ ...d, synced: true, pendingSync: null });
      result.pulled++;
    }
    for (const r of serverReminders) {
      await saveOfflineReminder({ ...r, synced: true, pendingSync: null });
      result.pulled++;
    }

    // Remove local records that no longer exist on the server and aren't pending sync
    for (const lm of await getOfflineMembers()) {
      if (lm.userId === userId && !memberIds.has(lm.id) && !lm.pendingSync) {
        await deleteOfflineMember(lm.id);
      }
    }
    for (const ld of await getOfflineDocuments()) {
      if (ld.userId === userId && !docIds.has(ld.id) && !ld.pendingSync) {
        await deleteOfflineDocument(ld.id);
      }
    }
    for (const lr of await getOfflineReminders()) {
      if (lr.userId === userId && !reminderIds.has(lr.id) && !lr.pendingSync) {
        await deleteOfflineReminder(lr.id);
      }
    }

    if (res.errors && Array.isArray(res.errors)) {
      result.errors.push(...res.errors);
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
  const updatedMember = { ...member };
  
  if (isOnline()) {
    try {
      await apiPost(`/api/members/${member.id}`, member);
      updatedMember.synced = true;
      updatedMember.pendingSync = null;
    } catch (e) {
      console.warn("Write to server failed, queueing offline:", e);
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
      await apiDelete(`/api/members/${member.id}`);
      await deleteOfflineMember(member.id);
    } catch (e) {
      console.warn("Delete from server failed, queueing offline delete:", e);
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
      await apiPost(`/api/documents/${docData.id}`, docData);
      updatedDoc.synced = true;
      updatedDoc.pendingSync = null;
    } catch (e) {
      console.warn("Write document to server failed, queueing offline:", e);
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
      await apiDelete(`/api/documents/${docData.id}`);
      await deleteOfflineDocument(docData.id);
    } catch (e) {
      console.warn("Delete document from server failed, queueing offline delete:", e);
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
      await apiPost(`/api/reminders/${reminder.id}`, reminder);
      updatedRem.synced = true;
      updatedRem.pendingSync = null;
    } catch (e) {
      console.warn("Write reminder to server failed, queueing offline:", e);
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
      await apiDelete(`/api/reminders/${reminder.id}`);
      await deleteOfflineReminder(reminder.id);
    } catch (e) {
      console.warn("Delete reminder from server failed, queueing offline delete:", e);
      await saveOfflineReminder({ ...reminder, pendingSync: "delete", synced: false });
    }
  } else {
    await saveOfflineReminder({ ...reminder, pendingSync: "delete", synced: false });
  }
}

// -----------------------------------------------------------------------------
// EXTENDED ANCESTRAL SCANNING QUERIES
// -----------------------------------------------------------------------------
export async function fetchAllPublicAncestors(_excludeUserId: string): Promise<FamilyMember[]> {
  if (!isOnline()) return [];

  try {
    const data = await apiGet("/api/members/public");
    return data as FamilyMember[];
  } catch (error) {
    console.error("Failed to fetch public ancestral records:", error);
    return [];
  }
}

// -----------------------------------------------------------------------------
// LINEAGE ACCESS REQUEST FUNCTIONS
// -----------------------------------------------------------------------------
export async function addOrUpdateAccessRequest(request: LineageAccessRequest): Promise<void> {
  if (!isOnline()) return;
  try {
    await apiPost(`/api/requests/${request.id}`, request);
  } catch (error) {
    console.error("Failed to save access request:", error);
    throw error;
  }
}

export async function fetchIncomingAccessRequests(_userId: string): Promise<LineageAccessRequest[]> {
  if (!isOnline()) return [];
  try {
    const data = await apiGet("/api/requests/incoming");
    return (data as LineageAccessRequest[]).sort((a, b) => b.createdAt - a.createdAt);
  } catch (error) {
    console.error("Failed to fetch incoming requests:", error);
    return [];
  }
}

export async function fetchOutgoingAccessRequests(_userId: string): Promise<LineageAccessRequest[]> {
  if (!isOnline()) return [];
  try {
    const data = await apiGet("/api/requests/outgoing");
    return (data as LineageAccessRequest[]).sort((a, b) => b.createdAt - a.createdAt);
  } catch (error) {
    console.error("Failed to fetch outgoing requests:", error);
    return [];
  }
}

export async function fetchFamilyMemberById(memberId: string): Promise<FamilyMember | null> {
  if (!isOnline()) return null;
  try {
    const data = await apiGet(`/api/members/${memberId}`);
    return data as FamilyMember;
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

  // 1. Seed Tree A to active user (local IndexedDB + server)
  for (const m of treeA) {
    try {
      await saveOfflineMember(m);
      if (isOnline()) {
        await apiPost(`/api/members/${m.id}`, m);
      }
      pushedA++;
    } catch (e) {
      console.error("Failed to seed tree A member:", e);
    }
  }

  // 2. Seed Tree B to simulated user B on server
  if (isOnline()) {
    for (const m of treeB) {
      try {
        await apiPost(`/api/members/${m.id}`, m);
        pushedB++;
      } catch (e) {
        console.error("Failed to seed tree B member:", e);
      }
    }
  }

  return { pushedA, pushedB };
}
