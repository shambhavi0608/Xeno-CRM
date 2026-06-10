import React from 'react';
import { MessageSquare, Mail, Smartphone, Zap } from 'lucide-react';

interface ChannelBadgeProps {
  channel: 'whatsapp' | 'email' | 'sms' | 'rcs';
  showIcon?: boolean;
}

export function ChannelBadge({ channel, showIcon = true }: ChannelBadgeProps) {
  const configs = {
    whatsapp: {
      text: 'WhatsApp',
      styles: 'bg-green-500/15 text-[#22C55E] border-green-500/20',
      icon: <MessageSquare className="w-3.5 h-3.5" />
    },
    email: {
      text: 'Email',
      styles: 'bg-blue-500/15 text-[#3B82F6] border-blue-500/20',
      icon: <Mail className="w-3.5 h-3.5" />
    },
    sms: {
      text: 'SMS',
      styles: 'bg-amber-500/15 text-[#F59E0B] border-amber-500/20',
      icon: <Smartphone className="w-3.5 h-3.5" />
    },
    rcs: {
      text: 'RCS',
      styles: 'bg-purple-500/15 text-[#A855F7] border-purple-500/20',
      icon: <Zap className="w-3.5 h-3.5" />
    }
  };

  const current = configs[channel] || configs.whatsapp;

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-[11px] font-medium tracking-wide ${current.styles}`}>
      {showIcon && current.icon}
      {current.text}
    </span>
  );
}
