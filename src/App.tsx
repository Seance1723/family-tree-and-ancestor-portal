import React, { useState, useEffect } from "react";
import { 
  auth, 
  onAuthStateChanged, 
  signOut,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithGoogle,
  verifyOtp,
  verifyMfa,
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

  // OTP Verification States
  const [showOtpPrompt, setShowOtpPrompt] = useState(false);
  const [otpEmail, setOtpEmail] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [devOtpCode, setDevOtpCode] = useState("");
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);

  // MFA Verification States
  const [showMfaPrompt, setShowMfaPrompt] = useState(false);
  const [mfaEmail, setMfaEmail] = useState("");
  const [mfaCode, setMfaCode] = useState("");
  const [devMfaCode, setDevMfaCode] = useState("");
  const [isVerifyingMfa, setIsVerifyingMfa] = useState(false);

  // Math CAPTCHA Challenge
  const [captchaNumA, setCaptchaNumA] = useState(3);
  const [captchaNumB, setCaptchaNumB] = useState(4);
  const [captchaInput, setCaptchaInput] = useState("");
  const [captchaError, setCaptchaError] = useState("");

  const [systemSettings, setSystemSettings] = useState<any>(null);

  const refreshCaptcha = () => {
    setCaptchaNumA(Math.floor(1 + Math.random() * 9));
    setCaptchaNumB(Math.floor(1 + Math.random() * 9));
    setCaptchaInput("");
    setCaptchaError("");
  };

  useEffect(() => {
    refreshCaptcha();
  }, [isSignUp]);

  console.log("[App Render] user:", user ? { email: user.email, isAdmin: user.isAdmin } : null, "isAdminMode:", isAdminMode);

  // Fetch settings on startup or when auth changes
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const s = await getSystemSettings();
        setSystemSettings(s);
      } catch (e) {
        console.warn("Failed to load settings in App", e);
      }
    };
    loadSettings();
  }, [user]);

  // Periodic check to mount the real Google GSI Sign In Button
  useEffect(() => {
    const cid = systemSettings?.googleClientId;
    const container = document.getElementById("google-signin-btn-container");
    
    if (!cid) {
      if (container) {
        container.innerHTML = `<div class="text-[11px] text-amber-500 font-sans font-medium text-center py-2.5 bg-amber-500/10 border border-amber-500/20 rounded-2xl px-4 max-w-sm mx-auto leading-relaxed">
          Google Sign-In requires a Google Client ID. Register your ID in the <strong class="text-white">.env</strong> file or the <strong class="text-white">Admin Settings panel</strong> to authenticate.
        </div>`;
      }
      return;
    }

    const initGoogleGsi = () => {
      if (typeof window !== "undefined" && (window as any).google?.accounts?.id) {
        try {
          (window as any).google.accounts.id.initialize({
            client_id: cid,
            callback: handleGoogleCredentialResponse,
          });

          if (container) {
            // Render the official Google Identity Services login button!
            (window as any).google.accounts.id.renderButton(container, {
              theme: "filled_blue",
              size: "large",
              text: "signin_with",
              shape: "rectangular",
              width: 320,
            });
          }
        } catch (e) {
          console.warn("[Google GSI] Initialization warning:", e);
        }
      }
    };

    initGoogleGsi();
    const interval = setInterval(initGoogleGsi, 1500);
    return () => clearInterval(interval);
  }, [systemSettings, user, isSignUp]);

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

  const handleGoogleCredentialResponse = async (response: any) => {
    const token = response.credential;
    if (!token) return;
    setAuthError("");
    setLoading(true);
    try {
      const res = await signInWithGoogle({
        googleId: "google_oauth",
        email: "oauth@google.com",
        credentialToken: token
      });

      if (res && res.requiresVerification) {
        setOtpEmail(res.email);
        setDevOtpCode(res.devOtpCode || "");
        setShowOtpPrompt(true);
      } else if (res && res.requiresMfa) {
        setMfaEmail(res.email);
        setDevMfaCode(res.devMfaCode || "");
        setShowMfaPrompt(true);
      }
    } catch (err: any) {
      setAuthError(err.message || "Google Authentication failed via SDK Services.");
    } finally {
      setLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    setCaptchaError("");
    if (!email || !password) return;

    if (isSignUp) {
      if (Number(captchaInput) !== captchaNumA + captchaNumB) {
        setCaptchaError("Incorrect CAPTCHA solution. Please solve again.");
        refreshCaptcha();
        return;
      }
    }

    try {
      let res;
      if (isSignUp) {
        res = await createUserWithEmailAndPassword(email, password);
      } else {
        res = await signInWithEmailAndPassword(email, password);
      }

      if (res && res.requiresVerification) {
        setOtpEmail(res.email);
        setDevOtpCode(res.devOtpCode || "");
        setShowOtpPrompt(true);
      } else if (res && res.requiresMfa) {
        setMfaEmail(res.email);
        setDevMfaCode(res.devMfaCode || "");
        setShowMfaPrompt(true);
      } else if (res?.user?.isAdmin) {
        setIsAdminMode(true);
      }
    } catch (err: any) {
      setAuthError(err.message || "Authentication failed. Check your inputs.");
      refreshCaptcha();
    }
  };

  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpCode) return;
    setIsVerifyingOtp(true);
    try {
      const res = await verifyOtp(otpEmail, otpCode);
      if (res.user?.isAdmin) {
        setIsAdminMode(true);
      }
      setShowOtpPrompt(false);
      setOtpCode("");
    } catch (err: any) {
      alert(err.message || "OTP verification failed.");
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  const handleMfaSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mfaCode) return;
    setIsVerifyingMfa(true);
    try {
      const res = await verifyMfa(mfaEmail, mfaCode);
      if (res.user?.isAdmin) {
        setIsAdminMode(true);
      }
      setShowMfaPrompt(false);
      setMfaCode("");
    } catch (err: any) {
      alert(err.message || "MFA validation failed.");
    } finally {
      setIsVerifyingMfa(false);
    }
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
      <div className="relative min-h-screen">
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
          handleGoogleLogin={() => {}}
          captchaComponent={isSignUp ? (
            <div className="space-y-1.5 p-4 bg-slate-950/40 border border-slate-800 rounded-2xl">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide">Spam Protection Captcha</label>
              <div className="flex items-center gap-3">
                <span className="text-xs font-mono font-bold text-white bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-lg select-none">
                  {captchaNumA} + {captchaNumB} = ?
                </span>
                <input
                  type="number"
                  required
                  placeholder="Answer"
                  value={captchaInput}
                  onChange={(e) => setCaptchaInput(e.target.value)}
                  className="w-24 px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-center text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              {captchaError && <p className="text-[10px] text-rose-500 font-medium mt-1">{captchaError}</p>}
            </div>
          ) : undefined}
        />

        {/* OTP VERIFICATION PROMPT */}
        {showOtpPrompt && (
          <div className="fixed inset-0 z-100 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl relative text-slate-100 font-sans p-6 space-y-5">
              <div className="h-1.5 -mx-6 -mt-6 w-[calc(100%+3rem)] bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500"></div>

              {devOtpCode && (
                <div className="bg-blue-600/15 border border-blue-500/35 rounded-2xl p-4 space-y-1 text-center">
                  <h4 className="text-[10px] font-black text-blue-400 uppercase tracking-wider">Developer Sandbox Mode</h4>
                  <p className="text-xs font-bold text-white font-mono">
                    OTP Code sent to email: <span className="bg-slate-950 px-2 py-0.5 rounded text-blue-400 font-bold">{devOtpCode}</span>
                  </p>
                </div>
              )}

              <div className="text-center space-y-1">
                <h3 className="text-base font-black text-white">Email Verification Code</h3>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  We've sent a 6-digit OTP code to <strong className="text-slate-200">{otpEmail}</strong>. Please enter it below to complete verification.
                </p>
              </div>

              <form onSubmit={handleOtpSubmit} className="space-y-4">
                <div>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    placeholder="Enter Code (6 digits)"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                    className="w-full text-center tracking-widest font-mono font-bold text-lg px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isVerifyingOtp}
                  className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer transition-all flex items-center justify-center gap-1"
                >
                  {isVerifyingOtp ? (
                    <>
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      <span>Verifying code...</span>
                    </>
                  ) : (
                    <span>Verify Account & Sign In</span>
                  )}
                </button>
              </form>

              <button
                type="button"
                onClick={() => setShowOtpPrompt(false)}
                className="w-full text-center text-[10px] text-slate-500 hover:text-slate-300 font-bold uppercase tracking-wider pt-1 cursor-pointer"
              >
                Back to Sign In
              </button>
            </div>
          </div>
        )}

        {/* MFA VERIFICATION PROMPT */}
        {showMfaPrompt && (
          <div className="fixed inset-0 z-100 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl relative text-slate-100 font-sans p-6 space-y-5">
              <div className="h-1.5 -mx-6 -mt-6 w-[calc(100%+3rem)] bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500"></div>

              {devMfaCode && (
                <div className="bg-blue-600/15 border border-blue-500/35 rounded-2xl p-4 space-y-1 text-center">
                  <h4 className="text-[10px] font-black text-blue-400 uppercase tracking-wider">Developer Sandbox Mode</h4>
                  <p className="text-xs font-bold text-white font-mono">
                    MFA Login Code: <span className="bg-slate-950 px-2 py-0.5 rounded text-blue-400 font-bold">{devMfaCode}</span>
                  </p>
                </div>
              )}

              <div className="text-center space-y-1">
                <h3 className="text-base font-black text-white">Two-Factor Authentication</h3>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Two-factor authentication is active on this account. We've sent a 6-digit MFA confirmation code to <strong className="text-slate-200">{mfaEmail}</strong>. Please enter it to authorize.
                </p>
              </div>

              <form onSubmit={handleMfaSubmit} className="space-y-4">
                <div>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    placeholder="Enter Code (6 digits)"
                    value={mfaCode}
                    onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, ""))}
                    className="w-full text-center tracking-widest font-mono font-bold text-lg px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isVerifyingMfa}
                  className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer transition-all flex items-center justify-center gap-1"
                >
                  {isVerifyingMfa ? (
                    <>
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      <span>Verifying code...</span>
                    </>
                  ) : (
                    <span>Authorize Session</span>
                  )}
                </button>
              </form>

              <button
                type="button"
                onClick={() => setShowMfaPrompt(false)}
                className="w-full text-center text-[10px] text-slate-500 hover:text-slate-300 font-bold uppercase tracking-wider pt-1 cursor-pointer"
              >
                Cancel & Back to Sign In
              </button>
            </div>
          </div>
        )}
      </div>
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
