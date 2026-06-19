import { 
  CustomerChurnPrediction,
  ChurnDashboardData
} from '../../types/index.js';
import { db } from '../firebase.js';
import { 
  doc, 
  getDoc, 
  setDoc,
  collection,
  getDocs
} from 'firebase/firestore';
import { isDemoMode, getUid } from './auth.js';
import { initLocalDemoStorage } from './demo.js';

const API_BASE = '/api';

// Private helper to generate realistic, dynamic mock Churn Predictions for demo mode
function generateMockChurnPrediction(customerId: string): CustomerChurnPrediction {
  const localCustomers = JSON.parse(localStorage.getItem('xeno_demo_customers') || '[]');
  const customer = localCustomers.find((c: any) => c.id === customerId);
  const name = customer ? customer.name : 'Customer';
  
  let risk: 'LOW' | 'MEDIUM' | 'HIGH' = 'LOW';
  let score = 12;
  const reason = ['Consistent purchase history within standard 30-day window.', 'Receptive campaign email open rate with positive click indications.'];
  const recommendedActions = ['Enroll in exclusive priority loyalty program.', 'Deliver newsletters presenting luxury roasted bean selections.'];

  if (customer) {
    if (customer.tags.includes('inactive')) {
      risk = 'HIGH';
      score = 92;
      reason[0] = `Dormant state: No transaction activity logged for ${name} under the CRM.`;
      reason[1] = 'Extreme communication fatigue: Recurrent campaign alerts bypassed without open triggers.';
      recommendedActions[0] = 'Launch severe 30% discount win-back code COMEBACK.';
      recommendedActions[1] = 'A/B test direct SMS and WhatsApp outreach options.';
    } else if (customer.tags.includes('at-risk')) {
      risk = 'HIGH';
      score = 78;
      reason[0] = `Repurchase delay warning: Out of-bounds delay in shopping frequency.`;
      reason[1] = 'Explicit segmentation segment marker as at-risk under current cohort settings.';
      recommendedActions[0] = 'Apply temporary 15% incentive valid for coffee products.';
      recommendedActions[1] = 'Send high-relevance catalog item matches based on historical spending.';
    } else if (customer.orderCount <= 1) {
      risk = 'MEDIUM';
      score = 48;
      reason[0] = 'Onboarding friction: Only a single purchase record tracked since membership.';
      recommendedActions[0] = 'Deliver feedback survey checklist with supportive loyalty benefit info.';
      recommendedActions[1] = 'Provide introductory 10% coupon valid for 10 days.';
    }
  }

  return {
    customerId,
    risk,
    score,
    reason,
    recommendedActions,
    predictedAt: new Date().toISOString()
  };
}

// 1. GET CHURN PREDICTION FOR CUSTOMER
export async function fetchCustomerChurnPrediction(id: string): Promise<CustomerChurnPrediction> {
  if (isDemoMode()) {
    initLocalDemoStorage();
    const localPredictions: CustomerChurnPrediction[] = JSON.parse(localStorage.getItem('xeno_demo_churn_predictions') || '[]');
    let pred = localPredictions.find(p => p.customerId === id);
    if (!pred) {
      pred = generateMockChurnPrediction(id);
      localPredictions.push(pred);
      localStorage.setItem('xeno_demo_churn_predictions', JSON.stringify(localPredictions));
    }
    return pred;
  }

  const uid = getUid();
  if (uid) {
    try {
      // Look up and fetch directly from Firestore collection customer_churn_predictions under user account path
      const docRef = doc(db, 'users', uid, 'customer_churn_predictions', id);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const data = snap.data();
        return {
          ...data,
          predictedAt: data.predictedAt?.toDate ? data.predictedAt.toDate().toISOString() : data.predictedAt
        } as CustomerChurnPrediction;
      }
    } catch (err) {
      console.warn('Failed to fetch Churn Prediction from firestore directly, calling server API fallback', err);
    }
  }

  // Fallback to Server API
  const res = await fetch(`${API_BASE}/churn/${id}`);
  if (!res.ok) throw new Error('Failed to fetch customer churn prediction from server');
  return res.json();
}

