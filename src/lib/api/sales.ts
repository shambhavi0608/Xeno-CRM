import { 
  SalesAgentResponse
} from '../../types/index.js';
import { db } from '../firebase.js';
import { 
  doc, 
  getDoc, 
  setDoc
} from 'firebase/firestore';
import { isDemoMode, getUid } from './auth.js';
import { initLocalDemoStorage } from './demo.js';

const API_BASE = '/api';

function generateMockSalesResponse(type: 'find-buyers' | 'strategy' | 'followup', customerId?: string): SalesAgentResponse {
  const localCustomers = JSON.parse(localStorage.getItem('xeno_demo_customers') || '[]');
  
  let targetCustomers = [];
  if (customerId) {
    const customer = localCustomers.find((c: any) => c.id === customerId);
    if (customer) {
      targetCustomers.push({
        id: customer.id,
        name: customer.name,
        email: customer.email,
        health: customer.tags?.includes('inactive') ? 'At Risk' : 'Healthy',
        preferredChannel: customer.tags?.includes('sms') ? 'SMS' : customer.tags?.includes('whatsapp') ? 'WhatsApp' : 'Email',
      });
    }
  } else {
    targetCustomers = localCustomers.slice(0, 3).map((c: any) => ({
      id: c.id,
      name: c.name,
      email: c.email,
      health: c.tags?.includes('inactive') ? 'At Risk' : 'Healthy',
      preferredChannel: 'Email',
    }));
  }

  let reason = '';
  let predictedRevenue = 0;
  let recommendedCampaign = '';
  let email = '';
  let whatsapp = '';

  if (type === 'find-buyers') {
    reason = "Telemetry shows customers showing high purchase frequency or solid cart engagement. Ideal targets for premium campaigns.";
    predictedRevenue = 28500;
    recommendedCampaign = "VIP Micro-Lot Beans Exclusive Release";
    email = `Subject: First-Access Request: Fresh Micro-Lot Beans just landed at Mochi!\n\nDear Brewer,\n\nWe noticed your taste for fine coffee. As one of our top connoisseurs, we've secured a bag of our new single-origin micro-lot just for you. Use code VIPFRESH for 20% off.`;
    whatsapp = "Hey *Brewer*! ☕ Your taste for premium coffee makes you eligible for early access to our brand new micro-lot single-origin beans. Use code VIPFRESH for 20% off!";
  } else if (type === 'strategy') {
    reason = "Targeting premium segments with slipping churn risk signals. Proposes loyalty reinforcement to mitigate churn.";
    predictedRevenue = 14500;
    recommendedCampaign = "Loyalty & Retention Premium Rewards Campaign";
    email = `Subject: Grab your custom reward inside (Fresh coffee awaits!)\n\nHi there,\n\nWe want to appreciate your loyalty. We are adding an extra 100 loyalty points to your balance, plus a special 15% discount valid for the next 7 days. Code: REWARD15.`;
    whatsapp = "Hello from Mochi! ☕ We've added an extra 100 loyalty points to your profile + a custom 15% voucher *REWARD15* valid for standard premium coffee blends!";
  } else {
    reason = "Subtle follow-up targeting warm and dormant interaction signals to reinforce brand presence and trigger conversions.";
    predictedRevenue = 11200;
    recommendedCampaign = "Personalized Win-Back Engagement Outreach";
    email = `Subject: Fresh beans are roasting - Grab a special treat!\n\nHi brewer,\n\nWe haven't seen you in a while, but our roasters have been busy. Complete an order within the next 48 hours and we'll add a complimentary handcrafted canvas tote bag. Code: GIVETOTE.`;
    whatsapp = "Hey! ☕ Fresh roasts are waiting in the Mochi kitchen. Order within 48h to secure a free handcrafted canvas tote with code: GIVETOTE!";
  }

  return {
    customers: targetCustomers,
    reason,
    predictedRevenue,
    recommendedCampaign,
    email,
    whatsapp
  };
}

export async function fetchFindBuyers(customerId?: string): Promise<SalesAgentResponse> {
  if (isDemoMode()) {
    initLocalDemoStorage();
    return generateMockSalesResponse('find-buyers', customerId);
  }

  const res = await fetch(`${API_BASE}/ai/sales/find-buyers`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ customerId })
  });
  if (!res.ok) throw new Error('Failed to find potential sales buyers');
  return res.json();
}

export async function fetchSalesStrategy(customerId?: string): Promise<SalesAgentResponse> {
  if (isDemoMode()) {
    initLocalDemoStorage();
    return generateMockSalesResponse('strategy', customerId);
  }

  const res = await fetch(`${API_BASE}/ai/sales/strategy`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ customerId })
  });
  if (!res.ok) throw new Error('Failed to generate sales strategy');
  return res.json();
}

export async function fetchSalesFollowup(customerId?: string): Promise<SalesAgentResponse> {
  if (isDemoMode()) {
    initLocalDemoStorage();
    return generateMockSalesResponse('followup', customerId);
  }

  const res = await fetch(`${API_BASE}/ai/sales/followup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ customerId })
  });
  if (!res.ok) throw new Error('Failed to generate sales follow-up pitch');
  return res.json();
}
