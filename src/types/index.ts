export interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  memberSince: string;
  totalSpent: number;
  orderCount: number;
  lastOrderDate: string;
  tags: string[];
  healthScore?: number;
  churnRisk?: 'Low' | 'Medium' | 'High';
  engagementScore?: number;
}

export interface Order {
  orderId: string;
  customerId: string;
  amount: number;
  items: string[];
  timestamp: string;
}

export interface Campaign {
  campaignId: string;
  name: string;
  audiencePrompt: string;
  matchedCount: number;
  message: string;
  channel: 'whatsapp' | 'email' | 'sms' | 'rcs';
  status: 'draft' | 'active' | 'completed' | 'paused';
  createdAt: string;
  sent_count: number;
  delivered_count: number;
  opened_count: number;
  clicked_count: number;
  failed_count: number;
  orders_attributed: number;
  revenue_attributed: number;
}

export interface CommunicationEvent {
  eventId: string;
  campaignId: string;
  customerId: string;
  status: 'sent' | 'delivered' | 'opened' | 'clicked' | 'failed';
  timestamp: string;
}

export interface RecentActivityItem {
  id: string;
  type: 'trigger' | 'interaction' | 'conversion' | 'failed';
  campaignId?: string;
  campaignName?: string;
  customerId: string;
  customerName: string;
  channel?: 'whatsapp' | 'email' | 'sms' | 'rcs' | 'conversion';
  detail: string;
  status?: 'sent' | 'delivered' | 'opened' | 'clicked' | 'failed';
  timestamp: string;
}

export interface AnalyticsOverview {
  totalCustomers: number;
  activeCampaigns: number;
  avgDeliveryRate: number;
  avgCtr: number;
  messagesThisWeek: number;
  topChannel: string;
  topChannelRate: number;
  mostActiveSegment: string;
  mostActiveSegmentCount: number;
  messagesDeliveredPercent: number;
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

export function calculateCustomerHealth(customer: Customer) {
  // Static pivot reference representing current mock timestamp
  const now = new Date('2026-06-11T07:45:01-07:00');
  const lastOrdered = new Date(customer.lastOrderDate);
  const diffMs = Math.abs(now.getTime() - lastOrdered.getTime());
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  // 1. Recency points (scale out of 40)
  let recencyPoints = 40;
  if (diffDays > 90) {
    recencyPoints = 5;
  } else if (diffDays > 60) {
    recencyPoints = 12;
  } else if (diffDays > 30) {
    recencyPoints = 22;
  } else if (diffDays > 14) {
    recencyPoints = 32;
  }

  // 2. Frequency score (scale out of 30)
  const frequencyPoints = Math.min(30, customer.orderCount * 8);

  // 3. Monetary score (scale out of 30): normalize around high ltv spent of ₹15,000
  const monetaryPoints = Math.min(30, Math.round((customer.totalSpent / 15000) * 30));

  const healthScore = Math.max(0, Math.min(100, recencyPoints + frequencyPoints + monetaryPoints));
  
  // Engagement Score is weighted heavily on order counts and frequency
  const engagementScore = Math.max(0, Math.min(100, Math.round((customer.orderCount * 12) + (recencyPoints * 1.4))));

  let churnRisk: 'Low' | 'Medium' | 'High' = 'Low';
  if (diffDays > 60 || healthScore < 42) {
    churnRisk = 'High';
  } else if (diffDays > 30 || healthScore < 72) {
    churnRisk = 'Medium';
  }

  return {
    healthScore,
    engagementScore,
    churnRisk
  };
}

export interface AIInsightItem {
  id: string;
  category: 'churn' | 'revenue' | 'channel' | 'open_rate' | 'conversion';
  title: string;
  description: string;
  impact: string;
  trend: 'up' | 'down' | 'neutral';
  actionLabel?: string;
}

export interface CampaignPrediction {
  predictedReach: number;
  openRate: number;
  conversionRate: number;
  predictedRevenue: number;
  explanation: string;
}