// 2. GENERATE/REGENERATE CHURN PREDICTION FOR CUSTOMER
export async function triggerGenerateChurnPrediction(id: string): Promise<CustomerChurnPrediction> {
  if (isDemoMode()) {
    initLocalDemoStorage();
    const localPredictions: CustomerChurnPrediction[] = JSON.parse(localStorage.getItem('xeno_demo_churn_predictions') || '[]');
    const idx = localPredictions.findIndex(p => p.customerId === id);
    const pred = generateMockChurnPrediction(id);
    if (idx !== -1) {
      localPredictions[idx] = pred;
    } else {
      localPredictions.push(pred);
    }
    localStorage.setItem('xeno_demo_churn_predictions', JSON.stringify(localPredictions));
    return pred;
  }

  const uid = getUid();
  const res = await fetch(`${API_BASE}/churn/generate/${id}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  });
  if (!res.ok) throw new Error('Failed to generate churn prediction with server engine');
  const serverPrediction: CustomerChurnPrediction = await res.json();

  if (uid && serverPrediction) {
    try {
      const docRef = doc(db, 'users', uid, 'customer_churn_predictions', id);
      await setDoc(docRef, {
        ...serverPrediction,
        predictedAt: new Date(serverPrediction.predictedAt).toISOString()
      });
    } catch (err) {
      console.error('Failed to sync generated churn prediction in Firestore:', err);
    }
  }

  return serverPrediction;
}

// 3. GET HIGH-RISK CUSTOMERS LIST
export async function fetchHighRiskChurnAlerts(): Promise<any[]> {
  if (isDemoMode()) {
    initLocalDemoStorage();
    const localCustomers = JSON.parse(localStorage.getItem('xeno_demo_customers') || '[]');
    const highRiskAlerts: any[] = [];
    for (const customer of localCustomers) {
      const pred = generateMockChurnPrediction(customer.id);
      if (pred.risk === 'HIGH') {
        highRiskAlerts.push({
          customerName: customer.name,
          customerEmail: customer.email,
          totalSpent: customer.totalSpent,
          orderCount: customer.orderCount,
          lastOrderDate: customer.lastOrderDate,
          tags: customer.tags,
          ...pred
        });
      }
    }
    return highRiskAlerts;
  }

  const res = await fetch(`${API_BASE}/churn/high-risk`);
  if (!res.ok) throw new Error('Failed to fetch high risk customer alerts');
  return res.json();
}

// 4. GET CHURN DASHBOARD METRICS
export async function fetchChurnDashboardMetrics(): Promise<ChurnDashboardData> {
  if (isDemoMode()) {
    initLocalDemoStorage();
    const localCustomers = JSON.parse(localStorage.getItem('xeno_demo_customers') || '[]');
    let totalScoreSum = 0;
    let highCount = 0;
    let mediumCount = 0;
    let lowCount = 0;
    
    for (const customer of localCustomers) {
      const pred = generateMockChurnPrediction(customer.id);
      totalScoreSum += pred.score;
      if (pred.risk === 'HIGH') highCount++;
      else if (pred.risk === 'MEDIUM') mediumCount++;
      else lowCount++;
    }

    const averageChurnScore = localCustomers.length > 0 ? (totalScoreSum / localCustomers.length) : 0;

    return {
      highRiskCount: highCount,
      mediumRiskCount: mediumCount,
      lowRiskCount: lowCount,
      averageChurnScore: Math.round(averageChurnScore * 10) / 10,
      topChurnFactors: [
        "Inactivity over 90 days",
        "Single-order purchase patterns",
        "High campaign digital fatigue"
      ]
    };
  }

  const res = await fetch(`${API_BASE}/churn/dashboard`);
  if (!res.ok) throw new Error('Failed to fetch churn dashboard analytics');
  return res.json();
}
