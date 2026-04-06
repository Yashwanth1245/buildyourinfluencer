import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Check, Zap, Sparkles, ChevronRight } from 'lucide-react';
import { cn } from '../../lib/utils';
import { PLANS, TRY_PACK } from '../../lib/constants';
import { loadRazorpayScript } from '../../lib/razorpay';
import { auth } from '../../firebase';

interface CreditModalProps {
  isOpen: boolean;
  onClose: () => void;
  userCredits: number;
  requiredCredits?: number;
}

export default function CreditModal({ isOpen, onClose, userCredits, requiredCredits }: CreditModalProps) {
  const [billingCycle, setBillingCycle] = React.useState<'monthly' | 'yearly'>('yearly');
  const [loadingPlan, setLoadingPlan] = React.useState<string | null>(null);

  const handlePurchase = async (planId: string) => {
    setLoadingPlan(planId);
    try {
      const res = await loadRazorpayScript();
      if (!res) {
        alert('Razorpay SDK failed to load. Are you online?');
        return;
      }

      const idToken = await auth.currentUser?.getIdToken();
      if (!idToken) {
        alert('Please sign in to purchase credits.');
        return;
      }

      // 1. Create Order on Backend
      const orderRes = await fetch('/api/payments/create-order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({ planId, billingCycle })
      });

      if (!orderRes.ok) throw new Error('Failed to create payment order');
      const orderData = await orderRes.json();

      // 2. Open Razorpay Checkout
      const options = {
        key: 'rzp_test_SaBtdiCU02Wb6u', // Test Key
        amount: orderData.amount,
        currency: orderData.currency,
        name: "BuildYourInfluencer",
        description: `Refill: ${planId} (${billingCycle})`,
        order_id: orderData.id,
        handler: async (response: any) => {
          // 3. Verify Payment on Backend
          try {
            const verifyRes = await fetch('/api/payments/verify', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${idToken}`
              },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                planId
              })
            });

            if (verifyRes.ok) {
              alert('Payment successful! Your credits have been updated.');
              onClose();
              window.location.reload(); // Refresh to sync balance
            } else {
              alert('Payment verification failed. Please contact support.');
            }
          } catch (err) {
            console.error('Verification Error:', err);
            alert('An error occurred during verification.');
          }
        },
        prefill: {
          name: auth.currentUser?.displayName || '',
          email: auth.currentUser?.email || '',
        },
        theme: {
          color: "#000000"
        }
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.open();

    } catch (error) {
      console.error('Purchase Error:', error);
      alert('Failed to initiate purchase. Please try again.');
    } finally {
      setLoadingPlan(null);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/95 backdrop-blur-sm"
          />

          {/* Modal Content */}
          <motion.div
            initial={{ opacity: 0, scale: 0.98, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: 10 }}
            className="relative w-full max-w-4xl flex flex-col border border-white/5 bg-black rounded-[2rem] overflow-hidden shadow-2xl"
            style={{ maxHeight: 'calc(100vh - 40px)' }}
          >
            {/* Minimal Header */}
            <div className="absolute top-4 right-4 z-30">
              <button
                onClick={onClose}
                className="w-8 h-8 bg-white/5 hover:bg-white/10 rounded-full flex items-center justify-center transition-all group border border-white/5"
              >
                <X className="w-4 h-4 text-neutral-500 group-hover:text-white" />
              </button>
            </div>

            <div className="flex-1 overflow-hidden p-6 md:p-8 space-y-6">
              {/* Ultra-Minimal Hero */}
              <div className="text-center space-y-2">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/5 border border-white/10 text-white text-[8px] font-black uppercase tracking-[0.25em] mb-1">
                  Studio Credits
                </div>
                <h2 className="text-3xl md:text-4xl font-serif italic text-white tracking-tight leading-none">
                  Elite Production Access
                </h2>
                <div className="flex items-center justify-center gap-4 text-[9px] font-bold uppercase tracking-[0.25em] text-neutral-500 pt-1">
                   <div className="flex items-center gap-1.5">
                    <span>Balance:</span>
                    <span className="text-white">{userCredits}</span>
                  </div>
                  {requiredCredits && (
                    <div className="flex items-center gap-1.5">
                      <div className="w-1 h-1 rounded-full bg-white/20" />
                      <span>Deficit:</span>
                      <span className="text-white">-{requiredCredits - userCredits}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Billing Toggle - Minimal Mono Style */}
              <div className="flex justify-center">
                <div className="flex items-center gap-1 p-0.5 bg-white/5 rounded-xl border border-white/5">
                  {(['monthly', 'yearly'] as const).map((cycle) => (
                    <button 
                      key={cycle}
                      onClick={() => setBillingCycle(cycle)}
                      className={cn(
                        "px-6 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all",
                        billingCycle === cycle ? "bg-white text-black shadow-lg" : "text-neutral-500 hover:text-white"
                      )}
                    >
                      {cycle === 'yearly' ? (
                        <span className="relative px-2">
                          Annual
                          <span className="absolute -top-3.5 -right-3 px-1 py-0.5 bg-white text-black text-[6px] rounded-full font-black border border-black/5 shadow-xl">
                            -10%
                          </span>
                        </span>
                      ) : 'Monthly'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Grid of Plans - Monochrome Layout */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-4xl mx-auto">
                {PLANS.map((plan) => {
                  const price = billingCycle === 'yearly' ? plan.yearlyPrice : plan.monthlyPrice;
                  const isPopular = plan.popular;

                  return (
                    <div 
                      key={plan.id}
                      className={cn(
                        "group p-5 rounded-2xl flex flex-col gap-4 relative transition-all duration-500",
                        isPopular ? "bg-white/[0.03] border-white/20 shadow-[0_0_40px_rgba(255,255,255,0.03)]" : "bg-white/[0.01] border-white/5"
                      )}
                    >
                      {isPopular && (
                        <div className="absolute top-0 right-0 bg-white text-black text-[7px] font-black uppercase tracking-widest px-3 py-1 rounded-bl-lg">
                          Editor's Choice
                        </div>
                      )}
                      
                      <div className="space-y-2">
                        <h5 className={cn(
                          "text-[9px] font-black uppercase tracking-[0.2em]",
                          isPopular ? "text-white" : "text-neutral-500"
                        )}>{plan.name}</h5>
                        
                        <div className="flex items-baseline gap-1">
                          {billingCycle === 'yearly' && plan.monthlyPrice !== plan.yearlyPrice && (
                            <span className="text-xl line-through font-serif italic mr-1 text-neutral-600 decoration-white/20">
                              ${plan.monthlyPrice}
                            </span>
                          )}
                          <span className="text-2xl font-serif italic text-white">${price}</span>
                          <span className="text-[8px] font-bold text-neutral-500 uppercase tracking-widest">/mo</span>
                        </div>
                        {billingCycle === 'yearly' && (
                          <div className="text-[7px] text-neutral-500 font-bold uppercase tracking-[0.1em] mt-0.5">
                            Billed annually (${plan.totalYearlyPrice}/yr)
                          </div>
                        )}
                        
                        <p className="text-[10px] text-neutral-500 leading-tight italic line-clamp-2">{plan.description}</p>
                      </div>

                      <div className="w-full h-px bg-white/5" />

                      <div className="space-y-3 flex-1">
                        <div className="flex items-center justify-between text-[10px] font-bold text-white">
                          <span className="uppercase text-[8px] tracking-widest text-neutral-600 font-black">Refills</span>
                          <span>{plan.credits} ✧</span>
                        </div>

                        <ul className="space-y-2">
                          {plan.features.slice(0, 3).map((feature, i) => (
                            <li key={i} className="flex items-center gap-2">
                              <Check className={cn("w-2.5 h-2.5", isPopular ? "text-white" : "text-neutral-600")} />
                              <span className="text-[9px] text-neutral-400 font-medium">{feature.text}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <button 
                        onClick={() => handlePurchase(plan.id)}
                        disabled={loadingPlan !== null}
                        className={cn(
                          "w-full py-2.5 rounded-lg text-[8px] font-black uppercase tracking-[0.15em] transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed",
                          isPopular 
                            ? "bg-white text-black hover:bg-neutral-200" 
                            : "bg-white/5 text-white hover:bg-white/10 border border-white/10"
                        )}
                      >
                        {loadingPlan === plan.id ? 'Processing...' : 'Select Suite'}
                        {loadingPlan !== plan.id && <ChevronRight className="w-3 h-3" />}
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* One-time Try Pack */}
              <div className="max-w-4xl mx-auto w-full">
                <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 flex flex-col md:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center border border-white/10">
                      <Zap className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h4 className="text-[10px] font-black uppercase tracking-widest text-white">{TRY_PACK.name}</h4>
                      <p className="text-[9px] text-neutral-500 italic mt-0.5">{TRY_PACK.description}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <div className="text-xl font-serif italic text-white">${TRY_PACK.price}</div>
                      <div className="text-[7px] font-bold text-neutral-500 uppercase tracking-widest">One-time</div>
                    </div>
                    <button 
                      onClick={() => handlePurchase(TRY_PACK.id)}
                      disabled={loadingPlan !== null}
                      className="px-8 py-2.5 bg-white text-black rounded-lg text-[8px] font-black uppercase tracking-widest hover:bg-neutral-200 transition-all disabled:opacity-50"
                    >
                      {loadingPlan === TRY_PACK.id ? 'Processing...' : 'Get 40 Credits'}
                    </button>
                  </div>
                </div>
              </div>
            </div>

          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
