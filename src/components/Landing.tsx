import React, { useState } from 'react';
import { Sparkles, ArrowRight, Shield, Globe, LayoutGrid, Zap, Check, X } from 'lucide-react';
import { auth, googleProvider, signInWithPopup } from '../firebase';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

const PLANS = [
  {
    id: 'starter',
    name: 'Starter',
    monthlyPrice: 19,
    yearlyPrice: 19,
    totalYearlyPrice: 228,
    credits: 170,
    description: 'Perfect for individual creators',
    popular: false,
    features: [
      { text: '170 High-Res Credits', included: true },
      { text: 'Kling v2.6 Standard Motion', included: true },
      { text: 'Base Image Selection', included: true },
      { text: 'Direct System Downloads', included: true },
      { text: 'No Watermark', included: true },
      { text: 'Social Media Optimized (9:16)', included: true },
    ]
  },
  {
    id: 'professional',
    name: 'Pro ⭐',
    monthlyPrice: 39,
    yearlyPrice: 35,
    totalYearlyPrice: 421,
    credits: 400,
    description: 'Most popular for serious influencers',
    popular: true,
    features: [
      { text: '400 High-Res Credits', included: true },
      { text: 'Pro Motion Synthesis', included: true },
      { text: 'Audio Toggle Control', included: true },
      { text: 'Base Image Control', included: true },
      { text: 'Direct System Downloads', included: true },
      { text: 'Social Media Optimized (9:16)', included: true },
    ]
  },
  {
    id: 'business',
    name: 'Creator',
    monthlyPrice: 79,
    yearlyPrice: 71,
    totalYearlyPrice: 853,
    credits: 800,
    description: 'Ultimate studio-grade toolkit',
    popular: false,
    features: [
      { text: '800 High-Res Credits', included: true },
      { text: 'Custom Reference Support', included: true },
      { text: 'All Motion Templates', included: true },
      { text: 'Dedicated History Tracking', included: true },
      { text: 'Direct System Downloads', included: true },
      { text: 'Social Media Optimized (9:16)', included: true },
    ]
  }
];

function NewsletterSignup() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setStatus('loading');
    try {
      const response = await fetch('/api/newsletter/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      
      const contentType = response.headers.get('content-type');
      let data;
      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        const text = await response.text();
        throw new Error(text || `Server responded with ${response.status}`);
      }
      
      if (!response.ok) throw new Error(data.error || 'Failed to join');
      
      setStatus('success');
      setMessage(data.message);
      setEmail('');
    } catch (err: any) {
      console.error('[Newsletter Signup Error]', err);
      setStatus('error');
      setMessage(err.message || 'Something went wrong. Please try again.');
    }
  };

  if (status === 'success') {
    return (
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-green-500/10 border border-green-500/20 rounded-xl p-4 flex items-center gap-3"
      >
        <span className="text-green-500 text-xs font-bold">{message}</span>
      </motion.div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="flex gap-2">
        <input 
          type="email" 
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email Address" 
          className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-white/20 flex-1" 
          disabled={status === 'loading'}
          required
        />
        <button 
          type="submit"
          disabled={status === 'loading'}
          className={cn(
            "bg-white text-black px-6 py-3 rounded-xl text-xs font-bold uppercase tracking-widest hover:scale-105 transition-all flex items-center gap-2",
            status === 'loading' && "opacity-50"
          )}
        >
          {status === 'loading' ? 'Joining...' : 'Join'}
        </button>
      </div>
      {status === 'error' && (
        <p className="text-red-500 text-[10px] font-bold uppercase tracking-widest ml-1">{message}</p>
      )}
    </form>
  );
}

