import React, { useState, useEffect } from 'react';
import { User, CreditCard, Check, X, Zap, Settings as SettingsIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import { auth, db, doc, onSnapshot } from '../firebase';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { PLANS, TRY_PACK } from '../lib/constants';

export default function Settings() {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('yearly');
  const [user, setUser] = useState({
    name: localStorage.getItem('userName') || 'User',
    email: auth.currentUser?.email || '',
    plan: 'Free',
    credits: 0,
    maxCredits: 10
  });

  useEffect(() => {
    if (!auth.currentUser) return;

    const fetchProfile = async () => {
      try {
        const token = await auth.currentUser?.getIdToken();
        const response = await fetch('/api/user/profile', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.ok) {
          const data = await response.json();
          setUser(prev => ({
            ...prev,
            name: data.displayName || prev.name,
            email: data.email || prev.email,
            plan: data.planName,
            credits: data.credits,
            maxCredits: data.maxCredits
          }));
        }
      } catch (err) {
        console.error("[Settings] Profile fetch failed:", err);
      }
    };

    fetchProfile();
    const interval = setInterval(fetchProfile, 15000); // 15s poll
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="w-full space-y-8 sm:space-y-12 pb-24 h-full flex flex-col">
      <header className="section-header">
        <h1 className="section-title italic">Settings</h1>
        <p className="section-subtitle">Manage your account, plan, and view your creative history.</p>
      </header>

      {/* Profile Section */}
      <section className="space-y-6">
        <div className="flex items-center gap-3">
          <User className="w-5 h-5 text-white" />
          <h2 className="text-xl font-serif italic">Profile</h2>
        </div>
        <div className="glass-panel p-8 space-y-6">
          <div className="flex items-center gap-6">
            <div className="w-20 h-20 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-2xl font-serif italic">
              {user.name.charAt(0)}
            </div>
            <div>
              <h3 className="text-xl font-bold">{user.name}</h3>
              <p className="text-neutral-500 text-sm">{user.email}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-white/5">
            <div className="space-y-1.5">
              <label className="label-caps">Display Name</label>
              <input 
                type="text" 
                value={user.name}
                readOnly
                className="input-field bg-white/5 text-neutral-500 cursor-not-allowed border-white/5"
              />
            </div>
            <div className="space-y-1.5">
              <label className="label-caps">Email Address</label>
              <input 
                type="email" 
                value={user.email}
                readOnly
                className="input-field bg-white/5 text-neutral-500 cursor-not-allowed border-white/5"
              />
            </div>
          </div>

          {auth.currentUser?.email === 'kyashwanth1133@gmail.com' && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4">
              <Link 
                to="/admin/templates"
                className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-white/40 hover:text-white transition-colors group"
              >
                <SettingsIcon className="w-3 h-3 group-hover:rotate-90 transition-transform" />
                Manage Video Templates
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="space-y-12">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
          <div className="section-header">
            <h2 className="section-title">Upgrade Plan</h2>
            <p className="section-subtitle">Choose the plan that fits your creative scale.</p>
          </div>

          {/* Billing Toggle */}
          <div className="flex items-center gap-4 bg-white/5 p-1.5 rounded-2xl border border-white/10 w-fit">
            <button 
              onClick={() => setBillingCycle('monthly')}
              className={cn(
                "px-6 py-2.5 rounded-xl text-xs font-bold transition-all",
                billingCycle === 'monthly' ? "bg-white text-black shadow-lg" : "text-neutral-400 hover:text-white"
              )}
            >
              Monthly
            </button>
            <button 
              onClick={() => setBillingCycle('yearly')}
              className={cn(
                "px-6 py-2.5 rounded-xl text-xs font-bold transition-all relative",
                billingCycle === 'yearly' ? "bg-white text-black shadow-lg" : "text-neutral-400 hover:text-white"
              )}
            >
              Annual
              <span className="absolute -top-4 -right-1 px-2 py-0.5 bg-white text-black text-[8px] rounded-full font-black border border-black/10 shadow-xl animate-pulse">
                SAVE 10%
              </span>
            </button>
          </div>
        </div>

        {/* Try Pack - One Time Offer */}
        {user.plan === 'Free' && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-panel border-white/10 p-1 bg-gradient-to-r from-white/[0.03] to-transparent overflow-hidden relative group"
          >
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <Zap className="w-24 h-24 text-white" />
            </div>
            
            <div className="flex flex-col md:flex-row items-center justify-between p-8 gap-8 relative z-10">
              <div className="space-y-2 text-center md:text-left">
                <div className="badge-pill w-fit mx-auto md:mx-0 border-white/20 text-white">One-Time Offer</div>
                <h3 className="text-3xl font-serif">Discovery Pack</h3>
                <p className="text-neutral-500 text-sm max-w-md">Try everything with 40 high-res credits. No commitment, perfect for your first creation.</p>
              </div>

              <div className="flex flex-col md:flex-row items-center gap-8">
                <div className="flex items-baseline gap-2">
                  <span className="text-5xl font-serif italic text-white">$5</span>
                  <span className="text-neutral-500 text-sm">/once</span>
                </div>
                
                <button className="bg-white text-black px-10 py-4 rounded-2xl text-[10px] font-bold uppercase tracking-[0.2em] hover:scale-[1.02] transition-all whitespace-nowrap">
                  Get 40 Credits
                </button>
              </div>
            </div>
          </motion.div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {PLANS.map((plan) => {
            const currentPrice = billingCycle === 'yearly' ? plan.yearlyPrice : plan.monthlyPrice;
            const isActive = plan.name === user.plan;
            
            return (
              <motion.div 
                key={plan.id}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn(
                  "p-8 flex flex-col gap-8 relative transition-all duration-500 rounded-3xl",
                  plan.popular 
                    ? "bg-white text-black shadow-[0_0_50px_-12px_rgba(255,255,255,0.15)] scale-[1.02] z-10" 
                    : "glass-panel group border-white/5",
                  isActive && !plan.popular && "border-white/20"
                )}
              >
                {plan.popular && (
                  <div className="absolute top-0 right-0 bg-black text-white text-[9px] font-black uppercase tracking-tighter px-4 py-1.5 rounded-bl-2xl">
                    Most Popular
                  </div>
                )}
                
                <div className="space-y-4">
                  <div>
                    <h3 className={cn(
                      "text-xl font-bold uppercase tracking-widest",
                      plan.popular ? "text-black" : "text-white group-hover:text-white/80 transition-colors"
                    )}>{plan.name}</h3>
                    <p className={cn(
                      "text-xs mt-1 font-light",
                      plan.popular ? "text-neutral-500" : "text-neutral-500"
                    )}>{plan.description}</p>
                  </div>
                  
                  <div className="flex flex-col">
                    <div className="flex items-baseline gap-1.5">
                      {billingCycle === 'yearly' && plan.monthlyPrice !== plan.yearlyPrice && (
                        <span className={cn(
                          "text-xl line-through font-serif italic mr-1",
                          plan.popular ? "text-neutral-300" : "text-neutral-600 decoration-white/20"
                        )}>
                          ${plan.monthlyPrice}
                        </span>
                      )}
                      <span className={cn(
                        "text-5xl font-serif italic tracking-tight",
                        plan.popular ? "text-black" : "text-white"
                      )}>${currentPrice}</span>
                      <span className={cn(
                        "text-xs",
                        plan.popular ? "text-neutral-500" : "text-neutral-500"
                      )}>/month</span>
                    </div>
                    {billingCycle === 'yearly' && (
                      <p className={cn(
                        "text-[10px] font-medium mt-1",
                        plan.popular ? "text-neutral-400" : "text-neutral-400"
                      )}>Billed annually (${plan.totalYearlyPrice}/year)</p>
                    )}
                  </div>
                </div>

                <div className="space-y-6 flex-1">
                  <div className={cn(
                    "py-2.5 px-4 rounded-xl border flex items-center justify-between",
                    plan.popular ? "bg-black/5 border-black/5" : "bg-white/5 border-white/5"
                  )}>
                    <span className={cn(
                      "text-[9px] uppercase tracking-widest font-bold",
                      plan.popular ? "text-neutral-500" : "text-neutral-500"
                    )}>Credits</span>
                    <span className={cn(
                      "text-xs font-bold",
                      plan.popular ? "text-black" : "text-white"
                    )}>{plan.credits}</span>
                  </div>

                  <ul className="space-y-4">
                    {plan.features.map((feature, i) => (
                      <li key={i} className={cn(
                        "flex items-start gap-3 text-[11px]",
                        feature.included 
                          ? (plan.popular ? "text-neutral-700" : "text-neutral-300")
                          : "text-neutral-500 line-through decoration-black/10"
                      )}>
                        {feature.included ? (
                          <Check className={cn(
                            "w-3.5 h-3.5 mt-0.5 shrink-0",
                            plan.popular ? "text-black" : "text-white"
                          )} />
                        ) : (
                          <X className="w-3.5 h-3.5 text-neutral-400 mt-0.5 shrink-0" />
                        )}
                        <span>{feature.text}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <button 
                  className={cn(
                    "w-full py-4 rounded-2xl text-[10px] font-bold uppercase tracking-[0.2em] transition-all",
                    isActive 
                      ? (plan.popular ? "bg-black text-white" : "bg-white/10 text-white cursor-default")
                      : (plan.popular ? "bg-black text-white hover:scale-[1.02] shadow-xl" : "bg-white text-black hover:scale-[1.02]")
                  )}
                >
                  {isActive ? "Current Plan" : "Upgrade Plan"}
                </button>
              </motion.div>
            );
          })}
        </div>
      </section>

    </div>
  );
}
