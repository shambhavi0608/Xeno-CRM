import React from 'react';
import { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  subtitle: string;
  action?: React.ReactNode;
}

export function EmptyState({ icon: Icon, title, subtitle, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center rounded-xl bg-[#161616] border border-white/8 min-h-[250px] animate-fade-in animate-slide-up">
      <div className="p-4 rounded-full bg-stone-900 border border-white/5 mb-4 text-[#A0A0A0]">
        <Icon className="w-8 h-8 text-[#606060]" />
      </div>
      <h3 className="text-base font-semibold text-white tracking-tight">{title}</h3>
      <p className="text-stone-400 text-xs mt-2 max-w-sm leading-relaxed">{subtitle}</p>
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
