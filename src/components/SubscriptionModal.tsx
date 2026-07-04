import React, { useState } from "react";
import { 
  X, 
  Check, 
  Sparkles, 
  ChevronRight, 
  ShieldCheck, 
  Users, 
  HelpCircle,
  Clock,
  ArrowRight
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import RazorpayModal from "./RazorpayModal";

interface SubscriptionModalProps {
  currentMembersCount: number;
  userEmail: string;
  onClose: () => void;
  onSubscriptionUpdate: (subData: {
    isPremium: boolean;
    slots: number;
    amountPaid: number;
    paymentStatus: string;
    razorpayOrderId?: string;
    razorpayPaymentId?: string;
    expiresAt?: number;
  }) => void;
  upgradeFlowEnabled?: boolean;
  maxUpgradeSlots?: number;
}

export default function SubscriptionModal({ 
  currentMembersCount, 
  userEmail, 
  onClose, 
  onSubscriptionUpdate,
  upgradeFlowEnabled = true,
  maxUpgradeSlots = 50
}: SubscriptionModalProps) {
  // Cap starting slots at maxUpgradeSlots
  const defaultSlots = Math.min(10, maxUpgradeSlots);
  const [selectedSlots, setSelectedSlots] = useState<number>(defaultSlots);
  const [showCheckout, setShowCheckout] = useState(false);

  // Calculate dynamic price (₹2 per user slot monthly)
  // Give a package discount if they choose large values or complete unlimited
  const calculatePrice = (slots: number) => {
    if (slots >= 100 && maxUpgradeSlots >= 100) return 150; // Discounted flat rate for unlimited
    return slots * 2;
  };

  const currentPrice = calculatePrice(selectedSlots);

  const handlePaymentSuccess = (paymentData: {
    razorpay_payment_id: string;
    razorpay_order_id: string;
    razorpay_signature: string;
  }) => {
    // Generate subscription expiry timestamp (1 month from now)
    const nextMonth = Date.now() + 30 * 24 * 60 * 60 * 1000;
    
    onSubscriptionUpdate({
      isPremium: true,
      slots: selectedSlots >= 100 && maxUpgradeSlots >= 100 ? 999999 : selectedSlots, // 999999 acts as infinite slots
      amountPaid: currentPrice,
      paymentStatus: "paid",
      razorpayOrderId: paymentData.razorpay_order_id,
      razorpayPaymentId: paymentData.razorpay_payment_id,
      expiresAt: nextMonth
    });
    
    setShowCheckout(false);
  };

  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col relative text-slate-100 font-sans"
      >
        {/* Close button */}
        <button 
          onClick={onClose}
          className="absolute top-5 right-5 p-2 bg-slate-800/40 hover:bg-slate-800 border border-slate-800 rounded-xl text-slate-400 hover:text-white transition-colors cursor-pointer z-10"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Top Accent Gradient */}
        <div className="h-1.5 w-full bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500"></div>

        {/* Header Hero */}
        <div className="p-6 sm:p-8 text-center bg-slate-950/20 border-b border-slate-800/60">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 text-blue-400 text-[10px] font-bold border border-blue-500/20 uppercase tracking-widest mb-4">
            <Sparkles className="h-3.5 w-3.5 animate-spin-slow" />
            <span>Premium Membership</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">Expand Your Genealogy Tree</h2>
          <p className="text-xs text-slate-400 mt-2 max-w-sm mx-auto">
            You've reached or are approaching your free limit of <strong className="text-white">3 members</strong>. Unlock unlimited slots and professional features.
          </p>
        </div>

        {/* Main interactive section */}
        <div className="p-6 sm:p-8 space-y-6 flex-1">
          {/* Current Status Indicator */}
          <div className="bg-slate-850/50 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 bg-slate-800 rounded-xl flex items-center justify-center text-slate-400">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Current Usage</p>
                <p className="text-xs text-slate-300 font-bold mt-0.5">Free Tier Slots</p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-lg font-mono font-black text-slate-100">{currentMembersCount}</span>
              <span className="text-xs text-slate-500"> / 3 slots</span>
              <div className="w-24 bg-slate-800 h-1.5 rounded-full mt-1.5 overflow-hidden">
                <div 
                  className={`h-full rounded-full ${currentMembersCount >= 3 ? "bg-amber-500" : "bg-blue-500"}`} 
                  style={{ width: `${Math.min(100, (currentMembersCount / 3) * 100)}%` }}
                ></div>
              </div>
            </div>
          </div>

          {/* Slot Selector Slider & Billing Calculation */}
          {!upgradeFlowEnabled ? (
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-5 space-y-2">
              <h4 className="text-xs font-bold text-amber-400 flex items-center gap-1.5 uppercase tracking-wide">
                <Clock className="h-4 w-4 shrink-0" />
                <span>Upgrades Temporarily Suspended</span>
              </h4>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                The platform administrator has temporarily disabled subscription upgrades for maintenance or compliance reviews. Premium slots cannot be purchased at this time. Please try again later or submit a support ticket in our Help center.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-300">Choose Premium Member Slots</label>
                <span className="text-xs font-mono bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2.5 py-0.5 rounded-md font-bold">
                  {selectedSlots >= 100 && maxUpgradeSlots >= 100 ? "Complete Unlimited" : `${selectedSlots} Slots`}
                </span>
              </div>

              <div className="relative pt-2">
                <input 
                  type="range"
                  min="5"
                  max={maxUpgradeSlots}
                  step={selectedSlots > 50 ? 10 : 5}
                  value={selectedSlots}
                  onChange={(e) => setSelectedSlots(Math.min(maxUpgradeSlots, Number(e.target.value)))}
                  className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
                <div className="flex justify-between text-[10px] text-slate-500 mt-2 font-mono">
                  <span>5 slots</span>
                  <span>{Math.round(maxUpgradeSlots / 4)} slots</span>
                  <span>{Math.round(maxUpgradeSlots / 2)} slots</span>
                  <span>{Math.round((maxUpgradeSlots * 3) / 4)} slots</span>
                  <span>Max ({maxUpgradeSlots})</span>
                </div>
              </div>

              {/* Price Preview Card */}
              <div className="bg-blue-600/10 border border-blue-500/20 rounded-2xl p-5 flex items-center justify-between mt-4">
                <div>
                  <span className="text-[10px] bg-blue-500/20 text-blue-300 font-semibold border border-blue-500/30 px-2 py-0.5 rounded-md uppercase tracking-wider">
                    ₹2 INR / Slot / month
                  </span>
                  <p className="text-xs text-slate-300 mt-2 font-medium">
                    {selectedSlots >= 100 && maxUpgradeSlots >= 100
                      ? "Unlimited Ancestors package with bundled discount" 
                      : `Monthly lease for ${selectedSlots} family records`}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Total Price</p>
                  <p className="text-2xl font-mono font-black text-blue-400">₹{currentPrice}.00</p>
                  <p className="text-[10px] text-slate-500">per month (INR)</p>
                </div>
              </div>
            </div>
          )}

          {/* Premium Features List */}
          <div className="space-y-2.5 bg-slate-950/20 p-4 border border-slate-800/60 rounded-2xl">
            <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Premium Features Included:</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <div className="flex items-start gap-2 text-slate-300">
                <Check className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                <span>Unlimited Ancestor Nodes</span>
              </div>
              <div className="flex items-start gap-2 text-slate-300">
                <Check className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                <span>AI Ancestral Match Scanner</span>
              </div>
              <div className="flex items-start gap-2 text-slate-300">
                <Check className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                <span>Encrypted Ledger Sync</span>
              </div>
              <div className="flex items-start gap-2 text-slate-300">
                <Check className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                <span>Reminders & Document Vault</span>
              </div>
            </div>
          </div>
        </div>

        {/* Action controls */}
        <div className="p-6 bg-slate-950 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
            <ShieldCheck className="h-4 w-4 text-blue-500" />
            <span>Cancel anytime. Money-back guarantee.</span>
          </div>
          {upgradeFlowEnabled ? (
            <button
              onClick={() => setShowCheckout(true)}
              className="w-full sm:w-auto px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm rounded-xl cursor-pointer shadow-lg shadow-blue-500/15 hover:shadow-blue-500/25 transition-all flex items-center justify-center gap-2"
            >
              <span>Proceed to Payment</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              disabled
              className="w-full sm:w-auto px-6 py-3 bg-slate-800 text-slate-500 font-bold text-sm rounded-xl cursor-not-allowed flex items-center justify-center gap-2"
            >
              <span>Upgrades Unavailable</span>
              <X className="h-4 w-4 text-rose-500" />
            </button>
          )}
        </div>
      </motion.div>

      {/* Razorpay Gateway Overlay */}
      <AnimatePresence>
        {showCheckout && upgradeFlowEnabled && (
          <RazorpayModal
            amount={currentPrice}
            email={userEmail}
            slots={selectedSlots >= 100 && maxUpgradeSlots >= 100 ? 999999 : selectedSlots}
            onSuccess={handlePaymentSuccess}
            onClose={() => setShowCheckout(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
