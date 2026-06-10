import React from 'react';

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  color?: 'brand' | 'white';
}

export function LoadingSpinner({ size = 'md', color = 'brand' }: SpinnerProps) {
  const sizes = {
    sm: 'w-4 h-4 border-2',
    md: 'w-6 h-6 border-2',
    lg: 'w-10 h-10 border-3'
  };

  const colors = {
    brand: 'border-t-[#E8300B] border-stone-800',
    white: 'border-t-white border-white/20'
  };

  return (
    <div className="flex items-center justify-center">
      <div
        className={`animate-spin rounded-full ${sizes[size]} ${colors[color]}`}
        style={{ borderStyle: 'solid' }}
      />
    </div>
  );
}
