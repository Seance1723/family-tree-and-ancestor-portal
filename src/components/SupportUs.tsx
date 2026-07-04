import React, { useState } from "react";
import { 
  Heart, 
  Sparkles, 
  Check, 
  Coffee, 
  Gift, 
  ChevronRight, 
  ShieldCheck, 
  Award,
  DollarSign
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import RazorpayModal from "./RazorpayModal";
import { db, collection, doc, setDoc } from "../services/firebase";

interface SupportUsProps {
  userEmail: string;
  userId: string;
  onClose?: () => void;
}

export default function SupportUs({ userEmail, userId, onClose }: SupportUsProps) {
  const [selectedAmount, setSelectedAmount] = useState<number>(250);
  const [customAmount, setCustomAmount] = useState<string>("");
  const [isCustom, setIsCustom] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  const [supportSuccess, setSupportSuccess] = useState(false);
  const [paymentDetails, setPaymentDetails] = useState<any>(null);

  const presets = [50, 100, 250, 500, 1000];

  const currentAmount = isCustom ? (Number(customAmount) || 0) : selectedAmount;

  const handleSupportSuccess = async (data: {
    razorpay_payment_id: string;
    razorpay_order_id: string;
    razorpay_signature: string;
  }) => {
    try {
      // Record the donation in Firestore
      const donationId = "don_" + Date.now() + "_" + Math.random().toString(36).substring(2, 9);
      const docRef = doc(collection(db, "donations"), donationId);
      
      const donationRecord = {
        id: donationId,
        userId: userId,
        email: userEmail,
        amount: currentAmount,
        razorpayPaymentId: data.razorpay_payment_id,
        razorpayOrderId: data.razorpay_order_id,
        contributedAt: Date.now(),
        status: "completed"
      };

      await setDoc(docRef, donationRecord);
      setPaymentDetails(donationRecord);
      setSupportSuccess(true);
    } catch (e) {
      console.error("Failed to record contribution in database:", e);
    } finally {
      setShowCheckout(false);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-4 sm:p-6 space-y-6">
      {/* Header Banner */}
      <div className="text-center border-b border-slate-200 dark:border-slate-800 pb-6 space-y-2">
        <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 text-[10px] font-black border border-rose-500/20 uppercase tracking-widest">
          <Heart className="h-3.5 w-3.5 fill-rose-500 animate-pulse" />
          <span>Keep Kinly Alive & Independent</span>
        </div>
        <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight uppercase">
          Support Kinly Development
        </h1>
        <p className="text-xs text-slate-500 font-mono mt-1 max-w-xl mx-auto">
          We do not sell your personal data or family tree details to advertisers. Kinly relies strictly on community support and premium upgrades to power cryptographic servers.
        </p>
      </div>

      {supportSuccess ? (
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-emerald-50 border border-emerald-200 rounded-3xl p-8 text-center max-w-xl mx-auto space-y-6 shadow-md"
        >
          <div className="mx-auto h-16 w-16 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 shadow-sm">
            <Award className="h-8 w-8 stroke-[2.5]" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-black text-slate-900 tracking-tight">Thank You For Your Support!</h2>
            <p className="text-xs text-slate-600 leading-relaxed max-w-md mx-auto">
              Your contribution of <strong className="text-emerald-700">₹{paymentDetails?.amount}.00 INR</strong> has been processed securely. This donation directly supports our research, dynamic matching models, and zero-knowledge storage servers.
            </p>
          </div>

          <div className="bg-white/80 p-4 border border-emerald-100 rounded-2xl text-[11px] text-slate-500 font-mono text-left space-y-1">
            <div className="flex justify-between border-b border-slate-100 pb-1.5 font-bold text-slate-700 uppercase tracking-wider text-[10px]">
              <span>Receipt Ledger</span>
              <span className="text-emerald-600">CONFIRMED</span>
            </div>
            <div className="flex justify-between pt-1">
              <span>Transaction Reference:</span>
              <span className="text-slate-800 font-bold">{paymentDetails?.razorpayPaymentId}</span>
            </div>
            <div className="flex justify-between">
              <span>Order Reference:</span>
              <span className="text-slate-800 font-bold">{paymentDetails?.razorpayOrderId}</span>
            </div>
            <div className="flex justify-between">
              <span>Timestamp:</span>
              <span className="text-slate-800 font-bold">{new Date(paymentDetails?.contributedAt).toLocaleString()}</span>
            </div>
          </div>

          <div className="pt-2">
            <button
              onClick={() => setSupportSuccess(false)}
              className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-all cursor-pointer shadow-md hover:shadow-emerald-500/10"
            >
              Support Us Again
            </button>
          </div>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          
          {/* Main contribution selection */}
          <div className="md:col-span-7 bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 space-y-6">
            <div className="space-y-2">
              <h3 className="font-bold text-slate-900 text-sm tracking-tight">Select Donation Amount</h3>
              <p className="text-xs text-slate-500">Every rupee contributed goes directly into hosting, security, and feature development.</p>
            </div>

            {/* Presets Grid */}
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
              {presets.map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => {
                    setSelectedAmount(amt);
                    setIsCustom(false);
                  }}
                  className={`py-3 rounded-2xl text-xs font-black transition-all border flex flex-col items-center justify-center gap-1 cursor-pointer ${
                    !isCustom && selectedAmount === amt
                      ? "bg-rose-500 text-white border-rose-500 shadow-md shadow-rose-500/15"
                      : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                  }`}
                >
                  <span className="text-[10px] text-slate-400 font-medium">INR</span>
                  <span>₹{amt}</span>
                </button>
              ))}
            </div>

            {/* Custom choice */}
            <div className="space-y-2.5">
              <button
                type="button"
                onClick={() => setIsCustom(true)}
                className={`w-full py-2.5 rounded-xl text-xs font-bold transition-all border flex items-center justify-center gap-2 cursor-pointer ${
                  isCustom 
                    ? "bg-rose-50 border-rose-300 text-rose-700" 
                    : "bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100"
                }`}
              >
                <span>Or contribute a custom amount</span>
              </button>

              <AnimatePresence>
                {isCustom && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="relative pt-2">
                      <input
                        type="number"
                        min="10"
                        placeholder="Enter amount (Min ₹10)"
                        value={customAmount}
                        onChange={(e) => setCustomAmount(e.target.value)}
                        className="w-full px-4 py-3 bg-white border border-slate-200 text-slate-900 rounded-xl text-xs outline-hidden focus:border-rose-500 transition-all font-mono font-bold"
                      />
                      <span className="absolute right-4 top-5 text-[10px] font-bold text-slate-400">INR (₹)</span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Checkout CTA */}
            <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-mono">
                <ShieldCheck className="h-4 w-4 text-rose-500" />
                <span>Sandbox Secure Gateway</span>
              </div>
              
              <button
                type="button"
                disabled={currentAmount < 10}
                onClick={() => setShowCheckout(true)}
                className={`w-full sm:w-auto px-6 py-3 text-xs font-black rounded-xl cursor-pointer transition-all flex items-center justify-center gap-2 shadow-md ${
                  currentAmount >= 10
                    ? "bg-rose-500 hover:bg-rose-600 text-white shadow-rose-500/15 hover:shadow-rose-500/25"
                    : "bg-slate-200 text-slate-400 cursor-not-allowed"
                }`}
              >
                <span>Contribute ₹{currentAmount}.00 INR</span>
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Side Info Cards */}
          <div className="md:col-span-5 space-y-4">
            
            {/* Impact statement Card */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 text-white space-y-4 relative overflow-hidden">
              <div className="absolute right-4 top-4 text-rose-500/10">
                <Heart className="h-16 w-16 fill-rose-500" />
              </div>
              <span className="text-[10px] text-rose-400 font-mono uppercase font-bold tracking-wider">Independent Tech</span>
              <h3 className="text-base font-black uppercase tracking-tight">Where your money goes</h3>
              
              <div className="space-y-3.5 text-xs text-slate-300">
                <div className="flex gap-2">
                  <div className="h-5 w-5 rounded-full bg-slate-800 text-[10px] flex items-center justify-center font-bold text-rose-400 shrink-0">1</div>
                  <p className="leading-normal"><strong>Secure Server Infrastructure:</strong> Keeps zero-knowledge databases up and completely synchronized in real-time.</p>
                </div>
                <div className="flex gap-2">
                  <div className="h-5 w-5 rounded-full bg-slate-800 text-[10px] flex items-center justify-center font-bold text-rose-400 shrink-0">2</div>
                  <p className="leading-normal"><strong>Academic Genealogy Research:</strong> Funds algorithmic improvements for mapping complex ancestral loops without risking personal privacy.</p>
                </div>
                <div className="flex gap-2">
                  <div className="h-5 w-5 rounded-full bg-slate-800 text-[10px] flex items-center justify-center font-bold text-rose-400 shrink-0">3</div>
                  <p className="leading-normal"><strong>Feature Expansion:</strong> Helps build encrypted file storage for precious family certificates, memories, and historic document archives.</p>
                </div>
              </div>
            </div>

            {/* Transparency Note */}
            <div className="bg-slate-50 border border-slate-200 rounded-3xl p-5 text-xs text-slate-600 space-y-2.5">
              <span className="font-bold text-slate-800 flex items-center gap-1.5 uppercase text-[10px] tracking-wider">
                <Coffee className="h-4 w-4 text-amber-500" /> Community Pledge
              </span>
              <p className="leading-relaxed">
                By donating, you help us stay true to our manifesto: 0% data monetization, 100% cryptographic user control. This is not a service fee; it is an elective support gift representing your partnership in building secure, independent digital platforms.
              </p>
            </div>

          </div>

        </div>
      )}

      {/* Razorpay Gateway Overlay */}
      <AnimatePresence>
        {showCheckout && (
          <RazorpayModal
            amount={currentAmount}
            email={userEmail}
            slots={9999} // Dummy value for donation context
            onSuccess={handleSupportSuccess}
            onClose={() => setShowCheckout(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
