/**
 * src/services/multiAgentService.ts
 * 
 * Orchestrator Service and Client-Side SDK for running the Multi-Agent CRM System.
 * Connects directly to backend API routes and handles logs under Firestore collections.
 */

import { isDemoMode, getUid } from '../lib/api/auth.js';
import { db, handleFirestoreError, OperationType } from '../lib/firebase.js';
import { collection, doc, setDoc, getDocs, limit, query, orderBy } from 'firebase/firestore';
import { AIAgentLog } from '../types/agentLog.js';

const API_BASE = '/api';

function getAuthHeaders() {
  const uid = getUid();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json'
  };
  if (uid) {
    headers['Authorization'] = uid;
  }
  return headers;
}

export const multiAgentService = {
  /**
   * Triggers the SalesAgent execution on the Express backend server
   */
  async runSalesAgent(customerId?: string | null): Promise<any> {
    const response = await fetch(`${API_BASE}/agents/sales`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ customerId: customerId || null })
    });
    if (!response.ok) throw new Error('Sales agent execution failed');
    const result = await response.json();
    return result;
  },

  /**
   * Triggers the MarketingAgent execution on the Express backend server
   */
  async runMarketingAgent(customerId?: string | null): Promise<any> {
    const response = await fetch(`${API_BASE}/agents/marketing`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ customerId: customerId || null })
    });
    if (!response.ok) throw new Error('Marketing agent execution failed');
    const result = await response.json();
    return result;
  },

  /**
   * Triggers the CustomerSuccessAgent execution on the Express backend server
   */
  async runCustomerSuccessAgent(customerId?: string | null): Promise<any> {
    const response = await fetch(`${API_BASE}/agents/customer-success`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ customerId: customerId || null })
    });
    if (!response.ok) throw new Error('Customer success agent execution failed');
    const result = await response.json();
    return result;
  },

  /**
   * Triggers the RevenueAgent execution on the Express backend server
   */
  async runRevenueAgent(): Promise<any> {
    const response = await fetch(`${API_BASE}/agents/revenue`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({})
    });
    if (!response.ok) throw new Error('Revenue agent execution failed');
    const result = await response.json();
    return result;
  } ,

  /**
   * Triggers the AnalyticsAgent execution on the Express backend server
   */
  async runAnalyticsAgent(): Promise<any> {
    const response = await fetch(`${API_BASE}/agents/analytics`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({})
    });
    if (!response.ok) throw new Error('Analytics agent execution failed');
    const result = await response.json();
    return result;
  },

  /**
   * Run All Agents in parallel
   */
  async runAllAgents(): Promise<any> {
    const response = await fetch(`${API_BASE}/agents/run-all`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({})
    });
    if (!response.ok) throw new Error('Multi-agent composite team execution failed');
    const result = await response.json();
    return result;
  },

  /**
   * Helper to retrieve recent agent execution logs for user visual check
   */
  async getRecentAgentLogs(limitCount = 20): Promise<AIAgentLog[]> {
    if (isDemoMode()) {
      try {
        const raw = localStorage.getItem('mochi_agent_logs');
        if (raw) {
          return JSON.parse(raw).slice(0, limitCount);
        }
      } catch (e) {
        console.error('Error fetching local agent logs:', e);
      }
      return [];
    }

    const uid = getUid();
    if (!uid) return [];

    const collPath = `users/${uid}/ai_agents_logs`;
    try {
      const q = query(
        collection(db, 'users', uid, 'ai_agents_logs'),
        orderBy('createdAt', 'desc'),
        limit(limitCount)
      );
      const snap = await getDocs(q);
      const list: AIAgentLog[] = [];
      snap.forEach((docSnap) => {
        list.push({ id: docSnap.id, ...docSnap.data() } as AIAgentLog);
      });
      return list;
    } catch (e) {
      handleFirestoreError(e, OperationType.LIST, collPath);
    }
  }
};

// Export individual named service routines matching literal requested signatures
export const runSalesAgent = multiAgentService.runSalesAgent;
export const runMarketingAgent = multiAgentService.runMarketingAgent;
export const runCustomerSuccessAgent = multiAgentService.runCustomerSuccessAgent;
export const runRevenueAgent = multiAgentService.runRevenueAgent;
export const runAnalyticsAgent = multiAgentService.runAnalyticsAgent;
export const runAllAgents = multiAgentService.runAllAgents;
