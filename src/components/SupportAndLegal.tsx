import React, { useState, useEffect } from "react";
import { Mail, Shield, FileText, CheckCircle, AlertTriangle, RefreshCw } from "lucide-react";
import { auth } from "../services/firebase";

export default function SupportAndLegal() {
  const [activeSubTab, setActiveSubTab] = useState<"privacy" | "terms" | "contact">("privacy");

  // Contact form state
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [honeypot, setHoneypot] = useState(""); // Bot filter
  
  // Math captcha state
  const [captchaNum1, setCaptchaNum1] = useState(0);
  const [captchaNum2, setCaptchaNum2] = useState(0);
  const [userCaptcha, setUserCaptcha] = useState("");
  const [captchaError, setCaptchaError] = useState(false);

  // Submission state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState("");

  // Initialize random math captcha values
  const generateCaptcha = () => {
    setCaptchaNum1(Math.floor(Math.random() * 9) + 1); // 1-9
    setCaptchaNum2(Math.floor(Math.random() * 9) + 1); // 1-9
    setUserCaptcha("");
    setCaptchaError(false);
  };

  useEffect(() => {
    generateCaptcha();
  }, [activeSubTab]);

  const handleSubmitContact = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError("");
    setSubmitSuccess(false);

    // 1. Bot Honeypot detection
    if (honeypot.trim() !== "") {
      // Quietly fail or show a mock success to waste the bot's time
      setIsSubmitting(true);
      setTimeout(() => {
        setIsSubmitting(false);
        setSubmitSuccess(true);
        // Clear fields
        setName("");
        setEmail("");
        setSubject("");
        setMessage("");
      }, 1000);
      return;
    }

    // 2. Captcha verification
    const correctAnswer = captchaNum1 + captchaNum2;
    if (parseInt(userCaptcha.trim(), 10) !== correctAnswer) {
      setCaptchaError(true);
      return;
    }

    // 3. Form fields validation
    if (!name.trim() || !email.trim() || !subject.trim() || !message.trim()) {
      setSubmitError("All fields are strictly required.");
      return;
    }

    setIsSubmitting(true);

    try {
      const messageId = "msg_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9);
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: messageId,
          userId: auth.currentUser?.uid,
          name: name.trim(),
          email: email.trim().toLowerCase(),
          subject: subject.trim(),
          message: message.trim(),
          submittedAt: new Date().toISOString(),
          clientReferrer: "Kinly Web Vault",
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to send message");
      }

      setSubmitSuccess(true);
      setName("");
      setEmail("");
      setSubject("");
      setMessage("");
      generateCaptcha();
    } catch (err: any) {
      console.error("Failed to submit support query:", err);
      setSubmitError("Failed to deliver message. Please check your internet connection.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto p-4 sm:p-6 space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-5 gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight uppercase flex items-center gap-2">
            <span>Security, Privacy & Support Center</span>
          </h1>
          <p className="text-xs text-slate-500 font-mono mt-1">
            Kinly Zero-Knowledge Cryptographic Vault Ledger
          </p>
        </div>
        
        {/* Sub-tab Switchers */}
        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200 shrink-0 self-stretch sm:self-auto justify-around">
          <button
            onClick={() => setActiveSubTab("privacy")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeSubTab === "privacy"
                ? "bg-white text-slate-900 shadow-xs border border-slate-200"
                : "text-slate-500 hover:text-slate-900"
            }`}
          >
            <Shield className="h-3.5 w-3.5" />
            <span>Privacy Policy</span>
          </button>
          <button
            onClick={() => setActiveSubTab("terms")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeSubTab === "terms"
                ? "bg-white text-slate-900 shadow-xs border border-slate-200"
                : "text-slate-500 hover:text-slate-900"
            }`}
          >
            <FileText className="h-3.5 w-3.5" />
            <span>Terms of Use</span>
          </button>
          <button
            onClick={() => setActiveSubTab("contact")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeSubTab === "contact"
                ? "bg-white text-slate-900 shadow-xs border border-slate-200"
                : "text-slate-500 hover:text-slate-900"
            }`}
          >
            <Mail className="h-3.5 w-3.5" />
            <span>Contact Support</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-xs min-h-[400px]">
        {/* 1. Privacy Policy View */}
        {activeSubTab === "privacy" && (
          <div className="space-y-6 text-slate-800 leading-relaxed font-sans text-xs sm:text-sm">
            <div className="border-b border-slate-100 pb-4">
              <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
                <Shield className="h-5 w-5 text-emerald-600" />
                <span>Kinly Secure Privacy Policy</span>
              </h2>
              <p className="text-[11px] text-slate-400 font-mono mt-1">Last Updated: June 27, 2026 (Not Fixed - Subject to Change)</p>
            </div>

            <p>
              Welcome to <strong>Kinly</strong> (referred to as "we", "us", "our", or "the Platform"). 
              We are passionately committed to protecting your family history, identity, and genealogical records. 
              Unlike typical public ancestry networks, Kinly is architected using 
              <strong> Zero-Knowledge Cryptographic Vaults</strong>. This means your personal and historical records 
              are secured and encrypted on your own device before any data reaches our secure servers.
            </p>

            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-amber-900 space-y-2">
              <span className="font-bold block uppercase text-xs">📢 POLICY DYNAMICITY NOTIFICATION</span>
              <p className="text-xs">
                Please be advised that this Privacy Policy is <strong>not fixed</strong>. As technology, regulatory frameworks, 
                and cryptographic standards evolve, we reserve the right to modify, adjust, or completely revise this agreement 
                at any time to guarantee maximum compliance and security. Users are advised to review this policy periodically.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
              <div className="space-y-3 bg-slate-50/50 p-4 rounded-xl border border-slate-100">
                <h3 className="font-bold text-slate-900 uppercase tracking-wider text-xs">🔒 1. Zero-Knowledge Proof & Encryption</h3>
                <p className="text-xs text-slate-600">
                  All family member details (including legal names, historical birth dates, direct relationships, journal notes, addresses, and secure documents) are translated via local symmetric client-side encryption. This is computed in your browser using a secret cryptographic key derived from your Master Password. We do not have access to your Master Password, and we cannot read or decrypt your synchronized family files under any circumstance.
                </p>
              </div>

              <div className="space-y-3 bg-slate-50/50 p-4 rounded-xl border border-slate-100">
                <h3 className="font-bold text-slate-900 uppercase tracking-wider text-xs">📊 2. Anonymized Matching Data</h3>
                <p className="text-xs text-slate-600">
                  When you execute search queries using our Network Matcher, we generate non-reversible cryptographic hashes representing approximate ancestor attributes (e.g., birth year and lineage hashes). No plaintext data is ever broadcast or exposed during matches, preventing third parties or other users from mapping your family structure without authorization.
                </p>
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <h3 className="font-bold text-slate-900 uppercase tracking-wider text-xs text-blue-700">3. STRICT DATA USAGE GUARANTEES & RESEARCH CLAUSE</h3>
              <p>
                We believe your private information belongs solely to you. We hold ourselves to the absolute highest standard regarding data utilization:
              </p>
              <div className="p-4 bg-emerald-50/40 border border-emerald-100 rounded-xl space-y-2 text-xs">
                <p className="font-semibold text-emerald-950">🚫 NO MARKETING USE GUARANTEE:</p>
                <p className="text-slate-700">
                  We strictly and absolutely <strong>will not use any of your user data for marketing, advertising, or commercial promotional purposes</strong>. We do not sell, rent, license, trade, or share any user records with third-party advertising companies or data brokers under any circumstances.
                </p>
                <p className="font-semibold text-emerald-950 mt-3">🔬 RESEARCH & PLATFORM IMPROVEMENT ALLOWANCE:</p>
                <p className="text-slate-700">
                  Instead, we <strong>may use non-sensitive, aggregated, and anonymized data for scientific, historical, or academic research purposes</strong> if required. This research is strictly limited to identifying broad genealogical trends, improving computational pedigree match matching accuracy, and optimizing our server processing models. Your personal identity remains fully isolated, unidentifiable, and completely secure.
                </p>
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <h3 className="font-bold text-slate-900 uppercase tracking-wider text-xs text-blue-700">4. Information Collection & Storage</h3>
              <p>
                We minimize data footprint to ensure peak privacy. The only data gathered includes:
              </p>
              <ul className="list-disc pl-5 space-y-1 text-xs text-slate-600">
                <li><strong>Account Credentials:</strong> Basic OAuth indicators or email hashes used to manage active Cloud sessions.</li>
                <li><strong>Encrypted Payload:</strong> Sealed symmetric packages stored in our MySQL SQL backend representing your secure family logs.</li>
                <li><strong>Support Logs:</strong> Securely submitted contact forms (which are sealed and inaccessible to external clients).</li>
              </ul>
            </div>

            <div className="space-y-3 pt-2">
              <h3 className="font-bold text-slate-900 uppercase tracking-wider text-xs text-blue-700">5. Your Rights under GDPR & CCPA</h3>
              <p>
                Because we store your data in cryptographically opaque packages, your rights to be forgotten, to download records, or to edit accounts are entirely under your control. You may wipe your local vault and purge your synced database entries instantly at any time from the settings menu. Since we do not hold your private keys, any deleted data is instantly and mathematically obliterated from our systems.
              </p>
            </div>

            <div className="bg-emerald-50/60 border border-emerald-200 rounded-xl p-4 flex gap-3 text-xs text-emerald-800">
              <CheckCircle className="h-5 w-5 text-emerald-600 shrink-0" />
              <div>
                <span className="font-bold block">Privacy Compliance Verified</span>
                Kinly satisfies all criteria for Zero-Knowledge trust models. Because your encryption keys never leave your machine, your information remains strictly yours.
              </div>
            </div>
          </div>
        )}

        {/* 2. Terms of Use View */}
        {activeSubTab === "terms" && (
          <div className="space-y-6 text-slate-800 leading-relaxed font-sans text-xs sm:text-sm">
            <div className="border-b border-slate-100 pb-4">
              <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
                <FileText className="h-5 w-5 text-blue-600" />
                <span>Kinly Terms of Use Agreement</span>
              </h2>
              <p className="text-[11px] text-slate-400 font-mono mt-1">Last Updated: June 27, 2026 (Not Fixed - Subject to Change)</p>
            </div>

            <p>
              By accessing or using the <strong>Kinly</strong> platform, you agree to be bound by these Terms of Use. 
              Please read them carefully. Because of our advanced cryptographic structure, your legal relationship with us 
              is unique compared to standard cloud platforms.
            </p>

            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-amber-900 space-y-2">
              <span className="font-bold block uppercase text-xs">⚠️ AGREEMENT AMENDMENT NOTICE</span>
              <p className="text-xs">
                These Terms of Use are <strong>not fixed</strong> and may be updated, amended, or supplemented in the future 
                at our sole discretion. Any revisions will take effect immediately upon posting to this page, and your continued 
                use of the platform constitutes direct acceptance of the updated terms.
              </p>
            </div>

            <div className="space-y-3 bg-amber-50/50 border border-dashed border-amber-300 p-4 rounded-xl flex gap-3 text-xs text-amber-950">
              <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
              <div>
                <span className="font-bold block uppercase">CRITICAL WARNING: No Password Recovery</span>
                Because Kinly operates on a zero-knowledge architecture, your Master Password is never transmitted to us. <strong>We cannot recover, reset, or bypass your Master Password if you forget it.</strong> If you lose your credentials, any data synchronized with your cloud vault will remain permanently encrypted and mathematically unrecoverable.
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <h3 className="font-bold text-slate-900 uppercase tracking-wider text-xs text-blue-700">1. Account Security & Key Custody</h3>
              <p>
                You are solely responsible for:
              </p>
              <ul className="list-disc pl-5 space-y-1 text-xs text-slate-600">
                <li>Safeguarding your Master Cryptographic Key sequence or Master Password offline.</li>
                <li>Ensuring the devices you use to access the vault are free from malware, keyloggers, or external surveillance.</li>
                <li>Preventing unauthorized access to active decryption tabs or active offline mirror state exports.</li>
              </ul>
            </div>

            <div className="space-y-3 pt-2">
              <h3 className="font-bold text-slate-900 uppercase tracking-wider text-xs text-blue-700">2. Acceptable Use Policy & Match Ethics</h3>
              <p>
                Kinly matches missing lineages based on anonymized math hashes. You agree:
              </p>
              <ul className="list-disc pl-5 space-y-1 text-xs text-slate-600">
                <li>Not to submit fake ancestry nodes or spoofed parent-child connections to trigger unauthorized match approvals.</li>
                <li>Not to harass, stalk, or attempt to brute-force identities of other members identified through mutual lineage connections.</li>
                <li>To maintain accurate, respectful records of direct historical lineage without malicious data insertion.</li>
              </ul>
            </div>

            <div className="space-y-3 pt-2">
              <h3 className="font-bold text-slate-900 uppercase tracking-wider text-xs text-blue-700">3. Non-Marketing & Research Usage Boundaries</h3>
              <p>
                By accepting these terms, you understand and agree that:
              </p>
              <ul className="list-disc pl-5 space-y-1 text-xs text-slate-600">
                <li>We do not, and will not, license or utilize any stored genealogic payload for commercial advertisement targeting.</li>
                <li>We reserve the right to parse anonymized, aggregated, and non-sensitive structural properties (such as generation counts, tree densities, and node distribution trends) for the explicit purpose of conducting genetic lineage algorithms research and platform optimization.</li>
              </ul>
            </div>

            <div className="space-y-3 pt-2">
              <h3 className="font-bold text-slate-900 uppercase tracking-wider text-xs text-blue-700">4. Limitation of Liability</h3>
              <p>
                The Platform is provided "as is" and "as available" without warranty of any kind. 
                We shall not be held liable for any loss of data, loss of encryption key custody, server downtime, 
                or security compromises resulting from user-side password leaks or local device compromises.
              </p>
            </div>
          </div>
        )}

        {/* 3. Contact Us Page View */}
        {activeSubTab === "contact" && (
          <div className="space-y-6">
            <div className="border-b border-slate-100 pb-4">
              <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
                <Mail className="h-5 w-5 text-blue-600" />
                <span>Contact Our Security & Support Team</span>
              </h2>
              <p className="text-xs text-slate-500 font-sans mt-1">
                Have questions about your secure vault, encryption procedures, or need general help? Fill out the contact form below. 
                To defend against malicious spam networks, this form includes an active honeypot filter and math captcha.
              </p>
            </div>

            {submitSuccess ? (
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-8 text-center max-w-md mx-auto space-y-4 animate-in fade-in zoom-in-95 duration-200">
                <div className="mx-auto h-12 w-12 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
                  <CheckCircle className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-sans font-bold text-slate-900 text-base">Support Message Delivered!</h3>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    Thank you. Your message has been cryptographically logged in our write-only SQL support inbox. 
                    Our team will review your ticket and reach out shortly.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSubmitSuccess(false)}
                  className="px-4 py-2 bg-slate-950 hover:bg-slate-800 text-white text-xs font-bold rounded-xl cursor-pointer transition-all"
                >
                  Submit Another Ticket
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmitContact} className="max-w-2xl mx-auto space-y-4 font-sans text-xs sm:text-sm">
                
                {submitError && (
                  <div className="bg-rose-50 border border-rose-200 text-rose-800 text-xs p-3.5 rounded-xl flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0" />
                    <span>{submitError}</span>
                  </div>
                )}

                {/* Honeypot Spam Filter (Invisible to human users, caught by automatic bot browsers) */}
                <div className="hidden" aria-hidden="true">
                  <label htmlFor="phone_alt_confirm">Do not fill this field if you are a human user:</label>
                  <input
                    type="text"
                    id="phone_alt_confirm"
                    name="phone_alt_confirm"
                    value={honeypot}
                    onChange={(e) => setHoneypot(e.target.value)}
                    autoComplete="off"
                    tabIndex={-1}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label htmlFor="support-name" className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Your Full Name</label>
                    <input
                      type="text"
                      id="support-name"
                      required
                      placeholder="e.g. Eleanor Vance"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:outline-blue-500 bg-white"
                    />
                  </div>

                  <div className="space-y-1">
                    <label htmlFor="support-email" className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Your Secure Email Address</label>
                    <input
                      type="email"
                      id="support-email"
                      required
                      placeholder="e.g. eleanor@protonmail.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:outline-blue-500 bg-white"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label htmlFor="support-subject" className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Subject Topic</label>
                  <input
                    type="text"
                    id="support-subject"
                    required
                    placeholder="e.g. Secure vault sync question"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:outline-blue-500 bg-white"
                  />
                </div>

                <div className="space-y-1">
                  <label htmlFor="support-message" className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Detailed Support Message</label>
                  <textarea
                    id="support-message"
                    required
                    rows={5}
                    placeholder="Provide clear details regarding your cryptographic inquiries or general support questions..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:outline-blue-500 bg-white resize-none"
                  />
                </div>

                {/* Built-in Spam & Bot Captcha Filter */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">🔒 Verification Challenge (Anti-Spam Filter)</span>
                    <button
                      type="button"
                      onClick={generateCaptcha}
                      className="text-[10px] text-blue-600 hover:text-blue-700 flex items-center gap-1 font-bold cursor-pointer transition-all"
                      title="Generate new captcha challenge"
                    >
                      <RefreshCw className="h-3 w-3" /> Refresh Code
                    </button>
                  </div>
                  
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                    <div className="bg-slate-200 px-4 py-2 rounded-xl text-sm font-mono font-bold tracking-widest text-slate-800 select-none border border-slate-300">
                      Solve: {captchaNum1} + {captchaNum2} = ?
                    </div>
                    <div className="flex-1 w-full sm:w-auto">
                      <input
                        type="number"
                        id="support-captcha-response"
                        required
                        placeholder="Type correct sum here..."
                        value={userCaptcha}
                        onChange={(e) => {
                          setUserCaptcha(e.target.value);
                          setCaptchaError(false);
                        }}
                        className={`w-full text-xs p-2.5 rounded-xl border bg-white focus:outline-blue-500 ${
                          captchaError ? "border-rose-400 focus:ring-1 focus:ring-rose-500" : "border-slate-200"
                        }`}
                      />
                    </div>
                  </div>
                  {captchaError && (
                    <p className="text-[11px] text-rose-600 font-semibold">Incorrect sum code. Please calculate and re-enter to prove you are a human user.</p>
                  )}
                </div>

                <div className="pt-2 flex items-center justify-end">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className={`px-6 py-2.5 rounded-xl text-xs font-bold text-white shadow-md transition-all cursor-pointer ${
                      isSubmitting
                        ? "bg-slate-400 cursor-not-allowed"
                        : "bg-blue-600 hover:bg-blue-700 hover:shadow-lg"
                    }`}
                  >
                    {isSubmitting ? "Delivering Message securely..." : "Deliver Support Query Securely"}
                  </button>
                </div>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
