const TOKEN_KEY = "ft_auth_token";
const USER_KEY = "ft_auth_user";

export type User = {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL?: string | null;
  isAdmin?: boolean;
  isActive?: boolean;
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

export async function signInWithEmailAndPassword(
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
    isAdmin: !!data.user.isAdmin,
    isActive: data.user.isActive !== false,
  };
  setUser(user);
  notifyListeners(user);
  return { user };
}

export async function createUserWithEmailAndPassword(
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
    isAdmin: !!data.user.isAdmin,
    isActive: data.user.isActive !== false,
  };
  setUser(user);
  notifyListeners(user);
  return { user };
}

export async function signOut(): Promise<void> {
  try {
    await fetch("/api/auth/logout", { method: "POST", headers: { ...authHeaders() } });
  } catch {
    // ignore
  }
  clearAuth();
  notifyListeners(null);
}

export function onAuthStateChanged(
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
        isAdmin: !!data.isAdmin,
        isActive: data.isActive !== false,
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

/* ───────────────────────────── Native DB Helpers ───────────────────────────── */

export async function getSystemSettings(): Promise<{
  supportFlowEnabled: boolean;
  upgradeFlowEnabled: boolean;
  maxMembersIfUpgradeEnabled: number;
  freeTierLimit: number;
  premiumPriceMonthly: number;
  premiumPriceYearly: number;
  coupons: any[];
} | null> {
  try {
    const res = await apiGet("/api/system-settings/config");
    if (res.exists) {
      const rawSup = res.data?.supportFlowEnabled !== false;
      const rawUpg = res.data?.upgradeFlowEnabled !== false;
      const sup = rawSup && rawUpg ? true : rawSup;
      const upg = rawSup && rawUpg ? false : rawUpg;
      return {
        supportFlowEnabled: sup,
        upgradeFlowEnabled: upg,
        maxMembersIfUpgradeEnabled: res.data?.maxMembersIfUpgradeEnabled ?? 50,
        freeTierLimit: res.data?.freeTierLimit ?? 3,
        premiumPriceMonthly: res.data?.premiumPriceMonthly ?? 99,
        premiumPriceYearly: res.data?.premiumPriceYearly ?? 799,
        coupons: res.data?.coupons || [],
      };
    }
    return null;
  } catch (err) {
    console.error("[db] getSystemSettings error:", err);
    return null;
  }
}

export async function saveSystemSettings(settings: {
  supportFlowEnabled: boolean;
  upgradeFlowEnabled: boolean;
  maxMembersIfUpgradeEnabled: number;
}): Promise<void> {
  await apiPost("/api/system-settings/config", settings);
}

export async function getUserSubscription(userId: string): Promise<{
  isPremium: boolean;
  slots: number;
  amountPaid: number;
  paymentStatus: string;
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  expiresAt?: number;
  history?: any[];
} | null> {
  try {
    const res = await apiGet(`/api/user-subscriptions/${userId}`);
    if (res.exists && res.data) {
      const data = res.data;
      return {
        isPremium: !!data.isPremium,
        slots: data.slots || 0,
        amountPaid: data.amountPaid || 0,
        paymentStatus: data.paymentStatus || "",
        razorpayOrderId: data.razorpayOrderId || "",
        razorpayPaymentId: data.razorpayPaymentId || "",
        expiresAt: data.expiresAt,
        history: data.history || [],
      };
    }
    return null;
  } catch (err) {
    console.error("[db] getUserSubscription error:", err);
    return null;
  }
}

export async function saveUserSubscription(userId: string, subscription: any): Promise<void> {
  await apiPost(`/api/user-subscriptions/${userId}`, {
    ...subscription,
    updatedAt: Date.now(),
  });
}

export async function getUserDonations(): Promise<{
  id: string;
  userId: string;
  email: string;
  amount: number;
  currency: string;
  status: string;
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  createdAt: number;
}[]> {
  try {
    return await apiGet("/api/donations");
  } catch (err) {
    console.error("[db] getUserDonations error:", err);
    return [];
  }
}
