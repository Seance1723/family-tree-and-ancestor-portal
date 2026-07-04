import React, { useState, useEffect } from "react";
import { 
  CreditCard, 
  Smartphone, 
  Laptop, 
  Wallet, 
  Check, 
  ArrowLeft, 
  Loader2, 
  ShieldCheck, 
  ChevronRight,
  Info,
  QrCode
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface RazorpayModalProps {
  amount: number;
  email: string;
  slots: number;
  onSuccess: (paymentDetails: {
    razorpay_payment_id: string;
    razorpay_order_id: string;
    razorpay_signature: string;
  }) => void;
  onClose: () => void;
}

export default function RazorpayModal({ amount, email, slots, onSuccess, onClose }: RazorpayModalProps) {
  const [step, setStep] = useState<"method" | "upi" | "card" | "netbanking" | "wallet" | "processing" | "otp" | "success">("method");
  const [selectedMethod, setSelectedMethod] = useState<string>("");
  const [cardNumber, setCardNumber] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvv, setCardCvv] = useState("");
  const [cardName, setCardName] = useState("");
  const [upiId, setUpiId] = useState("");
  const [otpValue, setOtpValue] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [timer, setTimer] = useState(30);

  // Auto-decrement OTP timer
  useEffect(() => {
    let interval: any;
    if (step === "otp" && timer > 0) {
      interval = setInterval(() => {
        setTimer((t) => t - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [step, timer]);

  const handlePayMethodSelect = (method: "upi" | "card" | "netbanking" | "wallet") => {
    setSelectedMethod(method);
    setStep(method);
  };

  const handleProcessPayment = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (selectedMethod === "upi" && !upiId.includes("@")) {
      setErrorMsg("Please enter a valid UPI ID (e.g., username@upi)");
      return;
    }
    if (selectedMethod === "card") {
      if (cardNumber.replace(/\s/g, "").length < 16) {
        setErrorMsg("Please enter a valid 16-digit card number");
        return;
      }
      if (!cardExpiry.includes("/")) {
        setErrorMsg("Expiry format must be MM/YY");
        return;
      }
      if (cardCvv.length < 3) {
        setErrorMsg("Please enter a valid CVV");
        return;
      }
    }

    setStep("processing");
    setTimeout(() => {
      setStep("otp");
      setTimer(30);
    }, 2000);
  };

  const handleVerifyOtp = (e: React.FormEvent) => {
    e.preventDefault();
    if (otpValue.length < 4) {
      setErrorMsg("Please enter the 4-digit OTP code");
      return;
    }

    setStep("processing");
    setTimeout(() => {
      setStep("success");
      setTimeout(() => {
        const mockPaymentId = "pay_RpK" + Math.random().toString(36).substring(2, 11).toUpperCase();
        const mockOrderId = "order_Sub" + Math.random().toString(36).substring(2, 9).toUpperCase();
        const mockSignature = "sig_sec" + Math.random().toString(36).substring(2, 15);
        
        onSuccess({
          razorpay_payment_id: mockPaymentId,
          razorpay_order_id: mockOrderId,
          razorpay_signature: mockSignature
        });
      }, 2500);
    }, 2000);
  };

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs font-sans">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col"
      >
        {/* Header (Razorpay branded) */}
        <div className="bg-slate-950 px-6 py-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 bg-blue-600 rounded-lg flex items-center justify-center font-black text-white text-base tracking-wider shadow-md shadow-blue-500/10">
              R
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-sm text-white tracking-tight">Razorpay</span>
                <span className="text-[9px] bg-blue-500/10 text-blue-400 font-mono border border-blue-500/20 px-1.5 py-0.5 rounded-full uppercase font-semibold">
                  Sandbox Secure
                </span>
              </div>
              <p className="text-[10px] text-slate-400">AncestryVault Gateway Integration</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
          >
            Cancel
          </button>
        </div>

        {/* Amount & Item Banner */}
        <div className="bg-slate-950/40 px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div>
            <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Upgrading subscription</p>
            <p className="text-xs text-white font-semibold mt-0.5">{slots} Unlimited Ancestor Slots Plan</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Amount to Pay</p>
            <p className="text-lg font-mono font-bold text-blue-400">₹{amount}.00 <span className="text-xs text-slate-500 font-normal">/mo</span></p>
          </div>
        </div>

        {/* Content Screens */}
        <div className="p-6 flex-1 min-h-[300px] flex flex-col justify-between">
          <AnimatePresence mode="wait">
            
            {/* Step 1: Select payment method */}
            {step === "method" && (
              <motion.div
                key="method"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className="space-y-4"
              >
                <div className="flex items-center gap-2 text-slate-400 text-xs mb-2">
                  <Info className="h-3.5 w-3.5 text-blue-400 shrink-0" />
                  <span>Choose your secure digital payment mode:</span>
                </div>

                <div className="space-y-2.5">
                  <button
                    onClick={() => handlePayMethodSelect("upi")}
                    className="w-full flex items-center justify-between p-4 bg-slate-800/40 hover:bg-slate-800 text-left border border-slate-800 hover:border-slate-700 rounded-2xl transition-all cursor-pointer group"
                  >
                    <div className="flex items-center gap-3.5">
                      <div className="h-10 w-10 bg-emerald-500/10 text-emerald-400 rounded-xl flex items-center justify-center">
                        <QrCode className="h-5 w-5" />
                      </div>
                      <div>
                        <span className="font-bold text-sm text-slate-200">UPI (GPay, PhonePe, Paytm)</span>
                        <p className="text-[11px] text-slate-400 mt-0.5">Pay instantly using UPI ID or scanner</p>
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-slate-500 group-hover:text-slate-300 transition-colors" />
                  </button>

                  <button
                    onClick={() => handlePayMethodSelect("card")}
                    className="w-full flex items-center justify-between p-4 bg-slate-800/40 hover:bg-slate-800 text-left border border-slate-800 hover:border-slate-700 rounded-2xl transition-all cursor-pointer group"
                  >
                    <div className="flex items-center gap-3.5">
                      <div className="h-10 w-10 bg-blue-500/10 text-blue-400 rounded-xl flex items-center justify-center">
                        <CreditCard className="h-5 w-5" />
                      </div>
                      <div>
                        <span className="font-bold text-sm text-slate-200">Debit or Credit Cards</span>
                        <p className="text-[11px] text-slate-400 mt-0.5">Visa, Mastercard, RuPay supported</p>
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-slate-500 group-hover:text-slate-300 transition-colors" />
                  </button>

                  <button
                    onClick={() => handlePayMethodSelect("netbanking")}
                    className="w-full flex items-center justify-between p-4 bg-slate-800/40 hover:bg-slate-800 text-left border border-slate-800 hover:border-slate-700 rounded-2xl transition-all cursor-pointer group"
                  >
                    <div className="flex items-center gap-3.5">
                      <div className="h-10 w-10 bg-amber-500/10 text-amber-400 rounded-xl flex items-center justify-center">
                        <Laptop className="h-5 w-5" />
                      </div>
                      <div>
                        <span className="font-bold text-sm text-slate-200">Net Banking</span>
                        <p className="text-[11px] text-slate-400 mt-0.5">Secure gateway via SBI, HDFC, ICICI, etc.</p>
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-slate-500 group-hover:text-slate-300 transition-colors" />
                  </button>

                  <button
                    onClick={() => handlePayMethodSelect("wallet")}
                    className="w-full flex items-center justify-between p-4 bg-slate-800/40 hover:bg-slate-800 text-left border border-slate-800 hover:border-slate-700 rounded-2xl transition-all cursor-pointer group"
                  >
                    <div className="flex items-center gap-3.5">
                      <div className="h-10 w-10 bg-purple-500/10 text-purple-400 rounded-xl flex items-center justify-center">
                        <Wallet className="h-5 w-5" />
                      </div>
                      <div>
                        <span className="font-bold text-sm text-slate-200">Digital Wallets</span>
                        <p className="text-[11px] text-slate-400 mt-0.5">Paytm Wallet, Amazon Pay, Mobikwik</p>
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-slate-500 group-hover:text-slate-300 transition-colors" />
                  </button>
                </div>
              </motion.div>
            )}

            {/* UPI Option */}
            {step === "upi" && (
              <motion.form
                key="upi"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                onSubmit={handleProcessPayment}
                className="space-y-4"
              >
                <button
                  type="button"
                  onClick={() => setStep("method")}
                  className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white mb-2 transition-colors cursor-pointer"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  <span>Back to methods</span>
                </button>

                <div className="space-y-3">
                  <label className="block text-xs font-bold text-slate-400">Enter UPI ID</label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      placeholder="e.g. mobileNumber@okaxis or name@ybl"
                      value={upiId}
                      onChange={(e) => setUpiId(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-850 border border-slate-800 focus:border-blue-500 text-white rounded-xl text-sm placeholder-slate-500 outline-hidden transition-all"
                    />
                    <Smartphone className="absolute right-4 top-3.5 h-4 w-4 text-slate-500" />
                  </div>
                  <p className="text-[10px] text-slate-500">
                    A payment request notification will be sent to your UPI app.
                  </p>
                </div>

                {errorMsg && (
                  <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-400">
                    {errorMsg}
                  </div>
                )}

                <button
                  type="submit"
                  className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm rounded-xl cursor-pointer shadow-md shadow-blue-500/10 transition-all text-center mt-6"
                >
                  Pay ₹{amount}.00 via UPI
                </button>
              </motion.form>
            )}

            {/* Card Option */}
            {step === "card" && (
              <motion.form
                key="card"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                onSubmit={handleProcessPayment}
                className="space-y-4"
              >
                <button
                  type="button"
                  onClick={() => setStep("method")}
                  className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white mb-2 transition-colors cursor-pointer"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  <span>Back to methods</span>
                </button>

                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 mb-1.5">Card Number</label>
                    <input
                      type="text"
                      required
                      placeholder="4111 2222 3333 4444"
                      value={cardNumber}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\s?/g, '').replace(/(\d{4})/g, '$1 ').trim();
                        setCardNumber(val.substring(0, 19));
                      }}
                      className="w-full px-4 py-2.5 bg-slate-850 border border-slate-800 focus:border-blue-500 text-white rounded-xl text-sm placeholder-slate-500 outline-hidden transition-all"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-400 mb-1.5">Expiry Date</label>
                      <input
                        type="text"
                        required
                        placeholder="MM/YY"
                        value={cardExpiry}
                        onChange={(e) => {
                          const val = e.target.value.replace(/[^\d/]/g, "");
                          if (val.length === 2 && !val.includes("/")) {
                            setCardExpiry(val + "/");
                          } else {
                            setCardExpiry(val.substring(0, 5));
                          }
                        }}
                        className="w-full px-4 py-2.5 bg-slate-850 border border-slate-800 focus:border-blue-500 text-white rounded-xl text-sm placeholder-slate-500 outline-hidden transition-all text-center"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-400 mb-1.5">CVV / CVC</label>
                      <input
                        type="password"
                        required
                        placeholder="•••"
                        value={cardCvv}
                        onChange={(e) => setCardCvv(e.target.value.replace(/\D/g, "").substring(0, 3))}
                        className="w-full px-4 py-2.5 bg-slate-850 border border-slate-800 focus:border-blue-500 text-white rounded-xl text-sm placeholder-slate-500 outline-hidden transition-all text-center"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-400 mb-1.5">Cardholder Name</label>
                    <input
                      type="text"
                      required
                      placeholder="Name printed on card"
                      value={cardName}
                      onChange={(e) => setCardName(e.target.value)}
                      className="w-full px-4 py-2.5 bg-slate-850 border border-slate-800 focus:border-blue-500 text-white rounded-xl text-sm placeholder-slate-500 outline-hidden transition-all"
                    />
                  </div>
                </div>

                {errorMsg && (
                  <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-400">
                    {errorMsg}
                  </div>
                )}

                <button
                  type="submit"
                  className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm rounded-xl cursor-pointer shadow-md shadow-blue-500/10 transition-all text-center mt-4"
                >
                  Pay ₹{amount}.00 Secured
                </button>
              </motion.form>
            )}

            {/* Net Banking */}
            {step === "netbanking" && (
              <motion.div
                key="netbanking"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="space-y-4"
              >
                <button
                  onClick={() => setStep("method")}
                  className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white mb-2 transition-colors cursor-pointer"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  <span>Back to methods</span>
                </button>

                <div className="space-y-2">
                  <label className="block text-xs font-bold text-slate-400">Select Banking Provider</label>
                  <div className="grid grid-cols-2 gap-2">
                    {["SBI", "HDFC Bank", "ICICI Bank", "Axis Bank", "Kotak Mahindra", "Punjab National"].map((bank) => (
                      <button
                        key={bank}
                        onClick={() => {
                          setStep("processing");
                          setTimeout(() => {
                            setStep("otp");
                            setTimer(30);
                          }, 1500);
                        }}
                        className="p-3 bg-slate-850 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 rounded-xl text-xs text-slate-200 transition-colors text-left font-semibold cursor-pointer"
                      >
                        {bank}
                      </button>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {/* Wallets */}
            {step === "wallet" && (
              <motion.div
                key="wallet"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="space-y-4"
              >
                <button
                  onClick={() => setStep("method")}
                  className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white mb-2 transition-colors cursor-pointer"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  <span>Back to methods</span>
                </button>

                <div className="space-y-2">
                  <label className="block text-xs font-bold text-slate-400">Select Digital Wallet</label>
                  <div className="space-y-2">
                    {["Paytm Wallet", "Amazon Pay Balance", "Mobikwik Wallet", "PhonePe Wallet"].map((walletName) => (
                      <button
                        key={walletName}
                        onClick={() => {
                          setStep("processing");
                          setTimeout(() => {
                            setStep("otp");
                            setTimer(30);
                          }, 1500);
                        }}
                        className="w-full p-4.5 bg-slate-850 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 rounded-2xl text-xs text-slate-200 transition-colors text-left font-bold cursor-pointer flex justify-between items-center"
                      >
                        <span>{walletName}</span>
                        <ChevronRight className="h-3.5 w-3.5 text-slate-500" />
                      </button>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {/* Processing State */}
            {step === "processing" && (
              <motion.div
                key="processing"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="flex flex-col items-center justify-center space-y-4 py-8"
              >
                <Loader2 className="h-10 w-10 text-blue-500 animate-spin" />
                <div className="text-center">
                  <h4 className="font-bold text-slate-200 text-sm">Processing Payment Securely</h4>
                  <p className="text-[11px] text-slate-400 mt-1">Please do not refresh this page or close the browser window.</p>
                </div>
              </motion.div>
            )}

            {/* OTP Screen */}
            {step === "otp" && (
              <motion.form
                key="otp"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                onSubmit={handleVerifyOtp}
                className="space-y-4 py-2"
              >
                <div className="text-center mb-4">
                  <div className="h-12 w-12 bg-blue-500/10 text-blue-400 rounded-full flex items-center justify-center mx-auto mb-3">
                    <ShieldCheck className="h-6 w-6" />
                  </div>
                  <h4 className="font-bold text-slate-200 text-sm">Secure 3D-Payment Verification</h4>
                  <p className="text-[11px] text-slate-400 mt-1">
                    An OTP has been sent to the mobile number/email linked with your credentials.
                  </p>
                </div>

                <div className="space-y-2 max-w-xs mx-auto">
                  <label className="block text-xs font-bold text-center text-slate-400 uppercase tracking-wider">Enter 4-Digit Verification Code</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 1234"
                    value={otpValue}
                    onChange={(e) => setOtpValue(e.target.value.replace(/\D/g, "").substring(0, 4))}
                    className="w-full text-center tracking-[1em] font-mono text-xl px-4 py-3 bg-slate-850 border border-slate-800 focus:border-blue-500 text-white rounded-xl placeholder-slate-500 outline-hidden transition-all"
                  />
                </div>

                {errorMsg && (
                  <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-400 text-center">
                    {errorMsg}
                  </div>
                )}

                <button
                  type="submit"
                  className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm rounded-xl cursor-pointer shadow-md shadow-emerald-500/10 transition-all text-center mt-4"
                >
                  Verify & Pay ₹{amount}.00
                </button>

                <div className="text-center mt-3">
                  {timer > 0 ? (
                    <p className="text-[10px] text-slate-500 font-semibold">Resend code in {timer}s</p>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setTimer(30)}
                      className="text-[10px] text-blue-400 hover:text-blue-300 font-bold underline cursor-pointer"
                    >
                      Resend Verification Code
                    </button>
                  )}
                </div>
              </motion.form>
            )}

            {/* Success Animation Screen */}
            {step === "success" && (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center justify-center space-y-4 py-12"
              >
                <div className="relative">
                  <motion.div 
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: [1, 1.2, 1], opacity: 1 }}
                    transition={{ duration: 0.6 }}
                    className="h-16 w-16 bg-emerald-500 text-white rounded-full flex items-center justify-center shadow-lg shadow-emerald-500/25"
                  >
                    <Check className="h-8 w-8 stroke-[3]" />
                  </motion.div>
                </div>
                <div className="text-center">
                  <h3 className="font-black text-slate-100 text-lg">Payment Processed Successfully!</h3>
                  <p className="text-xs text-emerald-400 mt-1.5 font-semibold">Your family tree is now upgraded to unlimited slots</p>
                  <p className="text-[11px] text-slate-400 mt-3 font-mono">Syncing billing ledger records to SQL backend...</p>
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="bg-slate-950 px-6 py-4 border-t border-slate-800 flex justify-between items-center text-[10px] text-slate-500">
          <div className="flex items-center gap-1">
            <ShieldCheck className="h-3.5 w-3.5 text-blue-500" />
            <span>Secure 256-bit SSL encrypted connection</span>
          </div>
          <span>Powered by Razorpay</span>
        </div>
      </motion.div>
    </div>
  );
}
