import { 
  RevenueForecast,
  CompactForecastResponse
} from '../../types/index.js';
import { db } from '../firebase.js';
import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  setDoc
} from 'firebase/firestore';
import { isDemoMode, getUid } from './auth.js';
import { initLocalDemoStorage } from './demo.js';

const API_BASE = '/api';

// Private helper to create stunning, realistic customer AI Revenue Forecasts
function generateMockForecast(customerId: string): RevenueForecast {
  const localCustomers = JSON.parse(localStorage.getItem('xeno_demo_customers') || '[]');
  const customer = localCustomers.find((c: any) => c.id === customerId);
  const name = customer ? customer.name : 'Customer';
  const spent = customer ? customer.totalSpent : 5000;
  const count = customer ? customer.orderCount : 3;

  const aov = spent / Math.max(1, count);
  let predictedRevenue = Math.round(aov * 1.1);
  let growthPercentage = 8.5;
  let confidence = 88;
  let reason = `${name} has a high average order value of ₹${Math.round(aov)}. Engagement shows stable growth with consistent recent purchases.`;

  if (customer && customer.tags.includes('at-risk')) {
    predictedRevenue = Math.round(aov * 0.4);
    growthPercentage = -35.0;
    confidence = 65;
    reason = `Dormancy alert: ${name} exhibits declining transaction velocity. Significant promo outreach needed to reclaim next month volume.`;
  } else if (customer && customer.tags.includes('inactive')) {
    predictedRevenue = 0;
    growthPercentage = -100.0;
    confidence = 50;
    reason = `Customer has lapsed beyond replenishment window. Revenue flow is blocked until strong discount or manual win-back is delivered.`;
  } else if (customer && customer.totalSpent > 15000) {
    predictedRevenue = Math.round(aov * 1.35);
    growthPercentage = 22.4;
    confidence = 94;
    reason = `High-tier repeat pattern: ${name} is heavily incentivized by Summer Launch conversions, signaling high quarterly replenishment potential.`;
  }

  return {
    customerId,
    month: '2026-07',
    predictedRevenue,
    growthPercentage,
    confidence,
    reason,
    generatedAt: new Date().toISOString()
  };
}

// 1. GET FORECAST FOR CUSTOMER
export async function fetchCustomerForecast(id: string): Promise<RevenueForecast> {
  if (isDemoMode()) {
    initLocalDemoStorage();
    const localForecasts: RevenueForecast[] = JSON.parse(localStorage.getItem('xeno_demo_revenue_forecasts') || '[]');
    let forecast = localForecasts.find(f => f.customerId === id);
    if (!forecast) {
      forecast = generateMockForecast(id);
      localForecasts.push(forecast);
      localStorage.setItem('xeno_demo_revenue_forecasts', JSON.stringify(localForecasts));
    }
    return forecast;
  }

  const uid = getUid();
  if (uid) {
    try {
      const forecastDocRef = doc(db, 'users', uid, 'revenue_forecasts', id);
      const snap = await getDoc(forecastDocRef);
      if (snap.exists()) {
        const data = snap.data();
        return {
          ...data,
          generatedAt: data.generatedAt?.toDate ? data.generatedAt.toDate().toISOString() : data.generatedAt
        } as RevenueForecast;
      }
    } catch (err) {
      console.warn('Failed to fetch Forecast from firestore directly, placing server fallback', err);
    }
  }

  // Server Fallback
  const res = await fetch(`${API_BASE}/revenue/forecast/${id}`);
  if (!res.ok) throw new Error('Failed to fetch customer revenue forecast');
  return res.json();
}

// 2. GENERATE FORECAST FOR CUSTOMER
export async function triggerGenerateForecast(id: string): Promise<RevenueForecast> {
  if (isDemoMode()) {
    initLocalDemoStorage();
    const localForecasts: RevenueForecast[] = JSON.parse(localStorage.getItem('xeno_demo_revenue_forecasts') || '[]');
    const idx = localForecasts.findIndex(f => f.customerId === id);
    
    const forecast = generateMockForecast(id);
    if (idx !== -1) {
      localForecasts[idx] = forecast;
    } else {
      localForecasts.push(forecast);
    }
    localStorage.setItem('xeno_demo_revenue_forecasts', JSON.stringify(localForecasts));
    return forecast;
  }

  const uid = getUid();
  const res = await fetch(`${API_BASE}/revenue/generate/${id}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  });
  if (!res.ok) throw new Error('Failed to generate revenue forecast on server');
  const serverForecast: RevenueForecast = await res.json();

  if (uid && serverForecast) {
    try {
      const forecastDocRef = doc(db, 'users', uid, 'revenue_forecasts', id);
      await setDoc(forecastDocRef, {
        ...serverForecast,
        generatedAt: new Date(serverForecast.generatedAt).toISOString()
      });
    } catch (err) {
      console.error('Failed to sync generated forecast to Cloud Firestore:', err);
    }
  }

  return serverForecast;
}

// 3. GET MONTHLY AGGREGATE FORECAST
export async function fetchMonthlyForecasts(): Promise<any[]> {
  if (isDemoMode()) {
    initLocalDemoStorage();
    // Simulate smart aggregate predictions for the dashboard
    return [
      { month: 'Jul 2026', predictedRevenue: 78500, growthPercentage: 11.2, confidence: 88 },
      { month: 'Aug 2026', predictedRevenue: 84600, growthPercentage: 7.7, confidence: 85 },
      { month: 'Sep 2026', predictedRevenue: 92400, growthPercentage: 9.2, confidence: 82 },
      { month: 'Oct 2026', predictedRevenue: 89000, growthPercentage: -3.6, confidence: 80 },
      { month: 'Nov 2026', predictedRevenue: 105800, growthPercentage: 18.8, confidence: 78 },
      { month: 'Dec 2026', predictedRevenue: 124000, growthPercentage: 17.2, confidence: 84 }
    ];
  }

  const res = await fetch(`${API_BASE}/revenue/monthly`);
  if (!res.ok) throw new Error('Failed to fetch monthly forecasts');
  return res.json();
}

// 4. GET QUARTERLY AGGREGATE FORECAST
export async function fetchQuarterlyForecasts(): Promise<any[]> {
  if (isDemoMode()) {
    initLocalDemoStorage();
    return [
      { quarter: 'Q3 2026', predictedRevenue: 255500, growthPercentage: 12.8, confidence: 85 },
      { quarter: 'Q4 2026', predictedRevenue: 318800, growthPercentage: 24.7, confidence: 80 },
      { quarter: 'Q1 2027', predictedRevenue: 271200, growthPercentage: -14.9, confidence: 72 },
      { quarter: 'Q2 2027', predictedRevenue: 345000, growthPercentage: 27.2, confidence: 76 }
    ];
  }

  const res = await fetch(`${API_BASE}/revenue/quarterly`);
  if (!res.ok) throw new Error('Failed to fetch quarterly forecasts');
  return res.json();
}
