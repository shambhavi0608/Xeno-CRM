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
  const now = new Date('2026-06-12T07:16:58-07:00');
  const lastOrdered = new Date(customer.lastOrderDate);
  const diffMs = Math.abs(now.getTime() - lastOrdered.getTime());
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  // Recency Score (0 - 100): 100 if ordered today, declining daily
  const recency = Math.max(0, 100 - diffDays);

  // Frequency Score (0 - 100): Maxed at 10 orders
  const frequency = Math.min(100, customer.orderCount * 10);

  // Spend Score (0 - 100): Normalized around ₹10,000 spend
  const spend = Math.min(100, Math.round((customer.totalSpent / 10000) * 100));

  // Engagement Score (out of 100)
  const engagement = Math.max(0, Math.min(100, Math.round((customer.orderCount * 6) + (100 - diffDays * 0.5))));

  // RFM-weighted Health Score = (0.4 * Recency) + (0.3 * Frequency) + (0.2 * Spend) + (0.1 * Engagement)
  const healthScore = Math.max(0, Math.min(100, Math.round(
    (0.4 * recency) + 
    (0.3 * frequency) + 
    (0.2 * spend) + 
    (0.1 * engagement)
  )));

  let churnRisk: 'Low' | 'Medium' | 'High' = 'Low';
  if (healthScore < 40) {
    churnRisk = 'High';
  } else if (healthScore < 70) {
    churnRisk = 'Medium';
  }

  return {
    healthScore,
    engagementScore: engagement,
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
