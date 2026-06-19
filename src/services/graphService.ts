/**
 * src/services/graphService.ts
 * 
 * Manages Customer Knowledge Graph (Firestore 'customer_graph' or local state fallback).
 * Evaluates nodes representing Customers, Orders, Segments, Predicts, and Campaigns to form
 * semantic relationships and recommendations.
 */

import { isDemoMode, getUid } from '../lib/api/auth.js';
import { db, handleFirestoreError, OperationType } from '../lib/firebase.js';
import { doc, getDoc, setDoc } from 'firebase/firestore';

const API_BASE = '/api';

export interface GraphNode {
  id: string;
  label: string; // 'customer' | 'order' | 'product' | 'segment' | 'campaign'
  properties: any;
}

export interface GraphEdge {
  source: string;
  target: string;
  relationship: string; // 'BOUGHT', 'MEMBER_OF', 'TARGETED_BY', 'PREDICTS'
  weight?: number;
}

export interface CustomerGraph {
  customerId: string;
  nodes: GraphNode[];
  edges: GraphEdge[];
  lastBuilt: string;
}

const LOCAL_STORAGE_KEY_PREFIX = 'mochi_customer_graph_';

export const graphService = {
  /**
   * Loads customer graph structure
   */
  async getGraph(customerId: string): Promise<CustomerGraph | null> {
    if (isDemoMode()) {
      const stored = localStorage.getItem(`${LOCAL_STORAGE_KEY_PREFIX}${customerId}`);
      if (stored) {
        try {
          return JSON.parse(stored);
        } catch (_) {
          return null;
        }
      }
      return null;
    }

    const uid = getUid();
    if (!uid) {
      const res = await fetch(`${API_BASE}/graph/${customerId}`);
      if (!res.ok) return null;
      return res.json();
    }

    const path = `users/${uid}/customer_graph/${customerId}`;
    try {
      const docSnap = await getDoc(doc(db, 'users', uid, 'customer_graph', customerId));
      if (docSnap.exists()) {
        return docSnap.data() as CustomerGraph;
      }
      return null;
    } catch (e) {
      handleFirestoreError(e, OperationType.GET, path);
    }
  },

  /**
   * Saves customer graph
   */
  async saveGraph(customerId: string, graph: CustomerGraph): Promise<CustomerGraph> {
    if (isDemoMode()) {
      localStorage.setItem(`${LOCAL_STORAGE_KEY_PREFIX}${customerId}`, JSON.stringify(graph));
      return graph;
    }

    const uid = getUid();
    if (!uid) {
      const response = await fetch(`${API_BASE}/graph/build/${customerId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(graph)
      });
      if (!response.ok) throw new Error('Error saving graph on backend');
      return response.json();
    }

    const path = `users/${uid}/customer_graph/${customerId}`;
    try {
      await setDoc(doc(db, 'users', uid, 'customer_graph', customerId), graph);
      return graph;
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, path);
    }
  },

  /**
   * Re-builds local semantic nodes & relations
   */
  async buildGraph(customerId: string): Promise<CustomerGraph> {
    const res = await fetch(`${API_BASE}/graph/build`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ customerId })
    });
    if (!res.ok) throw new Error('Failed to generate customer knowledge graph node-map');
    const graphData = await res.json();
    return this.saveGraph(customerId, graphData);
  },

  /**
   * findSimilarCustomers()
   */
  async findSimilarCustomers(customerId: string): Promise<any> {
    const res = await fetch(`${API_BASE}/graph/similar/${customerId}`);
    if (!res.ok) throw new Error('Graph similarity query failed');
    return res.json();
  },

  /**
   * recommendProducts()
   */
  async recommendProducts(customerId: string): Promise<any> {
    const res = await fetch(`${API_BASE}/graph/recommendations/${customerId}`);
    if (!res.ok) throw new Error('Graph recommendation query failed');
    return res.json();
  },

  /**
   * recommendCampaigns()
   */
  async recommendCampaigns(customerId: string): Promise<any> {
    const response = await fetch(`${API_BASE}/graph/recommend-campaigns/${customerId}`);
    if (!response.ok) throw new Error('Graph campaign affinity recommendation query failed');
    return response.json();
  },

  /**
   * findVIPCustomers()
   */
  async findVIPCustomers(): Promise<any> {
    const res = await fetch(`${API_BASE}/graph/vip`);
    if (!res.ok) throw new Error('Graph VIP customers scan failed');
    return res.json();
  },

  /**
   * predictNextPurchase()
   */
  async predictNextPurchase(customerId: string): Promise<any> {
    const res = await fetch(`${API_BASE}/graph/predict-purchase/${customerId}`);
    if (!res.ok) throw new Error('Graph prediction query failed');
    return res.json();
  }
};
export const findSimilarCustomers = graphService.findSimilarCustomers;
export const recommendProducts = graphService.recommendProducts;
export const recommendCampaigns = graphService.recommendCampaigns;
export const findVIPCustomers = graphService.findVIPCustomers;
export const predictNextPurchase = graphService.predictNextPurchase;
