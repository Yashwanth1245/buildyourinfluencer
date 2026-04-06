import React, { useState } from 'react';
import { cn } from '../../lib/utils';
import { SkeletonBox } from '../influencer-detail/Skeleton';

interface LazyImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  containerClassName?: string;
}

export function LazyImage({ 
  src, 
  alt, 
  className, 
  containerClassName,
  ...props 
}: LazyImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);

  return (
    <div className={cn("relative w-full h-full overflow-hidden", containerClassName)}>
      {!isLoaded && (
        <SkeletonBox className="absolute inset-0 w-full h-full z-10" />
      )}
      <img
        src={src}
        alt={alt}
        className={cn(
          "transition-opacity duration-1000",
          isLoaded ? "opacity-100" : "opacity-0",
          className
        )}
        onLoad={() => setIsLoaded(true)}
        {...props}
      />
    </div>
  );
}
