import React from 'react';
import { cn } from '../../lib/utils';

export const SkeletonBox = ({ className }: { className?: string }) => (
  <div className={cn("bg-white/5 rounded shimmer", className)} />
);

export default function InfluencerDetailSkeleton() {
  return (
    <div className="space-y-12">
      <header className="flex items-center gap-8">
        <SkeletonBox className="w-10 h-10 rounded-full" />
        <div className="flex items-center gap-6">
          <SkeletonBox className="w-20 h-20 rounded-full" />
          <div className="space-y-2">
            <SkeletonBox className="h-8 w-48 bg-white/5 rounded-lg" />
            <SkeletonBox className="h-4 w-32 bg-white/5 rounded-lg" />
          </div>
        </div>
      </header>

      <div className="grid-studio">
        <div className="studio-panel">
          <SkeletonBox className="h-[600px] w-full bg-white/5 rounded-2xl" />
        </div>
        <div className="studio-content space-y-12">
          <div className="flex items-center justify-between">
            <SkeletonBox className="h-10 w-48 bg-white/5 rounded-lg" />
            <SkeletonBox className="h-4 w-24 bg-white/5 rounded-lg" />
          </div>
          <SkeletonBox className="aspect-video w-full bg-white/5 rounded-2xl" />
          <div className="grid grid-cols-3 gap-8">
            {[1, 2, 3].map((i) => (
              <SkeletonBox key={i} className="aspect-video bg-white/5 rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
