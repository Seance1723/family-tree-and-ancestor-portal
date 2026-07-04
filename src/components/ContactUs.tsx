import React, { useState, useEffect } from "react";
import { Mail, CheckCircle, AlertTriangle, RefreshCw, Send, ShieldAlert, Clock } from "lucide-react";
import { db, collection, doc, setDoc } from "../services/firebase";

export default function ContactUs() {
  // Contact form state
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [honeypot, setHoneypot] = useState(""); // Honeypot field (bot filter 1)
  
  // Math challenge state (bot filter 2)
  const [captchaNum1, setCaptchaNum1] = useState(0);
  const [captchaNum2, setCaptchaNum2] = useState(0);
  const [userCaptcha, setUserCaptcha] = useState("");
  const [captchaError, setCaptchaError] = useState(false);

  // Time-lock challenge state (bot filter 3)
  const [mountTime] = useState(Date.now());
  const [timeWarning, setTimeWarning] = useState(false);

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
  }, []);

  const handleSubmitContact = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError("");
    setSubmitSuccess(false);
    setTimeWarning(false);

    // 1. Bot Honeypot detection
    if (honeypot.trim() !== "") {
      console.warn("Honeypot filled! Flagged as spam bot.");
      setIsSubmitting(true);
      // Quietly simulate success to waste the bot's cycles
      setTimeout(() => {
        setIsSubmitting(false);
        setSubmitSuccess(true);
        setName("");
        setEmail("");
        setSubject("");
        setMessage("");
      }, 1000);
      return;
    }

    // 2. Time-lock detection (submitted under 3 seconds = impossible for humans)
    const duration = (Date.now() - mountTime) / 1000;
    if (duration < 3.0) {
      console.warn(`Time lock violation! Submitted in ${duration}s. Flagged as script.`);
      setTimeWarning(true);
      return;
    }

    // 3. Captcha verification
    const correctAnswer = captchaNum1 + captchaNum2;
    if (parseInt(userCaptcha.trim(), 10) !== correctAnswer) {
      setCaptchaError(true);
      return;
    }

    // 4. Form fields validation
    if (!name.trim() || !email.trim() || !subject.trim() || !message.trim()) {
      setSubmitError("All fields are strictly required.");
      return;
    }

    setIsSubmitting(true);

    try {
      const messageId = "msg_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9);
      const docRef = doc(collection(db, "contact_messages"), messageId);
      
      await setDoc(docRef, {
        id: messageId,
        name: name.trim(),
        email: email.trim().toLowerCase(),
        subject: subject.trim(),
        message: message.trim(),
        submittedAt: new Date().toISOString(),
        clientReferrer: "Kinly Web Vault Dedicated Contact",
        status: "unread" // default for Super Admin moderator
      });

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
    <div className="w-full max-w-4xl mx-auto p-4 sm:p-6 space-y-6">
      {/* Page Header */}
      <div className="border-b border-slate-200 dark:border-slate-800 pb-5">
        <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight uppercase flex items-center gap-2">
          <span>Contact Secure Support</span>
        </h1>
        <p className="text-xs text-slate-500 font-mono mt-1">
          Have questions about security keys, zero-knowledge vaults, or need account help?
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Info Panel */}
        <div className="bg-slate-900 text-slate-100 rounded-2xl p-6 border border-slate-800 space-y-6">
          <div className="space-y-2">
            <h3 className="font-bold uppercase text-xs tracking-wider text-slate-400">🛡️ End-To-End Security</h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              We encrypt and partition your genealogical structures browser-side. However, for support queries, 
              we write communications directly to an isolated, secure, write-only admin collection.
            </p>
          </div>

          <div className="space-y-2">
            <h3 className="font-bold uppercase text-xs tracking-wider text-slate-400">🤖 Integrated Spam Protection</h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              To guarantee extreme service availability, this form has 3 active security gates:
            </p>
            <ul className="text-[11px] space-y-1.5 text-slate-400 font-mono pl-1">
              <li className="flex items-center gap-1.5">
                <span className="text-emerald-500">✔</span> Invisible Honeypot Traps
              </li>
              <li className="flex items-center gap-1.5">
                <span className="text-emerald-500">✔</span> Math Decoupled Captchas
              </li>
              <li className="flex items-center gap-1.5">
                <span className="text-emerald-500">✔</span> Millisecond Time-Lock Gates
              </li>
            </ul>
          </div>

          <div className="pt-4 border-t border-slate-800 text-[11px] text-slate-500 font-mono">
            Kinly Security Operations Center (SOC)<br />
            Status: Fully Armed & Online
          </div>
        </div>

        {/* Form Panel */}
        <div className="md:col-span-2 bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-xs">
          {submitSuccess ? (
            <div className="text-center py-12 max-w-md mx-auto space-y-4 animate-in fade-in zoom-in-95 duration-200">
              <div className="mx-auto h-12 w-12 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
                <CheckCircle className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-sans font-bold text-slate-900 text-base">Message Sent Successfully!</h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Thank you. Your message has been logged in our secure support repository. 
                  Our Super Admin and Support moderator team will review your inquiry shortly.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSubmitSuccess(false)}
                className="px-4 py-2 bg-slate-950 hover:bg-slate-800 text-white text-xs font-bold rounded-xl cursor-pointer transition-all"
              >
                Submit Another Message
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmitContact} className="space-y-4 font-sans text-xs sm:text-sm">
              
              {submitError && (
                <div className="bg-rose-50 border border-rose-200 text-rose-800 text-xs p-3.5 rounded-xl flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0" />
                  <span>{submitError}</span>
                </div>
              )}

              {timeWarning && (
                <div className="bg-amber-50 border border-amber-200 text-amber-800 text-xs p-3.5 rounded-xl flex flex-col gap-1.5">
                  <div className="flex items-center gap-2 font-bold">
                    <Clock className="h-4 w-4 text-amber-600 shrink-0" />
                    <span>Submission Blocked: Speed Violation</span>
                  </div>
                  <span className="text-[11px] text-amber-700 font-medium">
                    This form was submitted faster than humanly possible. Please wait 3 seconds to ensure you are a human user, then click send.
                  </span>
                </div>
              )}

              {/* Honeypot Spam Filter (Invisible to human users, caught by automatic bot browsers) */}
              <div className="hidden" aria-hidden="true">
                <label htmlFor="phone_alt_confirm">Do not fill this field if you are human:</label>
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
                    placeholder="e.g. Marcus Vance"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:outline-blue-500 bg-white"
                  />
                </div>

                <div className="space-y-1">
                  <label htmlFor="support-email" className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Your Contact Email</label>
                  <input
                    type="email"
                    id="support-email"
                    required
                    placeholder="e.g. marcus@vault.com"
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
                  placeholder="e.g. Secure vault synchronization query"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:outline-blue-500 bg-white"
                />
              </div>

              <div className="space-y-1">
                <label htmlFor="support-message" className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Support Message Body</label>
                <textarea
                  id="support-message"
                  required
                  rows={5}
                  placeholder="Provide precise details regarding your inquiry..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:outline-blue-500 bg-white resize-none"
                />
              </div>

              {/* Built-in Spam & Bot Captcha Filter */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">🔒 Anti-Bot Filter Challenge</span>
                  <button
                    type="button"
                    onClick={generateCaptcha}
                    className="text-[10px] text-blue-600 hover:text-blue-700 flex items-center gap-1 font-bold cursor-pointer transition-all"
                    title="Generate new challenge"
                  >
                    <RefreshCw className="h-3 w-3" /> Refresh
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
                      placeholder="Calculate sum..."
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
                  <p className="text-[11px] text-rose-600 font-semibold">Incorrect response code. Please calculate and re-enter.</p>
                )}
              </div>

              <div className="pt-2 flex items-center justify-end">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`px-6 py-2.5 rounded-xl text-xs font-bold text-white shadow-md transition-all cursor-pointer flex items-center gap-1.5 ${
                    isSubmitting
                      ? "bg-slate-400 cursor-not-allowed"
                      : "bg-blue-600 hover:bg-blue-700 hover:shadow-lg"
                  }`}
                >
                  <Send className="h-3.5 w-3.5" />
                  <span>{isSubmitting ? "Delivering securely..." : "Deliver Secure Inquiry"}</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
