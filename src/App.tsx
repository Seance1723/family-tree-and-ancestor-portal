import React, { useState, useEffect } from "react";
import { 
  auth, 
  onAuthStateChanged, 
  signOut,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  User
} from "./services/auth";
import { clearAllOfflineStores } from "./utils/indexedDB";
import { RefreshCw } from "lucide-react";

// Components
import LandingPage from "./components/LandingPage";
import SuperAdminPanel from "./components/admin/SuperAdminPanel";
import UserDashboard from "./components/users/UserDashboard";

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [isAdminMode, setIsAdminMode] = useState(false);

  console.log("[App Render] user:", user ? { email: user.email, isAdmin: user.isAdmin } : null, "isAdminMode:", isAdminMode);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged((currentUser) => {
      setUser(currentUser);
      setLoading(false);
      if (currentUser) {
        setIsAdminMode(!!currentUser.isAdmin);
      } else {
        setIsAdminMode(false);
      }
    });
    return () => unsubscribe();
  }, []);

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    if (!email || !password) return;

    try {
      let cred;
      if (isSignUp) {
        cred = await createUserWithEmailAndPassword(email, password);
      } else {
        cred = await signInWithEmailAndPassword(email, password);
      }
      if (cred?.user?.isAdmin) {
        setIsAdminMode(true);
      }
    } catch (err: any) {
      setAuthError(err.message || "Authentication failed. Check your inputs.");
    }
  };

  const handleGoogleLogin = async () => {
    setAuthError("");
    setAuthError("Google sign-in is not available in this SQL-backed build. Please use email/password.");
  };

  const handleLogout = async () => {
    if (window.confirm("Are you sure you want to sign out? Your offline database on this device will remain secure.")) {
      try {
        await signOut();
      } catch (e) {
        console.error("Signout error:", e);
      }
      await clearAllOfflineStores();
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50">
        <RefreshCw className="h-10 w-10 text-blue-600 animate-spin" />
        <p className="text-xs text-slate-500 font-medium font-sans mt-3">Loading Kinly Ancestry Vault...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <LandingPage
        email={email}
        setEmail={setEmail}
        password={password}
        setPassword={setPassword}
        isSignUp={isSignUp}
        setIsSignUp={setIsSignUp}
        authError={authError}
        setAuthError={setAuthError}
        handleEmailAuth={handleEmailAuth}
        handleGoogleLogin={handleGoogleLogin}
      />
    );
  }

  if (isAdminMode && user.isAdmin) {
    return (
      <SuperAdminPanel currentEmail={user.email || ""} onExit={() => setIsAdminMode(false)} />
    );
  }

  return (
    <UserDashboard 
      user={user} 
      onLogout={handleLogout} 
      onEnterAdmin={user.isAdmin ? () => setIsAdminMode(true) : undefined} 
    />
  );
}
