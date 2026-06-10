import React from 'react';

interface SkeletonProps {
  className?: string;
  count?: number;
}

export function SkeletonCard({ className = '', count = 1 }: SkeletonProps) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className={`bg-[#161616] border border-white/8 rounded-xl p-6 relative overflow-hidden shadow-md ${className}`}
        >
          {/* Shimmer overlay */}
          <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite_linear] bg-gradient-to-r from-transparent via-white/5 to-transparent" />
          
          <div className="h-4 w-32 bg-stone-800 rounded mb-4" />
          <div className="h-8 w-24 bg-stone-800 rounded mb-2" />
          <div className="h-3 w-40 bg-stone-800 rounded" />
        </div>
      ))}
    </>
  );
}
