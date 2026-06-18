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

export interface CampaignPrediction {
  predictedReach: number;
  openRate: number;
  conversionRate: number;
  predictedRevenue: number;
  explanation: string;
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

