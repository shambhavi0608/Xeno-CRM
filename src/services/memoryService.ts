/**
 * src/services/memoryService.ts
 * 
 * Manages Customer AI Memory persistence (Firestore 'customer_memory' or local storage fallback)
 * and deep Gemini cognitive analysis.
 */

import { db, handleFirestoreError, OperationType } from '../lib/firebase.js';
import { isDemoMode, getUid } from '../lib/api/auth.js';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { CustomerMemory } from '../types/customer_memory.js';

const LOCAL_STORAGE_KEY_PREFIX = 'mochi_customer_memory_';
const API_BASE = '/api';

export const memoryService = {
  /**
   * Loads a customer memory configuration
   */
  async getMemory(customerId: string): Promise<CustomerMemory | null> {
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
      // Direct call fallback via API
      const res = await fetch(`${API_BASE}/memory/${customerId}`);
      if (!res.ok) {
        if (res.status === 404) return null;
        throw new Error('Failed to fetch customer memory from backend');
      }
      return res.json();
    }

    const path = `users/${uid}/customer_memory/${customerId}`;
    try {
      const docSnap = await getDoc(doc(db, 'users', uid, 'customer_memory', customerId));
      if (docSnap.exists()) {
        return docSnap.data() as CustomerMemory;
      }
      return null;
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, path);
    }
  },

  /**
   * Saves customer memory
   */
  async saveMemory(customerId: string, memory: CustomerMemory): Promise<CustomerMemory> {
    const memoryData = {
      ...memory,
      customerId,
      lastUpdated: new Date().toISOString()
    };

    if (isDemoMode()) {
      localStorage.setItem(`${LOCAL_STORAGE_KEY_PREFIX}${customerId}`, JSON.stringify(memoryData));
      return memoryData;
    }

    const uid = getUid();
    if (!uid) {
      const response = await fetch(`${API_BASE}/memory/update/${customerId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(memoryData)
      });
      if (!response.ok) throw new Error('Failed to save memory via API');
      return response.json();
    }

    const path = `users/${uid}/customer_memory/${customerId}`;
    try {
      await setDoc(doc(db, 'users', uid, 'customer_memory', customerId), memoryData);
      return memoryData;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  },

  /**
   * Updates discrete entries in the memory catalog
   */
  async updateMemory(customerId: string, data: Partial<CustomerMemory>): Promise<CustomerMemory> {
    const existing = await this.getMemory(customerId) || {
      customerId,
      facts: [],
      preferences: [],
      communicationStyle: 'Professional',
      favoriteProducts: [],
      purchaseHabits: 'Occasional',
      importantEvents: [],
      summary: 'New customer profile initialized.',
      lastUpdated: new Date().toISOString()
    };

    const updated: CustomerMemory = {
      ...existing,
      ...data,
      customerId,
      lastUpdated: new Date().toISOString()
    };

    return this.saveMemory(customerId, updated);
  },

  /**
   * Calls AI to compute memory summary, favorites, habits, and preferences based on CRM data
   */
  async generateMemory(customerId: string): Promise<CustomerMemory> {
    const res = await fetch(`${API_BASE}/memory/generate/${customerId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    if (!res.ok) throw new Error('Error processing dynamic memory synthesis');
    const computed = await res.json();
    return this.saveMemory(customerId, computed);
  }
};
