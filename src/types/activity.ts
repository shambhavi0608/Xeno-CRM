export interface CommunicationEvent {
  eventId: string;
  campaignId: string;
  customerId: string;
  status: 'sent' | 'delivered' | 'opened' | 'clicked' | 'failed';
  timestamp: string;
}

export interface RecentActivityItem {
  id: string;
  type: 'trigger' | 'interaction' | 'conversion' | 'failed' | 'system' | 'custom';
  campaignId?: string;
  campaignName?: string;
  customerId: string;
  customerName: string;
  channel?: 'whatsapp' | 'email' | 'sms' | 'rcs' | 'conversion';
  detail: string;
  text?: string; // fallback field
  status?: 'sent' | 'delivered' | 'opened' | 'clicked' | 'failed';
  timestamp: string;
}