export default function Landing() {
  const navigate = useNavigate();
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('yearly');
  const [legalModal, setLegalModal] = useState<'privacy' | 'terms' | 'cookies' | 'gdpr' | 'refund' | null>(null);

  return (
    <div className="min-h-screen bg-[#000000] text-white selection:bg-white selection:text-black">
      {/* Nav */}
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 flex items-center justify-between border-b border-white/5">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="w-6 h-6 sm:w-8 sm:h-8 bg-white rounded-md flex items-center justify-center">
            <div className="w-3 h-3 sm:w-4 sm:h-4 bg-black rotate-45" />
          </div>
          <span className="text-lg sm:text-xl font-bold tracking-tight">Persona AI</span>
        </div>
        
        <div className="hidden lg:flex items-center gap-8">
          <a href="#features" className="nav-link nav-link-inactive">Features</a>
          <a href="#showcase" className="nav-link nav-link-inactive">Showcase</a>
          <a href="#pricing" className="nav-link nav-link-inactive">Pricing</a>
        </div>

        <div className="flex items-center gap-4 sm:gap-6">
          <Link
            to="/login"
            className="nav-link nav-link-inactive text-xs sm:text-sm"
          >
            Login
          </Link>
          <Link
            to="/signup"
            className="btn-primary px-4 sm:px-6 py-2 sm:py-2.5 text-xs sm:text-sm"
          >
            Get Started
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 pt-20 sm:pt-32 pb-24 sm:pb-40 text-center space-y-8 sm:space-y-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6 sm:space-y-8"
        >
          <div className="badge-pill inline-flex items-center gap-2 text-[10px] sm:text-xs">
            <Sparkles className="w-3 h-3" />
            The Future of Digital Presence
          </div>
          
          <h1 className="section-title text-4xl sm:text-7xl md:text-8xl lg:text-[120px] leading-[1.1] sm:leading-none mx-auto">
            Create Your <br />
            <span className="italic">Digital Persona</span>
          </h1>
          
          <p className="section-subtitle mx-auto text-sm sm:text-base lg:text-lg max-w-2xl">
            Generate hyper-realistic AI influencers with consistent identities. Scale your content production without the need for human models.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4"
        >
          <Link
            to="/signup"
            className="btn-primary w-full sm:w-auto px-10 py-4 text-lg"
          >
            <ArrowRight className="w-5 h-5" />
            Start Creating
          </Link>
          <Link 
            to="/login"
            className="btn-secondary w-full sm:w-auto px-10 py-4 text-lg"
          >
            View Showcase
          </Link>
        </motion.div>
      </section>

      {/* Showcase */}
      <section id="showcase" className="max-w-7xl mx-auto px-6 py-32 border-t border-white/5">
        <div className="space-y-16">
          <div className="text-center space-y-4">
            <h2 className="section-title text-5xl">The Studio Output</h2>
            <p className="section-subtitle mx-auto">Hyper-realistic results across diverse niches and styles.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[1, 2, 3].map((i) => (
              <div key={i} className="glass-card aspect-[4/5] grayscale hover:grayscale-0 transition-all duration-700">
                <img 
                  src={`https://picsum.photos/seed/persona${i}/800/1000`} 
                  alt="Showcase" 
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="max-w-7xl mx-auto px-6 py-32 border-t border-white/5">
        <div className="text-center space-y-16">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 max-w-5xl mx-auto">
            <div className="text-left space-y-4">
              <h2 className="section-title text-5xl">Simple Pricing</h2>
              <p className="section-subtitle">Choose the plan that fits your creative scale.</p>
            </div>

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

          {/* Discovery Pack - One Time Offer */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="glass-panel border-white/10 p-1 bg-gradient-to-r from-white/[0.03] to-transparent overflow-hidden relative group max-w-5xl mx-auto shadow-2xl"
          >
            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
              <Zap className="w-32 h-32 text-white" />
            </div>
            
            <div className="flex flex-col md:flex-row items-center justify-between p-10 gap-8 relative z-10">
              <div className="space-y-3 text-center md:text-left">
                <div className="badge-pill w-fit mx-auto md:mx-0 border-white/20 text-white bg-white/5">Limited Time Offer</div>
                <h3 className="text-4xl font-serif">Discovery Pack</h3>
                <p className="text-neutral-500 text-base max-w-md">Try everything once with 40 high-res credits. No commitment, no recurring billing. Perfect for your first masterpiece.</p>
              </div>

              <div className="flex flex-col md:flex-row items-center gap-10">
                <div className="flex flex-col items-center md:items-end">
                  <div className="flex items-baseline gap-2">
                    <span className="text-6xl font-serif italic text-white">$5</span>
                    <span className="text-neutral-500 text-sm">/one-time</span>
                  </div>
                  <p className="text-[10px] text-neutral-600 font-bold uppercase tracking-widest mt-1">40 Credits Included</p>
                </div>
                
                <Link to="/signup" className="bg-white text-black px-12 py-5 rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] hover:scale-[1.05] transition-all whitespace-nowrap shadow-[0_20px_40px_-15px_rgba(255,255,255,0.3)]">
                  Start Your Trial
                </Link>
              </div>
            </div>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {PLANS.map((plan) => {
              const currentPrice = billingCycle === 'yearly' ? plan.yearlyPrice : plan.monthlyPrice;
              
              return (
                <motion.div 
                  key={plan.id}
                  layout
                  className={cn(
                    "p-10 flex flex-col gap-10 relative transition-all duration-500 text-left group rounded-3xl",
                    plan.popular 
                      ? "bg-white text-black shadow-[0_0_50px_-12px_rgba(255,255,255,0.15)] scale-[1.05] z-10" 
                      : "glass-panel border-white/5 hover:border-white/10"
                  )}
                >
                  {plan.popular && (
                    <div className="absolute top-0 right-0 bg-black text-white text-[9px] font-black uppercase tracking-tighter px-5 py-2 rounded-bl-2xl">
                      Most Popular
                    </div>
                  )}
                  
                  <div className="space-y-6">
                    <div>
                      <h3 className={cn(
                        "text-2xl font-bold uppercase tracking-widest",
                        plan.popular ? "text-black" : "text-white"
                      )}>{plan.name}</h3>
                      <p className={cn(
                        "text-xs mt-2 font-light",
                        plan.popular ? "text-neutral-500" : "text-neutral-500"
                      )}>{plan.description}</p>
                    </div>
                    
                    <div className="flex flex-col">
                      <div className="flex items-baseline gap-2">
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
                          "text-sm",
                          plan.popular ? "text-neutral-500" : "text-neutral-500"
                        )}>/mo</span>
                      </div>
                      {billingCycle === 'yearly' && (
                        <p className={cn(
                          "text-[10px] font-medium mt-2 uppercase tracking-wide",
                          plan.popular ? "text-neutral-400" : "text-neutral-400"
                        )}>Billed annually (${plan.totalYearlyPrice}/yr)</p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-8 flex-1">
                    <div className={cn(
                      "py-3 px-4 rounded-xl border flex items-center justify-between",
                      plan.popular ? "bg-black/5 border-black/5" : "bg-white/5 border-white/5"
                    )}>
                      <span className={cn(
                        "text-[10px] uppercase tracking-widest font-bold",
                        plan.popular ? "text-neutral-500" : "text-neutral-500"
                      )}>Credits</span>
                      <span className={cn(
                        "text-sm font-bold",
                        plan.popular ? "text-black" : "text-white"
                      )}>{plan.credits}</span>
                    </div>

                    <ul className="space-y-5">
                      {plan.features.map((feature, i) => (
                        <li key={i} className={cn(
                          "flex items-start gap-4 text-xs",
                          feature.included 
                            ? (plan.popular ? "text-neutral-700" : "text-neutral-300")
                            : "text-neutral-500 line-through decoration-black/10"
                        )}>
                          {feature.included ? (
                            <Check className={cn(
                              "w-4 h-4 mt-0.5 shrink-0",
                              plan.popular ? "text-black" : "text-white"
                            )} />
                          ) : (
                            <X className="w-4 h-4 text-neutral-600 mt-0.5 shrink-0" />
                          )}
                          <span>{feature.text}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <Link 
                    to="/signup"
                    className={cn(
                      "w-full py-4 rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] transition-all text-center",
                      plan.popular 
                        ? "bg-black text-white hover:scale-[1.02] shadow-xl" 
                        : "bg-white text-black hover:scale-[1.02]"
                    )}
                  >
                    Start Creating
                  </Link>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="max-w-7xl mx-auto px-6 py-32 border-t border-white/5">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-16">
          {[
            { icon: LayoutGrid, title: "Identity Control", desc: "Maintain complete consistency across every post with our proprietary identity mapping." },
            { icon: Zap, title: "Instant Generation", desc: "From concept to high-fidelity content in seconds. No studios, no photographers, no limits." },
            { icon: Shield, title: "Full Ownership", desc: "You own 100% of the IP. Your personas are your assets, ready to be deployed globally." },
          ].map((feature, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="space-y-6"
            >
              <div className="w-10 h-10 border border-white/10 rounded-lg flex items-center justify-center">
                <feature.icon className="w-5 h-5 text-white" />
              </div>
              <h3 className="text-2xl font-serif">{feature.title}</h3>
              <p className="text-neutral-500 leading-relaxed font-light">{feature.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Professional Footer */}
      <footer className="max-w-7xl mx-auto px-6 pt-32 pb-20 border-t border-white/5">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-12 mb-20">
          <div className="col-span-2 space-y-8">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-white rounded flex items-center justify-center">
                <div className="w-4 h-4 bg-black rotate-45" />
              </div>
              <span className="text-white text-xl font-bold tracking-tight uppercase">Persona AI</span>
            </div>
            <p className="text-neutral-500 text-sm max-w-xs leading-relaxed font-light">
              The world's leading generative studio for consistent AI personas. Empowering creators and brands to scale their digital presence with surgical precision.
            </p>
          </div>

          <div className="space-y-6">
            <h4 className="text-xs font-black uppercase tracking-[0.2em] text-white/40">Studio</h4>
            <ul className="space-y-4 text-sm font-light">
              <li><Link to="/signup" className="text-neutral-500 hover:text-white transition-colors">Start Creating</Link></li>
              <li><a href="#showcase" className="text-neutral-500 hover:text-white transition-colors">Showcase</a></li>
              <li><a href="#features" className="text-neutral-500 hover:text-white transition-colors">Technology</a></li>
              <li><a href="#pricing" className="text-neutral-500 hover:text-white transition-colors">Pricing</a></li>
            </ul>
          </div>

          <div className="space-y-6">
            <h4 className="text-xs font-black uppercase tracking-[0.2em] text-white/40">Legal</h4>
            <ul className="space-y-4 text-sm font-light">
              <li><button onClick={() => setLegalModal('terms')} className="text-neutral-500 hover:text-white transition-colors text-left">Terms of Service</button></li>
              <li><button onClick={() => setLegalModal('privacy')} className="text-neutral-500 hover:text-white transition-colors text-left">Privacy Policy</button></li>
              <li><button onClick={() => setLegalModal('cookies')} className="text-neutral-500 hover:text-white transition-colors text-left">Cookies Policy</button></li>
              <li><button onClick={() => setLegalModal('refund')} className="text-neutral-500 hover:text-white transition-colors text-left">Refund Policy</button></li>
            </ul>
          </div>

          <div className="col-span-2 space-y-8">
            <h4 className="text-xs font-black uppercase tracking-[0.2em] text-white/40">Newsletter</h4>
            <p className="text-neutral-500 text-sm font-light">Get the latest on AI persona technology and creator economy insights.</p>
            <NewsletterSignup />
          </div>
        </div>

        <div className="pt-10 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-10">
            <p className="text-neutral-600 text-xs font-medium">© 2026 PERSONA AI INC. ALL RIGHTS RESERVED.</p>
            <div className="hidden md:flex items-center gap-6">
              <span className="flex items-center gap-2 text-neutral-600 text-[10px] uppercase tracking-widest font-black italic">
                <Shield className="w-3 h-3" /> Encrypted Endpoint
              </span>
              <span className="flex items-center gap-2 text-neutral-600 text-[10px] uppercase tracking-widest font-black italic">
                <Globe className="w-3 h-3" /> Global Infrastructure
              </span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="w-8 h-5 bg-white/5 border border-white/10 rounded overflow-hidden flex items-center justify-center opacity-30">
              <span className="text-[8px] font-black italic">PCI</span>
            </div>
            <div className="w-12 h-5 bg-white/5 border border-white/10 rounded overflow-hidden flex items-center justify-center opacity-30">
              <span className="text-[8px] font-black italic">GDPR</span>
            </div>
          </div>
        </div>
      </footer>

      {/* Global Legal Modal System */}
      <AnimatePresence>
        {legalModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setLegalModal(null)}
              className="absolute inset-0 bg-black/90 backdrop-blur-3xl" 
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-4xl max-h-[85vh] bg-[#0A0A0A] border border-white/10 rounded-[32px] overflow-hidden shadow-2xl flex flex-col"
            >
              {/* Header */}
              <div className="p-8 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
                    <Shield className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-serif italic text-white capitalize">
                      {legalModal === 'gdpr' ? 'GDPR Compliance' : 
                       legalModal === 'refund' ? 'Refund Policy' : 
                       legalModal + ' Policy'}
                    </h2>
                    <p className="text-neutral-500 text-xs font-light tracking-wide uppercase mt-1">Version 2.4 • Effective Aug 3, 2024</p>
                  </div>
                </div>
                <button 
                  onClick={() => setLegalModal(null)}
                  className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white hover:text-black transition-all group"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Content Area */}
              <div className="flex-1 overflow-y-auto p-10 space-y-12 custom-scrollbar">
                {legalModal === 'terms' && (
                  <div className="prose prose-invert max-w-none space-y-10">
                    <section className="space-y-4">
                      <h3 className="text-lg font-bold uppercase tracking-widest text-white/80">1. Agreement to Terms</h3>
                      <p className="text-neutral-400 font-light leading-relaxed">By accessing and using Persona AI (persona-ai.studio), you agree to be bound by these Terms of Service. If you disagree with any part of these terms, you may not access our service.</p>
                    </section>
                    <section className="space-y-4">
                      <h3 className="text-lg font-bold uppercase tracking-widest text-white/80">2. Description of Service</h3>
                      <p className="text-neutral-400 font-light leading-relaxed">Persona AI provides AI-powered video editing and content creation services. Our platform allows users to create, edit, and enhance video content using artificial intelligence technology.</p>
                    </section>
                    <section className="space-y-4">
                      <h3 className="text-lg font-bold uppercase tracking-widest text-white/80">3. User Accounts</h3>
                      <p className="text-neutral-400 font-light leading-relaxed">When you create an account with us, you must provide accurate, complete, and current information. You are solely responsible for maintaining the confidentiality of your account and password.</p>
                    </section>
                    <section className="space-y-4">
                      <h3 className="text-lg font-bold uppercase tracking-widest text-white/80">4. Acceptable Use</h3>
                      <ul className="list-disc pl-5 text-neutral-400 space-y-2 text-sm font-light">
                        <li>Use the service for any illegal purposes</li>
                        <li>Violate any intellectual property rights</li>
                        <li>Upload any malicious code or files</li>
                        <li>Attempt to gain unauthorized access to our systems</li>
                        <li>Use our service to generate inappropriate or harmful content</li>
                      </ul>
                    </section>
                    <section className="space-y-4">
                      <h3 className="text-lg font-bold uppercase tracking-widest text-white/80">5. Content Rights</h3>
                      <p className="text-neutral-400 font-light leading-relaxed">You retain all rights to your content. By using our service, you grant Persona AI a license to use, modify, and process your content solely for the purpose of providing our services to you.</p>
                    </section>
                    <section className="space-y-4">
                      <h3 className="text-lg font-bold uppercase tracking-widest text-white/80">6. Payment Terms</h3>
                      <p className="text-neutral-400 font-light leading-relaxed">Some features of Persona AI require payment. You agree to pay all fees according to the pricing established on our website. All payments are non-refundable unless otherwise specified.</p>
                    </section>
                    <section className="space-y-4">
                      <h3 className="text-lg font-bold uppercase tracking-widest text-white/80">8. Limitation of Liability</h3>
                      <p className="text-neutral-400 font-light leading-relaxed">Persona AI shall not be liable for any indirect, incidental, special, consequential, or punitive damages resulting from your use or inability to use the service.</p>
                    </section>
                    <section className="space-y-4">
                      <h3 className="text-lg font-bold uppercase tracking-widest text-white/80">13. Governing Law</h3>
                      <p className="text-neutral-400 font-light leading-relaxed">These Terms shall be governed by and construed in accordance with the laws of the jurisdiction in which Persona AI operates, without regard to its conflict of law provisions.</p>
                    </section>
                  </div>
                )}

                {legalModal === 'privacy' && (
                  <div className="prose prose-invert max-w-none space-y-12">
                    <section className="space-y-6">
                      <h3 className="text-lg font-bold uppercase tracking-widest text-white/80">Introduction</h3>
                      <p className="text-neutral-400 font-light leading-relaxed">Welcome to Persona AI. We respect your privacy and are committed to protecting your personal data. This privacy policy will inform you about how we look after your personal data when you visit our website (persona-ai.studio) and tell you about your privacy rights and how the law protects you. Persona AI is the controller and responsible for your personal data.</p>
                    </section>

                    <section className="space-y-6">
                      <h3 className="text-lg font-bold uppercase tracking-widest text-white/80">The Data We Collect</h3>
                      <p className="text-neutral-400 font-light leading-relaxed">We may collect, use, store and transfer different kinds of personal data about you which we have grouped together as follows:</p>
                      <ul className="list-disc pl-5 text-neutral-500 text-sm font-light space-y-2">
                        <li>**Identity Data**: includes first name, last name, username</li>
                        <li>**Contact Data**: includes email address</li>
                        <li>**Technical Data**: includes IP address, browser type, location, operating system</li>
                        <li>**Usage Data**: includes information about how you use our website and services</li>
                      </ul>
                    </section>

                    <section className="space-y-6">
                      <h3 className="text-lg font-bold uppercase tracking-widest text-white/80">How We Use Your Data</h3>
                      <p className="text-neutral-400 font-light leading-relaxed">We will only use your personal data when the law allows us to. Most commonly, we use your data to maintain our service, provide support, and analyze usage to improve our platform experience.</p>
                    </section>

                    <section className="space-y-6">
                      <h3 className="text-lg font-bold uppercase tracking-widest text-white/80">Data Security</h3>
                      <p className="text-neutral-400 font-light leading-relaxed">We have put in place appropriate security measures to prevent your personal data from being accidentally lost, used or accessed in an unauthorized way, altered or disclosed. We limit access to your personal data to those who have a business need to know.</p>
                    </section>

                    <section className="space-y-6">
                      <h3 className="text-lg font-bold uppercase tracking-widest text-white/80">Your Legal Rights</h3>
                      <p className="text-neutral-400 font-light leading-relaxed">Under certain circumstances, you have rights under data protection laws in relation to your personal data, including the right to request access, correction, erasure, or to object to processing of your personal data.</p>
                    </section>
                  </div>
                )}

                {legalModal === 'cookies' && (
                  <div className="prose prose-invert max-w-none space-y-10">
                    <section className="space-y-4">
                      <h3 className="text-lg font-bold uppercase tracking-widest text-white/80">What are cookies?</h3>
                      <p className="text-neutral-400 font-light leading-relaxed">Cookies are small data files that are placed on your computer or mobile device when you visit a website. Cookies are widely used by website owners (in this case, Persona AI) in order to make their websites work, or to work more efficiently.</p>
                    </section>
                    <section className="space-y-4">
                      <h3 className="text-lg font-bold uppercase tracking-widest text-white/80">How we use cookies</h3>
                      <ul className="list-disc pl-5 text-neutral-500 text-sm font-light space-y-2">
                        <li>**Essential website operation**: Required for the core video editing platform</li>
                        <li>**Analytics and performance**: To mesure site traffic sources</li>
                        <li>**Functionality**: To remember your specific preferences</li>
                        <li>**Authentication**: To identify you when you sign in</li>
                      </ul>
                    </section>
                    <section className="space-y-4">
                      <h3 className="text-lg font-bold uppercase tracking-widest text-white/80">Control & Deletion</h3>
                      <p className="text-neutral-400 font-light leading-relaxed">You have the right to decide whether to accept or reject cookies. You can amend your web browser controls to refuse cookies. If you choose to reject cookies, you may still use our website, but some functionality might be restricted.</p>
                    </section>
                  </div>
                )}

                {legalModal === 'refund' && (
                    <div className="prose prose-invert max-w-none space-y-12">
                      <div className="glass-panel border-white/10 p-10 bg-gradient-to-br from-red-500/[0.03] to-transparent rounded-[24px]">
                        <div className="flex items-center gap-6 mb-8">
                          <div className="w-16 h-12 bg-red-500/10 rounded flex items-center justify-center font-black italic text-red-400">24H</div>
                          <h3 className="text-2xl font-serif italic">Refund Eligibility</h3>
                        </div>
                        <p className="text-neutral-400 font-light leading-relaxed mb-6">At Persona AI, we strive to provide the best experience. Please read our refund policy carefully before making a purchase.</p>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 mt-10">
                          <div className="space-y-2">
                            <p className="text-white font-bold text-xs uppercase tracking-widest">Time Limit</p>
                            <p className="text-neutral-500 text-sm font-light leading-relaxed">Refund requests must be made within **24 hours** of purchase. After this period, no refunds can be processed.</p>
                          </div>
                          <div className="space-y-2">
                            <p className="text-white font-bold text-xs uppercase tracking-widest">Support Channel</p>
                            <p className="text-neutral-500 text-sm font-light leading-relaxed">Reach out to our team at:<br/><span className="text-white/80 underline">service@persona-ai.studio</span></p>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-6">
                        <h3 className="text-lg font-bold uppercase tracking-widest text-white/80">How to Request</h3>
                        <p className="text-neutral-400 font-light leading-relaxed text-sm">Include your account details, order number, and purchase date in your email. We review every request and will notify you of the outcome via the original payment method.</p>
                      </div>
                    </div>
                  )}
              </div>

              {/* Footer */}
              <div className="p-8 border-t border-white/5 bg-white/[0.02] flex items-center justify-between">
                <p className="text-neutral-500 text-xs font-light">Questions? Contact <span className="text-white/80 underline cursor-pointer">support@persona-ai.studio</span></p>
                <button 
                  onClick={() => setLegalModal(null)}
                  className="btn-primary py-3 px-8 text-xs font-bold"
                >
                  Accept & Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
