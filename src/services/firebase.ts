const TOKEN_KEY = "ft_auth_token";
const USER_KEY = "ft_auth_user";

export type User = {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL?: string | null;
};

export interface UserCredential {
  user: User;
}

function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

function clearAuth() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  auth.currentUser = null;
}

function setUser(user: User) {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
  auth.currentUser = user;
}

function getStoredUser(): User | null {
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as User;
  } catch {
    return null;
  }
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

const authListeners = new Set<(user: User | null) => void>();

function notifyListeners(user: User | null) {
  console.log("[auth] notifyListeners", user, "listeners:", authListeners.size);
  authListeners.forEach((cb) => {
    try {
      cb(user);
    } catch (e) {
      console.error("Auth listener error:", e);
    }
  });
}

export const auth = {
  currentUser: getStoredUser(),
};

export const googleProvider = {} as any;

export async function signInWithEmailAndPassword(
  _auth: any,
  email: string,
  password: string
): Promise<UserCredential> {
  console.log("[auth] signInWithEmailAndPassword start", email);
  const data = await apiPost("/api/auth/login", { email, password });
  console.log("[auth] login API response", data.user?.email);
  setToken(data.token);
  const user: User = {
    uid: data.user.id,
    email: data.user.email,
    displayName: data.user.displayName,
    photoURL: null,
  };
  setUser(user);
  notifyListeners(user);
  return { user };
}

export async function createUserWithEmailAndPassword(
  _auth: any,
  email: string,
  password: string
): Promise<UserCredential> {
  const data = await apiPost("/api/auth/register", { email, password });
  setToken(data.token);
  const user: User = {
    uid: data.user.id,
    email: data.user.email,
    displayName: data.user.displayName,
    photoURL: null,
  };
  setUser(user);
  notifyListeners(user);
  return { user };
}

export async function signOut(_auth?: any): Promise<void> {
  try {
    await fetch("/api/auth/logout", { method: "POST", headers: { ...authHeaders() } });
  } catch {
    // ignore
  }
  clearAuth();
  notifyListeners(null);
}

export function signInWithPopup(_auth: any, _provider: any): Promise<UserCredential> {
  throw new Error(
    "Google sign-in is not available in the SQL backend. Please use email/password."
  );
}

export function onAuthStateChanged(
  _auth: any,
  callback: (user: User | null) => void
): () => void {
  let cancelled = false;
  authListeners.add(callback);
  console.log("[auth] onAuthStateChanged registered, total listeners:", authListeners.size);
  const user = getStoredUser();
  if (user) {
    callback(user);
  } else {
    callback(null);
  }

  // Validate token asynchronously and notify again
  (async () => {
    const token = getToken();
    if (!token) {
      if (!cancelled) callback(null);
      return;
    }
    try {
      const data = await apiGet("/api/auth/me");
      const validUser: User = {
        uid: data.id,
        email: data.email,
        displayName: data.displayName,
        photoURL: null,
      };
      setUser(validUser);
      if (!cancelled) callback(validUser);
    } catch {
      clearAuth();
      if (!cancelled) callback(null);
    }
  })();

  return () => {
    cancelled = true;
    authListeners.delete(callback);
  };
}

// Stub Firestore-like "db" for the few direct calls in App.tsx
export const db = { kind: "sql-backend" } as any;

export function doc(_db: any, collection: string, id: string) {
  return { collection, id };
}

export async function getDoc(ref: { collection: string; id: string }): Promise<{ exists(): boolean; data(): any }> {
  try {
    let data: any;
    if (ref.collection === "system_settings") {
      data = await apiGet(`/api/system-settings/${ref.id}`);
    } else if (ref.collection === "user_subscriptions") {
      data = await apiGet(`/api/user-subscriptions/${ref.id}`);
    } else {
      return { exists: () => false, data: () => null };
    }
    return {
      exists: () => data.exists !== false,
      data: () => data.data || null,
    };
  } catch {
    return { exists: () => false, data: () => null };
  }
}

export async function setDoc(ref: { collection: string; id: string }, data: any): Promise<void> {
  if (ref.collection === "system_settings") {
    await apiPost(`/api/system-settings/${ref.id}`, data);
  } else if (ref.collection === "user_subscriptions") {
    await apiPost(`/api/user-subscriptions/${ref.id}`, data);
  } else {
    throw new Error(`Unknown SQL collection: ${ref.collection}`);
  }
}

// No-op re-exports kept only to satisfy legacy imports; they should not be used.
export function collection() { return {}; }
export function getDocs() { return Promise.resolve({ forEach: () => {}, docs: [] }); }
export function deleteDoc() { return Promise.resolve(); }
export function query() { return {}; }
export function where() { return {}; }
export function writeBatch() { return { set: () => {}, commit: () => Promise.resolve() }; }
export function updateDoc() { return Promise.resolve(); }
