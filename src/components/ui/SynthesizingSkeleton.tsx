import { Sparkles } from 'lucide-react';
import { cn } from '../../lib/utils';

interface SynthesizingSkeletonProps {
  className?: string;
  label?: string;
  sublabel?: string;
  isSmall?: boolean;
}

export function SynthesizingSkeleton({ 
  className, 
  label = "Synthesizing", 
  sublabel = "AI background worker active",
  isSmall = false
}: SynthesizingSkeletonProps) {
  return (
    <div className={cn(
      "w-full h-full flex flex-col items-center justify-center gap-4 bg-neutral-900/50 backdrop-blur-sm animate-pulse relative overflow-hidden group",
      className
    )}>
      {/* Moving Shimmer Overlay */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full animate-shimmer" />
      
      {/* Spinner and Icon */}
      <div className="relative">
        <div className={cn(
          "border-2 border-white/10 rounded-full border-t-white animate-spin",
          isSmall ? "w-8 h-8" : "w-16 h-16"
        )} />
        <Sparkles className={cn(
          "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-white/20",
          isSmall ? "w-3 h-3" : "w-6 h-6"
        )} />
      </div>

      {/* Text Info */}
      {!isSmall && (
        <div className="text-center px-6 space-y-1.5 z-10">
          <h4 className="text-[10px] font-bold uppercase tracking-[0.3em] text-white/60 drop-shadow-md">
            {label}
          </h4>
          <p className="text-[8px] text-white/30 uppercase tracking-[0.1em] font-light">
            {sublabel}
          </p>
        </div>
      )}
      
      {isSmall && (
        <span className="text-[7px] font-bold uppercase tracking-widest text-white/30">
          {label}
        </span>
      )}
    </div>
  );
}
