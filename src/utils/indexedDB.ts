import { FamilyMember, HistoricalDocument, AnniversaryReminder } from "../types";

const DB_NAME = "FamilyTreeOfflineDB";
const DB_VERSION = 1;

export function openOfflineDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      console.error("IndexedDB open error:", request.error);
      reject(request.error);
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onupgradeneeded = (event: any) => {
      const db = event.target.result;

      // Create Stores if they don't exist
      if (!db.objectStoreNames.contains("family_members")) {
        db.createObjectStore("family_members", { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains("historical_documents")) {
        db.createObjectStore("historical_documents", { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains("reminders")) {
        db.createObjectStore("reminders", { keyPath: "id" });
      }
    };
  });
}

// FAMILY MEMBERS DB OPERATIONS
export async function getOfflineMembers(): Promise<FamilyMember[]> {
  const db = await openOfflineDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction("family_members", "readonly");
    const store = transaction.objectStore("family_members");
    const request = store.getAll();

    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}

export async function saveOfflineMember(member: FamilyMember): Promise<void> {
  const db = await openOfflineDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction("family_members", "readwrite");
    const store = transaction.objectStore("family_members");
    const request = store.put(member);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function deleteOfflineMember(id: string): Promise<void> {
  const db = await openOfflineDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction("family_members", "readwrite");
    const store = transaction.objectStore("family_members");
    const request = store.delete(id);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

// HISTORICAL DOCUMENTS DB OPERATIONS
export async function getOfflineDocuments(): Promise<HistoricalDocument[]> {
  const db = await openOfflineDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction("historical_documents", "readonly");
    const store = transaction.objectStore("historical_documents");
    const request = store.getAll();

    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}

export async function saveOfflineDocument(doc: HistoricalDocument): Promise<void> {
  const db = await openOfflineDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction("historical_documents", "readwrite");
    const store = transaction.objectStore("historical_documents");
    const request = store.put(doc);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function deleteOfflineDocument(id: string): Promise<void> {
  const db = await openOfflineDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction("historical_documents", "readwrite");
    const store = transaction.objectStore("historical_documents");
    const request = store.delete(id);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

// REMINDERS DB OPERATIONS
export async function getOfflineReminders(): Promise<AnniversaryReminder[]> {
  const db = await openOfflineDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction("reminders", "readonly");
    const store = transaction.objectStore("reminders");
    const request = store.getAll();

    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}

export async function saveOfflineReminder(reminder: AnniversaryReminder): Promise<void> {
  const db = await openOfflineDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction("reminders", "readwrite");
    const store = transaction.objectStore("reminders");
    const request = store.put(reminder);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function deleteOfflineReminder(id: string): Promise<void> {
  const db = await openOfflineDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction("reminders", "readwrite");
    const store = transaction.objectStore("reminders");
    const request = store.delete(id);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

// CLEAR ALL STORES FOR SIGNOUT
export async function clearAllOfflineStores(): Promise<void> {
  const db = await openOfflineDB();
  const stores = ["family_members", "historical_documents", "reminders"];
  const transaction = db.transaction(stores, "readwrite");

  for (const storeName of stores) {
    transaction.objectStore(storeName).clear();
  }

  return new Promise((resolve) => {
    transaction.oncomplete = () => resolve();
  });
}
