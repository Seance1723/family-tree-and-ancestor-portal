import React, { useState } from "react";
import { 
  X, 
  Check, 
  Sparkles, 
  ShieldCheck, 
  Users, 
  Clock,
  ArrowRight,
  Gift
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
  freeTierLimit?: number;
  premiumPriceMonthly?: number;
  premiumPriceYearly?: number;
  coupons?: any[];
}

export default function SubscriptionModal({ 
  currentMembersCount, 
  userEmail, 
  onClose, 
  onSubscriptionUpdate,
  upgradeFlowEnabled = true,
  freeTierLimit = 3,
  premiumPriceMonthly = 99,
  premiumPriceYearly = 799,
  coupons = []
}: SubscriptionModalProps) {
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly");
  const [couponInput, setCouponInput] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<{ code: string; discountPct: number } | null>(null);
  const [couponError, setCouponError] = useState("");
  const [couponSuccess, setCouponSuccess] = useState("");
  const [showCheckout, setShowCheckout] = useState(false);

  // Price calculations
  const basePrice = billingCycle === "monthly" ? premiumPriceMonthly : premiumPriceYearly;
  const discountAmount = appliedCoupon ? Math.round((basePrice * appliedCoupon.discountPct) / 100) : 0;
  const finalPrice = Math.max(0, basePrice - discountAmount);

  const handleApplyCoupon = () => {
    setCouponError("");
    setCouponSuccess("");
    const code = couponInput.trim().toUpperCase();
    if (!code) return;
    const match = coupons.find((c) => c.code === code);
    if (!match) {
      setCouponError("Invalid coupon code");
      return;
    }
    if (!match.isActive) {
      setCouponError("This coupon is inactive");
      return;
    }
    if (Date.now() > match.expiresAt) {
      setCouponError("This coupon has expired");
      return;
    }
    setAppliedCoupon({ code: match.code, discountPct: match.discountPct });
    setCouponSuccess(`Coupon applied! ${match.discountPct}% Discount`);
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponInput("");
    setCouponSuccess("");
    setCouponError("");
  };

  const handlePaymentSuccess = (paymentData: {
    razorpay_payment_id: string;
    razorpay_order_id: string;
    razorpay_signature: string;
  }) => {
    const durationDays = billingCycle === "monthly" ? 30 : 365;
    const expiresAt = Date.now() + durationDays * 24 * 60 * 60 * 1000;
    
    onSubscriptionUpdate({
      isPremium: true,
      slots: 999999, // unlimited slots
      amountPaid: finalPrice,
      paymentStatus: "paid",
      razorpayOrderId: paymentData.razorpay_order_id,
      razorpayPaymentId: paymentData.razorpay_payment_id,
      expiresAt
    });
    
    setShowCheckout(false);
  };

  const handleFreeActivation = () => {
    const durationDays = billingCycle === "monthly" ? 30 : 365;
    const expiresAt = Date.now() + durationDays * 24 * 60 * 60 * 1000;
    
    onSubscriptionUpdate({
      isPremium: true,
      slots: 999999, // unlimited slots
      amountPaid: 0,
      paymentStatus: "paid",
      razorpayOrderId: "PROMO_100",
      razorpayPaymentId: `FREE-${Date.now()}`,
      expiresAt
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
            You've reached or are approaching your free limit of <strong className="text-white">{freeTierLimit} members</strong>. Unlock unlimited slots and professional features.
          </p>
        </div>

        {/* Main interactive section */}
        <div className="p-6 sm:p-8 space-y-6 flex-1 overflow-y-auto max-h-[50vh]">
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
              <span className="text-xs text-slate-500"> / {freeTierLimit} slots</span>
              <div className="w-24 bg-slate-800 h-1.5 rounded-full mt-1.5 overflow-hidden">
                <div 
                  className={`h-full rounded-full ${currentMembersCount >= freeTierLimit ? "bg-amber-500" : "bg-blue-500"}`} 
                  style={{ width: `${Math.min(100, (currentMembersCount / freeTierLimit) * 100)}%` }}
                ></div>
              </div>
            </div>
          </div>

          {!upgradeFlowEnabled ? (
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-5 space-y-2">
              <h4 className="text-xs font-bold text-amber-400 flex items-center gap-1.5 uppercase tracking-wide">
                <Clock className="h-4 w-4 shrink-0" />
                <span>Upgrades Temporarily Suspended</span>
              </h4>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                The platform administrator has temporarily disabled subscription upgrades. Please try again later.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Billing Cycle Selection */}
              <div className="flex items-center justify-between bg-slate-950 p-1 rounded-xl border border-slate-850">
                <button
                  type="button"
                  onClick={() => setBillingCycle("monthly")}
                  className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    billingCycle === "monthly"
                      ? "bg-slate-800 text-white shadow"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  Monthly Upgrade
                </button>
                <button
                  type="button"
                  onClick={() => setBillingCycle("yearly")}
                  className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    billingCycle === "yearly"
                      ? "bg-slate-800 text-white shadow"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  Yearly Upgrade
                </button>
              </div>

              {/* Coupon input */}
              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide">Discount Coupon</label>
                <div className="flex gap-2">
                  <div className="relative flex-grow">
                    <input
                      type="text"
                      placeholder="Enter coupon code"
                      disabled={!!appliedCoupon}
                      value={couponInput}
                      onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono font-bold text-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500 uppercase disabled:opacity-50"
                    />
                  </div>
                  {appliedCoupon ? (
                    <button
                      type="button"
                      onClick={handleRemoveCoupon}
                      className="px-4 py-2 bg-rose-950/40 text-rose-400 border border-rose-900/30 text-xs font-bold rounded-xl cursor-pointer hover:bg-rose-900/30 transition-all"
                    >
                      Remove
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleApplyCoupon}
                      className="px-4 py-2 bg-slate-800 hover:bg-slate-750 text-xs font-bold rounded-xl cursor-pointer transition-all border border-slate-700"
                    >
                      Apply
                    </button>
                  )}
                </div>
                {couponError && <p className="text-[10px] text-rose-500 font-medium">{couponError}</p>}
                {couponSuccess && <p className="text-[10px] text-emerald-500 font-medium">{couponSuccess}</p>}
              </div>

              {/* Price Preview Card */}
              <div className="bg-blue-600/10 border border-blue-500/20 rounded-2xl p-5 flex items-center justify-between mt-4">
                <div>
                  <span className="text-[10px] bg-blue-500/20 text-blue-300 font-semibold border border-blue-500/30 px-2 py-0.5 rounded-md uppercase tracking-wider">
                    Unlimited slots package
                  </span>
                  <p className="text-xs text-slate-300 mt-2 font-medium">
                    {billingCycle === "monthly" ? "Renews monthly, cancel anytime" : "Subscribed for 1 full year"}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Total Price</p>
                  {appliedCoupon ? (
                    <div className="space-y-0.5">
                      <span className="text-xs line-through text-slate-500 mr-1.5">₹{basePrice}</span>
                      <span className="text-2xl font-mono font-black text-blue-400">₹{finalPrice}</span>
                    </div>
                  ) : (
                    <p className="text-2xl font-mono font-black text-blue-400">₹{basePrice}</p>
                  )}
                  <p className="text-[10px] text-slate-500">per {billingCycle === "monthly" ? "month" : "year"} (INR)</p>
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
                <span>Unlimited Family Tree Nodes</span>
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
            finalPrice === 0 ? (
              <button
                type="button"
                onClick={handleFreeActivation}
                className="w-full sm:w-auto px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm rounded-xl cursor-pointer shadow-lg transition-all flex items-center justify-center gap-2"
              >
                <span>Activate Free Premium</span>
                <Gift className="h-4 w-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setShowCheckout(true)}
                className="w-full sm:w-auto px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm rounded-xl cursor-pointer shadow-lg shadow-blue-500/15 hover:shadow-blue-500/25 transition-all flex items-center justify-center gap-2"
              >
                <span>Proceed to Payment</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            )
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
        {showCheckout && upgradeFlowEnabled && finalPrice > 0 && (
          <RazorpayModal
            amount={finalPrice}
            email={userEmail}
            slots={999999} // Unlimited premium slots
            onSuccess={handlePaymentSuccess}
            onClose={() => setShowCheckout(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
