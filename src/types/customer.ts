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

export interface Customer360TimelineItem {
  id: string;
  type: 'sent' | 'opened' | 'responded' | 'order' | 'ai_recommendation';
  title: string;
  description: string;
  timestamp: string;
}

export interface Customer360Data {
  customer: Customer;
  company: string;
  status: 'active' | 'inactive' | 'dormant';
  health: {
    rfmScore: string;
    healthScore: number;
    churnRisk: 'Low' | 'Medium' | 'High';
    engagementScore: number;
  };
  revenue: {
    lifetimeValue: number;
    averageOrderValue: number;
    predictedRevenue: number;
    expectedGrowth: number;
  };
  aiInsight: {
    summary: string;
    behaviour: string;
    riskAnalysis: string;
    recommendedAction: string;
    upsellOpportunity: string;
  };
  timeline: Customer360TimelineItem[];
}

