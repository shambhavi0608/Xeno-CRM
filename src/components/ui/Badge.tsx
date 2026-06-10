import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'success' | 'warning' | 'error' | 'info' | 'muted' | 'brand';
  className?: string;
  key?: React.Key;
}

export function Badge({ children, variant = 'muted', className = '' }: BadgeProps) {
  const styles = {
    success: 'bg-[#22C55E]/12 border-[#22C55E]/20 text-[#22C55E]',
    warning: 'bg-[#F59E0B]/12 border-[#F59E0B]/20 text-[#F59E0B]',
    error: 'bg-[#EF4444]/12 border-[#EF4444]/20 text-[#EF4444]',
    info: 'bg-[#3B82F6]/12 border-[#3B82F6]/20 text-[#3B82F6]',
    brand: 'bg-[#E8300B]/12 border-[#E8300B]/20 text-[#E8300B]',
    muted: 'bg-stone-800 border-white/5 text-stone-400'
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-[11px] font-medium tracking-wide capitalize ${styles[variant]} ${className}`}
    >
      {variant !== 'muted' && (
        <span className={`w-1.5 h-1.5 rounded-full ${
          variant === 'success' ? 'bg-[#22C55E]' :
          variant === 'warning' ? 'bg-[#F59E0B]' :
          variant === 'error' ? 'bg-[#EF4444]' :
          variant === 'brand' ? 'bg-[#E8300B]' :
          'bg-[#3B82F6]'
        }`} />
      )}
      {children}
    </span>
  );
}
