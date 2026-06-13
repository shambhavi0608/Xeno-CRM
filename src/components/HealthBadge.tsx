import React from 'react';
import { ShieldCheck, ShieldAlert, ShieldX } from 'lucide-react';

interface HealthBadgeProps {
  score: number;
  className?: string;
}

export default function HealthBadge({ score, className = '' }: HealthBadgeProps) {
  // Clamp score
  const clScore = Math.max(0, Math.min(100, score));

  let colorClasses = '';
  let dotColor = '';
  let riskText = '';
  let Icon = ShieldCheck;

  if (clScore >= 70) {
    // Healthy (Green)
    colorClasses = 'bg-[#22C55E]/10 border-[#22C55E]/20 text-[#22C55E]';
    dotColor = 'bg-[#22C55E]';
    riskText = 'Healthy';
    Icon = ShieldCheck;
  } else if (clScore >= 40) {
    // Unstable (Yellow)
    colorClasses = 'bg-[#F59E0B]/10 border-[#F59E0B]/20 text-[#F59E0B]';
    dotColor = 'bg-[#F59E0B]';
    riskText = 'Unstable';
    Icon = ShieldAlert;
  } else {
    // Churn Risk (Red)
    colorClasses = 'bg-[#EF4444]/10 border-[#EF4444]/20 text-[#EF4444]';
    dotColor = 'bg-[#EF4444]';
    riskText = 'At Risk';
    Icon = ShieldX;
  }

  return (
    <div className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-full border text-xs font-semibold ${colorClasses} ${className}`} id={`health_badge_${clScore}`}>
      <Icon className="w-3.5 h-3.5 shrink-0" />
      <span className="font-sans font-medium">{clScore}%</span>
      <span className="text-[10px] uppercase font-mono tracking-wider opacity-90 border-l border-white/10 pl-1.5 ml-0.5">
        {riskText}
      </span>
    </div>
  );
}
