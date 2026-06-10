import { 
  Customer, 
  Order, 
  Campaign, 
  AnalyticsOverview, 
  AISuggestion, 
  AIMessages,
  RecentActivityItem
} from '../types/index.js';

const API_BASE = '/api';

export async function fetchCustomers(search = '', tag = 'all'): Promise<Customer[]> {
  const params = new URLSearchParams();
  if (search) params.append('search', search);
  if (tag) params.append('tag', tag);
  
  const res = await fetch(`${API_BASE}/customers?${params.toString()}`);
  if (!res.ok) throw new Error('Failed to fetch customers');
  return res.json();
}

export async function fetchCustomerDetails(id: string): Promise<{ customer: Customer; orders: Order[] }> {
  const res = await fetch(`${API_BASE}/customers/${id}`);
  if (!res.ok) throw new Error('Failed to fetch customer details');
  return res.json();
}

export async function fetchCampaigns(status = 'all'): Promise<Campaign[]> {
  const res = await fetch(`${API_BASE}/campaigns?status=${status}`);
  if (!res.ok) throw new Error('Failed to fetch campaigns');
  return res.json();
}

export async function fetchCampaignById(id: string): Promise<Campaign> {
  const res = await fetch(`${API_BASE}/campaigns/${id}`);
  if (!res.ok) throw new Error('Failed to fetch campaign');
  return res.json();
}

export async function createCampaign(campaignData: Partial<Campaign>): Promise<Campaign> {
  const res = await fetch(`${API_BASE}/campaigns`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(campaignData)
  });
  if (!res.ok) throw new Error('Failed to create campaign');
  return res.json();
}

export async function launchCampaign(id: string): Promise<{ success: boolean; campaign: Campaign }> {
  const res = await fetch(`${API_BASE}/campaigns/${id}/launch`, { method: 'POST' });
  if (!res.ok) throw new Error('Failed to launch campaign');
  return res.json();
}

export async function fetchOverviewAnalytics(): Promise<AnalyticsOverview> {
  const res = await fetch(`${API_BASE}/analytics/overview`);
  if (!res.ok) throw new Error('Failed to fetch overview analytics');
  return res.json();
}

export async function suggestSegment(prompt: string): Promise<AISuggestion> {
  const res = await fetch(`${API_BASE}/segment/suggest`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt })
  });
  if (!res.ok) throw new Error('Failed to query AI segmentation engine');
  return res.json();
}

export async function generateAICopy(goal: string, audienceExplanation = ''): Promise<AIMessages> {
  const res = await fetch(`${API_BASE}/campaigns/generate-copy`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ goal, audienceExplanation })
  });
  if (!res.ok) throw new Error('Failed to generate AI personalization copy');
  return res.json();
}

export async function ingestCustomerData(payload: { customers?: any[]; orders?: any[] }): Promise<any> {
  const res = await fetch(`${API_BASE}/ingest`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!res.ok) throw new Error('Failed to ingest custom customer data');
  return res.json();
}

export async function resetDemoDb(): Promise<any> {
  const res = await fetch(`${API_BASE}/reset-demo`, { method: 'POST' });
  if (!res.ok) throw new Error('Failed to reset demo database');
  return res.json();
}

export async function fetchRecentActivity(): Promise<RecentActivityItem[]> {
  const res = await fetch(`${API_BASE}/analytics/activity`);
  if (!res.ok) throw new Error('Failed to fetch recent activity feed');
  return res.json();
}
