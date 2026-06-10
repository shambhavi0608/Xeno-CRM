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
