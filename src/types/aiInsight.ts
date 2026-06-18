import { Customer } from './customer.js';

export interface AIInsightItem {
  id: string;
  category: 'churn' | 'revenue' | 'channel' | 'open_rate' | 'conversion';
  title: string;
  description: string;
  impact: string;
  trend: 'up' | 'down' | 'neutral';
  actionLabel?: string;
}

export interface AISuggestion {
  explanation: string;
  rules: string[];
  count: number;
  customers: Customer[];
}

export interface AIMessages {
  whatsapp: string;
  sms: string;
  email: {
    subject: string;
    body: string;
  };
  rcs: string;
  recommended_channel: 'whatsapp' | 'email' | 'sms' | 'rcs';
  recommendation_reason: string;
}

export interface CopilotResponse {
  segment: {
    rule: string;
    audienceType: string;
  };
  channel: 'whatsapp' | 'email' | 'sms' | 'rcs';
  message: string;
  prediction: {
    openRate: number;
    clickRate: number;
  };
  explainabilitySteps: string[];
  matchedCount: number;
  intent?: string;
  customers?: {
    name: string;
    risk: 'Low' | 'Medium' | 'High' | string;
    reason: string;
    recommendedAction: string;
  }[];
  summary?: string;
}

export interface DailyInsightsResponse {
  counts: {
    churnRiskCount: number;
    vipCount: number;
    inactive90Count: number;
    revenueAtRisk: number;
  };
  insights: {
    title: string;
    description: string;
    impact: string;
    actionLabel: string;
    campaignPayload: {
      name: string;
      audiencePrompt: string;
      matchedCount: number;
      message: string;
      channel: 'whatsapp' | 'email' | 'sms' | 'rcs';
    };
  }[];
}

