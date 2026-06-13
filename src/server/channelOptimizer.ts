import { Campaign } from '../types/index.js';

export interface OptimizedChannelResult {
  recommendedChannel: 'whatsapp' | 'email' | 'sms' | 'rcs';
  openRate: number;
  ctr: number;
  explanation: string;
}

export function optimizeChannel(campaigns: Campaign[]): OptimizedChannelResult {
  // Group metrics by channel
  const channelMetrics: Record<'whatsapp' | 'email' | 'sms' | 'rcs', {
    delivered: number;
    opened: number;
    clicked: number;
  }> = {
    whatsapp: { delivered: 0, opened: 0, clicked: 0 },
    email: { delivered: 0, opened: 0, clicked: 0 },
    sms: { delivered: 0, opened: 0, clicked: 0 },
    rcs: { delivered: 0, opened: 0, clicked: 0 }
  };

  // Aggregate stats from campaigns
  campaigns.forEach(c => {
    const ch = c.channel;
    if (channelMetrics[ch]) {
      channelMetrics[ch].delivered += c.delivered_count || 0;
      channelMetrics[ch].opened += c.opened_count || 0;
      channelMetrics[ch].clicked += c.clicked_count || 0;
    }
  });

  // Calculate Open Rate and CTR per channel
  const rates = Object.keys(channelMetrics).map(key => {
    const ch = key as 'whatsapp' | 'email' | 'sms' | 'rcs';
    const metrics = channelMetrics[ch];

    // Open Rate = Opened / Delivered
    const openRate = metrics.delivered > 0 ? (metrics.opened / metrics.delivered) * 100 : 0;
    // CTR = Clicked / Opened
    const ctr = metrics.opened > 0 ? (metrics.clicked / metrics.opened) * 100 : 0;

    // Direct blended score: Open Rate * 0.4 + CTR * 0.6 (or similar, default values if no data)
    let score = (openRate * 0.4) + (ctr * 0.6);

    // Warm start default factors if there's no historical campaign run
    if (metrics.delivered === 0) {
      if (ch === 'whatsapp') score = 45; // default moderate score
      if (ch === 'rcs') score = 38;
      if (ch === 'sms') score = 30;
      if (ch === 'email') score = 20;
    }

    return {
      channel: ch,
      openRate: metrics.delivered > 0 ? openRate : getDefaultOpenRate(ch),
      ctr: metrics.opened > 0 ? ctr : getDefaultCtr(ch),
      score
    };
  });

  // Pick top performer
  rates.sort((a, b) => b.score - a.score);
  const best = rates[0];

  const explanation = getRecommendationExplanation(best.channel, best.openRate, best.ctr);

  return {
    recommendedChannel: best.channel,
    openRate: Math.round(best.openRate * 10) / 10,
    ctr: Math.round(best.ctr * 10) / 10,
    explanation
  };
}

function getDefaultOpenRate(channel: 'whatsapp' | 'email' | 'sms' | 'rcs'): number {
  switch (channel) {
    case 'whatsapp': return 94.5;
    case 'rcs': return 82.0;
    case 'sms': return 88.5;
    case 'email': return 24.2;
  }
}

function getDefaultCtr(channel: 'whatsapp' | 'email' | 'sms' | 'rcs'): number {
  switch (channel) {
    case 'whatsapp': return 15.2;
    case 'rcs': return 11.8;
    case 'sms': return 6.4;
    case 'email': return 2.8;
  }
}

function getRecommendationExplanation(channel: string, openRate: number, ctr: number): string {
  const oRate = Math.round(openRate * 10) / 10;
  const cRate = Math.round(ctr * 10) / 10;

  switch (channel) {
    case 'whatsapp':
      return `WhatsApp is currently leading conversion indicators with an average Open Rate of ${oRate}% and Click-Through Rate of ${cRate}%. Instant push notifications yield the highest instant response for consumer D2C engagement.`;
    case 'rcs':
      return `RCS (Rich Communication Services) is suggested with ${oRate}% Open Rate and ${cRate}% CTR. Its interactive visual cards offer pristine UX for product carousel engagements.`;
    case 'sms':
      return `SMS is chosen with an Open Rate of ${oRate}% and CTR of ${cRate}%. While simple, it has high deliverability across cellular regions under low connectivity.`;
    case 'email':
      return `Email has an Open Rate of ${oRate}% and CTR of ${cRate}%. It represents the absolute supreme channel for complex promotional content requiring deep editorial newsletter formatting.`;
    default:
      return 'Optimized channel selection determined based on recent historical client communication interactions.';
  }
}
