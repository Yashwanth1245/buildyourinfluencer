import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { ArrowRight, Mail, Lock, User, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

import { auth, signInWithPopup, googleProvider } from '../firebase';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  updateProfile,
  sendPasswordResetEmail 
} from 'firebase/auth';

type AuthMode = 'login' | 'signup' | 'forgot-password';

export default function Auth() {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Determine initial mode based on URL or default to 'login'
  const initialMode: AuthMode = location.pathname === '/signup' ? 'signup' : 'login';
  const [mode, setMode] = useState<AuthMode>(initialMode);
  
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resetSent, setResetSent] = useState(false);

  // Sync mode with URL changes
  useEffect(() => {
    if (mode !== 'forgot-password') {
      setMode(location.pathname === '/signup' ? 'signup' : 'login');
    }
  }, [location.pathname]);

  const getErrorMessage = (code: string) => {
    switch (code) {
      case 'auth/user-not-found':
        return 'No account found with this email.';
      case 'auth/wrong-password':
        return 'Incorrect password. Please try again.';
      case 'auth/email-already-in-use':
        return 'This email is already registered.';
      case 'auth/weak-password':
        return 'Password should be at least 6 characters.';
      case 'auth/invalid-email':
        return 'Please enter a valid email address.';
      case 'auth/too-many-requests':
        return 'Too many failed attempts. Please try again later.';
      case 'auth/invalid-credential':
        return 'Account not found or password incorrect.';
      default:
        return 'An unexpected error occurred. Please try again.';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResetSent(false);
    
    try {
      if (mode === 'login') {
        await signInWithEmailAndPassword(auth, email, password);
        navigate('/dashboard');
      } else if (mode === 'signup') {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(userCredential.user, { displayName: name });
        navigate('/dashboard');
      } else if (mode === 'forgot-password') {
        await sendPasswordResetEmail(auth, email);
        setResetSent(true);
      }
    } catch (err: any) {
      setError(getErrorMessage(err.code));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      await signInWithPopup(auth, googleProvider);
      navigate('/dashboard');
    } catch (err: any) {
      setError(getErrorMessage(err.code));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Background Decorative Element */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-white/[0.02] blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-white/[0.01] blur-[120px] rounded-full pointer-events-none" />

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-[400px] space-y-10 relative z-10"
      >
        {/* Navigation Fix: Back to Home */}
        <div className="flex justify-center mb-12">
          <button 
            onClick={() => navigate('/')}
            className="flex flex-col items-center gap-2 group transition-all duration-500"
          >
            <div className="w-8 h-8 rounded-full border border-white/5 flex items-center justify-center group-hover:border-white/20 group-hover:bg-white/5 transition-all">
              <ArrowLeft className="w-3.5 h-3.5 text-neutral-500 group-hover:text-white transition-colors" />
            </div>
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-neutral-600 group-hover:text-white transition-colors">
              Back to Home
            </span>
          </button>
        </div>

        <header className="text-center space-y-4">
          <AnimatePresence mode="wait">
            <motion.div
              key={mode}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
            >
              <h1 className="text-4xl md:text-5xl font-serif italic mb-2">
                {mode === 'login' && 'Welcome Back'}
                {mode === 'signup' && 'Create Studio'}
                {mode === 'forgot-password' && 'Reset Password'}
              </h1>
              <p className="text-[11px] uppercase tracking-[0.2em] text-neutral-500 font-bold">
                {mode === 'login' && 'Enter credentials to access your studio'}
                {mode === 'signup' && 'Start your journey with BuildYourInfluencer'}
                {mode === 'forgot-password' && 'Enter your email to receive a recovery link'}
              </p>
            </motion.div>
          </AnimatePresence>
        </header>

        {resetSent ? (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass-panel p-8 text-center space-y-6 bg-white/[0.02] border-white/5 rounded-3xl"
          >
            <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8 text-white" />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-serif italic">Check your inbox</h3>
              <p className="text-neutral-500 text-sm font-light">We've sent a password reset link to <span className="text-white font-bold">{email}</span></p>
            </div>
            <button 
              onClick={() => {
                setResetSent(false);
                setMode('login');
              }}
              className="btn-primary w-full py-4 text-[10px] font-black tracking-widest uppercase"
            >
              Back to Login
            </button>
          </motion.div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <AnimatePresence mode="popLayout">
                {mode === 'signup' && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-2 overflow-hidden"
                  >
                    <label className="text-[9px] font-black uppercase tracking-widest text-neutral-500 ml-1">Full Name</label>
                    <div className="relative group">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-600 group-focus-within:text-white transition-colors" />
                      <input 
                        type="text" 
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="John Doe"
                        className="w-full bg-[#0A0A0A] border border-white/5 rounded-2xl px-12 py-4 text-sm focus:outline-none focus:border-white/20 focus:bg-white/[0.02] transition-all"
                        required={mode === 'signup'}
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="space-y-2">
                <label className="text-[9px] font-black uppercase tracking-widest text-neutral-500 ml-1">Email Address</label>
                <div className="relative group">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-600 group-focus-within:text-white transition-colors" />
                  <input 
                    type="email" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="w-full bg-[#0A0A0A] border border-white/5 rounded-2xl px-12 py-4 text-sm focus:outline-none focus:border-white/20 focus:bg-white/[0.02] transition-all"
                    required
                  />
                </div>
              </div>

              {mode !== 'forgot-password' && (
                <div className="space-y-2">
                  <div className="flex justify-between items-center px-1">
                    <label className="text-[9px] font-black uppercase tracking-widest text-neutral-500">Password</label>
                    {mode === 'login' && (
                      <button 
                        type="button"
                        onClick={() => setMode('forgot-password')}
                        className="text-[9px] font-bold uppercase tracking-wider text-neutral-600 hover:text-white transition-colors"
                      >
                        Forgot password?
                      </button>
                    )}
                  </div>
                  <div className="relative group">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-600 group-focus-within:text-white transition-colors" />
                    <input 
                      type="password" 
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-[#0A0A0A] border border-white/5 rounded-2xl px-12 py-4 text-sm focus:outline-none focus:border-white/20 focus:bg-white/[0.02] transition-all"
                      required={mode !== 'forgot-password'}
                    />
                  </div>
                </div>
              )}
            </div>

            <button 
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-white text-black rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-neutral-200 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin" />
              ) : (
                <>
                  {mode === 'login' && 'Sign In'}
                  {mode === 'signup' && 'Create Account'}
                  {mode === 'forgot-password' && 'Send Reset Link'}
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            {mode !== 'forgot-password' && (
              <>
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-white/5"></div>
                  </div>
                  <div className="relative flex justify-center text-[8px] font-black uppercase tracking-[0.3em]">
                    <span className="bg-black px-4 text-neutral-700">Or continue with</span>
                  </div>
                </div>

                <button 
                  type="button"
                  onClick={handleGoogleLogin}
                  disabled={loading}
                  className="w-full py-4 border border-white/5 rounded-2xl bg-white/[0.02] flex items-center justify-center gap-3 text-[10px] font-bold uppercase tracking-widest hover:bg-white/5 transition-all group"
                >
                  <svg className="w-4 h-4 group-hover:scale-110 transition-transform" viewBox="0 0 24 24">
                    <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
                    <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                  </svg>
                  {mode === 'login' ? 'Sign in with Google' : 'Sign up with Google'}
                </button>
              </>
            )}
          </form>
        )}

        {error && (
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-red-500/80 text-center text-[10px] font-bold uppercase tracking-wider bg-red-500/5 py-3 rounded-xl border border-red-500/10"
          >
            {error}
          </motion.p>
        )}

        <footer className="text-center pt-8">
          <button 
            type="button"
            onClick={() => {
              if (mode === 'forgot-password') {
                setMode('login');
              } else {
                setMode(mode === 'login' ? 'signup' : 'login');
              }
              setResetSent(false);
              setError(null);
            }}
            className="text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-500 hover:text-white transition-all group"
          >
            {mode === 'login' && <>Don't have an account? <span className="text-white group-hover:underline">Create one</span></>}
            {mode === 'signup' && <>Already have an account? <span className="text-white group-hover:underline">Sign in</span></>}
            {mode === 'forgot-password' && <>Remembered your password? <span className="text-white group-hover:underline">Sign in</span></>}
          </button>
        </footer>
      </motion.div>
    </div>
  );
}
