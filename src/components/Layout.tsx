import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, PlusCircle, Image as ImageIcon, LogOut, Sparkles, Menu, X } from 'lucide-react';
import { auth, signOut, onAuthStateChanged, db, doc, onSnapshot } from '../firebase';
import { cn } from '../lib/utils';

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const [user, setUser] = useState<{ name: string; email: string; uid: string; photoURL: string } | null>(null);
  const [credits, setCredits] = useState<number>(0);
  const [maxCredits, setMaxCredits] = useState<number>(10);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    let unsubscribeCredits: (() => void) | undefined;

    const unsubscribeAuth = onAuthStateChanged(auth, (authUser) => {
      if (authUser) {
        setUser({
          name: authUser.displayName || 'User',
          email: authUser.email || '',
          uid: authUser.uid,
          photoURL: authUser.photoURL || ''
        });

        // Bypassing firestore rules with backend proxy poll
        const fetchProfile = async () => {
          try {
            const token = await authUser.getIdToken();
            const response = await fetch('/api/user/profile', {
              headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
              const data = await response.json();
              setCredits(data.credits || 0);
              setMaxCredits(data.maxCredits || 10);
            }
          } catch (err) {
            console.error("[Credits] Sync failed:", err);
          }
        };

        fetchProfile();
        const interval = setInterval(fetchProfile, 15000);
        unsubscribeCredits = () => clearInterval(interval);
      } else {
        setUser(null);
        setCredits(0);
        if (unsubscribeCredits) {
          unsubscribeCredits();
          unsubscribeCredits = undefined;
        }
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeCredits) unsubscribeCredits();
    };
  }, []);

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      navigate('/');
    } catch (error) {
      console.error("Sign out failed:", error);
    }
  };

  const navItems = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
    { icon: ImageIcon, label: 'Media Library', path: '/gallery' },
    { icon: Sparkles, label: 'Settings', path: '/settings' },
  ];

  return (
    <div className="flex min-h-screen bg-black text-white font-sans overflow-x-hidden">
      {/* Mobile Header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-black/80 backdrop-blur-xl border-b border-white/5 z-50 flex items-center justify-between px-6">
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 bg-white rounded flex items-center justify-center">
            <div className="w-2.5 h-2.5 bg-black rotate-45" />
          </div>
          <span className="text-base font-bold tracking-tight">Persona AI</span>
        </div>
        <button 
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-2 hover:bg-white/5 rounded-full transition-colors"
        >
          {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </header>

      {/* Sidebar - Desktop */}
      <aside className="hidden lg:flex w-64 border-r border-white/5 flex-col fixed left-0 top-0 bottom-0 z-40 bg-black">
        <div className="p-8 flex items-center gap-3">
          <div className="w-6 h-6 bg-white rounded flex items-center justify-center">
            <div className="w-3 h-3 bg-black rotate-45" />
          </div>
          <span className="text-lg font-bold tracking-tight">Persona AI</span>
        </div>

        <nav className="flex-1 px-4 space-y-1 mt-4">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-300 text-[10px] font-bold uppercase tracking-widest",
                location.pathname === item.path
                  ? "bg-white text-black"
                  : "text-neutral-500 hover:text-white hover:bg-white/5"
              )}
            >
              <item.icon className="w-4 h-4" />
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>

        <div className="p-6 border-t border-white/5 space-y-6">
          {user && (
            <div className="space-y-4">
              <div className="px-2 space-y-2">
                <div className="flex items-center justify-between text-[8px] font-bold uppercase tracking-widest text-neutral-500">
                  <span>Available Credits</span>
                  <span>{credits} / {maxCredits}</span>
                </div>
                <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-white rounded-full transition-all duration-1000" 
                    style={{ width: `${Math.min(100, (credits / maxCredits) * 100)}%` }}
                  />
                </div>
              </div>
              
              <div className="flex items-center gap-3 px-2">
                <img
                  src={user.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.uid}`}
                  alt="Profile"
                  className="w-8 h-8 rounded-full bg-white/10"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-widest truncate">{user.name}</p>
                  <p className="text-[9px] text-neutral-600 truncate">{user.email}</p>
                </div>
              </div>
            </div>
          )}
          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-3 px-4 py-2 rounded-xl text-neutral-600 hover:text-red-400 hover:bg-red-500/5 transition-all duration-300 text-[10px] font-bold uppercase tracking-widest"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="lg:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-[55]"
            />
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="lg:hidden fixed top-0 left-0 bottom-0 w-72 bg-black border-r border-white/5 z-[60] flex flex-col"
            >
              <div className="p-8 flex items-center gap-3 border-b border-white/5">
                <div className="w-6 h-6 bg-white rounded flex items-center justify-center">
                  <div className="w-3 h-3 bg-black rotate-45" />
                </div>
                <span className="text-lg font-bold tracking-tight">Persona AI</span>
              </div>

              <nav className="flex-1 px-4 space-y-1 mt-8">
                {navItems.map((item) => (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={cn(
                      "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 text-[10px] font-bold uppercase tracking-widest",
                      location.pathname === item.path
                        ? "bg-white text-black"
                        : "text-neutral-500 hover:text-white hover:bg-white/5"
                    )}
                  >
                    <item.icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </Link>
                ))}
              </nav>

              <div className="p-6 border-t border-white/5 space-y-6">
                {user && (
                  <div className="space-y-4">
                    <div className="px-2 space-y-2">
                      <div className="flex items-center justify-between text-[8px] font-bold uppercase tracking-widest text-neutral-500">
                        <span>Available Credits</span>
                        <span>{credits} / {maxCredits}</span>
                      </div>
                      <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-white rounded-full transition-all duration-1000" 
                          style={{ width: `${Math.min(100, (credits / maxCredits) * 100)}%` }}
                        />
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3 px-2">
                      <img
                        src={user.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.uid}`}
                        alt="Profile"
                        className="w-10 h-10 rounded-full bg-white/10"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-bold uppercase tracking-widest truncate">{user.name}</p>
                        <p className="text-[9px] text-neutral-600 truncate">{user.email}</p>
                      </div>
                    </div>
                  </div>
                )}
                <button
                  onClick={handleSignOut}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-neutral-600 hover:text-red-400 hover:bg-red-500/5 transition-all duration-300 text-[10px] font-bold uppercase tracking-widest"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out</span>
                </button>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="flex-1 overflow-x-hidden bg-black pt-16 lg:pt-0 lg:ml-64 flex flex-col">
        <div className={cn(
          "flex-1 flex flex-col w-full",
          "px-4 sm:px-6 lg:px-12 pt-4 lg:pt-8 pb-4 lg:pb-8 transition-all duration-500",
          (location.pathname.startsWith('/dashboard') || location.pathname.startsWith('/gallery') || location.pathname.startsWith('/settings')) ? "max-w-none" : "mx-auto max-w-[1600px]"
        )}>
          {children}
        </div>
      </main>
    </div>
  );
}
