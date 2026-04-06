import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Users, ArrowRight } from 'lucide-react';
import { Influencer } from '../types';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';
import { SynthesizingSkeleton } from './ui/SynthesizingSkeleton';

import { db, auth, collection, query, where, onSnapshot, orderBy, handleFirestoreError, OperationType } from '../firebase';

const Skeleton = ({ className }: { className?: string }) => (
  <div className={cn("animate-pulse bg-white/5 rounded", className)} />
);

export default function Dashboard() {
  const [influencers, setInfluencers] = useState<Influencer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth.currentUser) {
      setLoading(false);
      return;
    }

    const fetchInfluencers = async () => {
      try {
        const token = await auth.currentUser?.getIdToken();
        const response = await fetch('/api/influencers', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.ok) {
          const data = await response.json();
          setInfluencers(data);
        }
      } catch (err) {
        console.error("[Dashboard] Fetch failed:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchInfluencers();
    const interval = setInterval(fetchInfluencers, 15000); // Poll every 15s

    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="space-y-12 h-full flex flex-col w-full">
        <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-6">
          <div className="space-y-4">
            <Skeleton className="h-10 w-48 sm:w-64 bg-white/5 rounded-lg" />
            <Skeleton className="h-4 w-full sm:w-96 bg-white/5 rounded-lg" />
          </div>
          <Skeleton className="h-12 w-full sm:w-32 bg-white/5 rounded-xl" />
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4 sm:gap-8">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="glass-card overflow-hidden">
              <Skeleton className="aspect-square bg-white/5" />
              <div className="p-6 space-y-4">
                <div className="pt-2 flex justify-center">
                  <Skeleton className="h-9 w-32 bg-white/5 rounded-full" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 sm:space-y-12 h-full flex flex-col w-full">
      <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-6">
        <div className="section-header">
          <h1 className="section-title">Your Personas</h1>
          <p className="section-subtitle">Manage and grow your digital identities.</p>
        </div>
        <Link
          to="/create"
          className="btn-primary w-full sm:w-auto"
        >
          <Plus className="w-4 h-4" />
          Create New
        </Link>
      </header>

      {influencers.length === 0 ? (
        <div className="glass-panel w-full flex-1 flex flex-col items-center justify-center text-center space-y-8 py-20 border-dashed">
          <div className="w-20 h-20 border border-white/10 rounded-2xl flex items-center justify-center mx-auto">
            <Users className="w-8 h-8 text-neutral-400" />
          </div>
          <div className="max-w-md mx-auto space-y-4">
            <h2 className="text-4xl font-serif italic">No personas yet</h2>
            <p className="text-neutral-500 font-light text-lg">
              Start by creating your first AI persona. Define their personality, appearance, and niche.
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4 sm:gap-8">
          {influencers.map((influencer, index) => {
            const isGenerating = influencer.status === 'generating';
            return (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                key={influencer.id}
                className={cn("glass-card group", isGenerating && "opacity-80")}
              >
                <div className="aspect-square relative overflow-hidden bg-neutral-950">
                  {isGenerating ? (
                    <SynthesizingSkeleton label="Synthesizing" isSmall />
                  ) : (
                    <>
                      <img
                        src={influencer.previewUrl || influencer.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${influencer.id}`}
                        alt={influencer.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-all duration-700"
                        loading="lazy"
                        decoding="async"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-80" />
                    </>
                  )}
                  <div className="absolute bottom-6 left-6 right-6">
                    <h3 className="text-3xl font-serif italic text-white">{influencer.name}</h3>
                  </div>
                </div>
                <div className="p-6 space-y-6">
                  <div className="pt-2 flex justify-center">
                    {isGenerating ? (
                      <div className="bg-white/5 text-neutral-500 rounded-full px-6 py-2 font-bold text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 cursor-not-allowed">
                        Initialising...
                      </div>
                    ) : (
                      <Link
                        to={`/influencer/${influencer.id}`}
                        className="bg-white text-black hover:bg-neutral-200 transition-all duration-300 rounded-full px-6 py-2 font-bold text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 group/link"
                      >
                        Enter Studio
                        <ArrowRight className="w-3 h-3 group-hover/link:translate-x-1 transition-transform" />
                      </Link>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
