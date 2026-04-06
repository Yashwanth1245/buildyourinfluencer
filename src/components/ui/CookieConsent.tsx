import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Shield, Cookie, X, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '../../lib/utils';

interface CookiePreferences {
  necessary: boolean;
  preferences: boolean;
  statistics: boolean;
  marketing: boolean;
}

export default function CookieConsent() {
  const [isVisible, setIsVisible] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [preferences, setPreferences] = useState<CookiePreferences>({
    necessary: true,
    preferences: true,
    statistics: true,
    marketing: true,
  });

  useEffect(() => {
    const consent = localStorage.getItem('persona-cookie-consent');
    if (!consent) {
      // Delay showing for premium feel
      const timer = setTimeout(() => setIsVisible(true), 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAcceptAll = () => {
    const allAccepted = { necessary: true, preferences: true, statistics: true, marketing: true };
    localStorage.setItem('persona-cookie-consent', JSON.stringify(allAccepted));
    setIsVisible(false);
  };

  const handleDeclineAll = () => {
    const onlyNecessary = { necessary: true, preferences: false, statistics: false, marketing: false };
    localStorage.setItem('persona-cookie-consent', JSON.stringify(onlyNecessary));
    setIsVisible(false);
  };

  const handleSaveSelection = () => {
    localStorage.setItem('persona-cookie-consent', JSON.stringify(preferences));
    setIsVisible(false);
  };

  const togglePreference = (key: keyof CookiePreferences) => {
    if (key === 'necessary') return; // Cannot disable necessary
    setPreferences(prev => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          className="fixed bottom-6 right-6 left-6 md:left-auto md:w-[480px] z-[9999]"
        >
          <div className="bg-neutral-950/80 backdrop-blur-2xl border border-white/10 rounded-2xl p-6 shadow-2xl relative overflow-hidden group">
            {/* Subtle Gradient Accent */}
            <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent" />
            
            <div className="flex items-start gap-4 mb-4">
              <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                <Cookie className="w-5 h-5 text-neutral-400" />
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-bold tracking-tight text-white mb-1 uppercase">Determine the scope of consent</h3>
                <p className="text-[11px] leading-relaxed text-neutral-400">
                  We use cookies to enhance your experience, serve personalized content, and analyze our traffic. Read our <span className="text-white underline cursor-pointer hover:text-neutral-200 transition-colors">Privacy Policy</span> for more details.
                </p>
              </div>
              <button 
                onClick={() => setIsVisible(false)}
                className="p-1 hover:bg-white/5 rounded-lg transition-colors"
                aria-label="Close"
              >
                <X className="w-4 h-4 text-neutral-500" />
              </button>
            </div>

            <AnimatePresence>
              {showSettings && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden mb-6 space-y-3"
                >
                  <div className="pt-4 border-t border-white/5 space-y-2">
                    {[
                      { key: 'necessary', label: 'Necessary', desc: 'Required for core app functionality.', locked: true },
                      { key: 'preferences', label: 'Preferences', desc: 'Allows us to remember your settings.', locked: false },
                      { key: 'statistics', label: 'Statistics', desc: 'Help us understand how users interact.', locked: false },
                      { key: 'marketing', label: 'Marketing', desc: 'Used for relevant updates and offers.', locked: false },
                    ].map((item) => (
                      <div 
                        key={item.key}
                        className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/5 transition-colors hover:bg-white/[0.04]"
                      >
                        <div className="flex-1 mr-4">
                          <p className="text-[10px] font-bold text-white uppercase tracking-wider">{item.label}</p>
                          <p className="text-[9px] text-neutral-600 line-clamp-1">{item.desc}</p>
                        </div>
                        <div 
                          onClick={() => togglePreference(item.key as keyof CookiePreferences)}
                          className={cn(
                            "w-8 h-4 rounded-full relative transition-all duration-300 cursor-pointer",
                            preferences[item.key as keyof CookiePreferences] ? "bg-white" : "bg-neutral-800",
                            item.locked && "opacity-50 cursor-not-allowed"
                          )}
                        >
                          <div className={cn(
                            "absolute top-0.5 bottom-0.5 w-3 h-3 rounded-full transition-all duration-300",
                            preferences[item.key as keyof CookiePreferences] ? "right-0.5 bg-black" : "left-0.5 bg-neutral-600"
                          )} />
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <button
                  onClick={handleAcceptAll}
                  className="flex-1 py-2.5 bg-white text-black text-[10px] font-bold uppercase tracking-widest rounded-xl hover:bg-neutral-200 transition-all duration-300 transform active:scale-[0.98]"
                >
                  Accept All
                </button>
                <button
                  onClick={handleDeclineAll}
                  className="flex-1 py-2.5 bg-white/5 text-white text-[10px] font-bold uppercase tracking-widest rounded-xl border border-white/10 hover:bg-white/10 transition-all duration-300 transform active:scale-[0.98]"
                >
                  Reject All
                </button>
              </div>
              <button
                onClick={() => setShowSettings(!showSettings)}
                className="w-full py-2 text-neutral-500 hover:text-white transition-colors text-[9px] font-bold uppercase tracking-widest flex items-center justify-center gap-1"
              >
                {showSettings ? (
                  <>Hide Preferences <ChevronUp className="w-3 h-3" /></>
                ) : (
                  <>Customize Preferences <ChevronDown className="w-3 h-3" /></>
                )}
              </button>
              {showSettings && (
                <button
                  onClick={handleSaveSelection}
                  className="w-full py-2.5 bg-white/10 text-white text-[10px] font-bold uppercase tracking-widest rounded-xl border border-white/20 hover:bg-white/20 transition-all duration-300"
                >
                  Save Selection
                </button>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
