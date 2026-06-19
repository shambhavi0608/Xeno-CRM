/**
 * 1. FILE NAME: src/services/aiCustomerService.ts
 * 
 * 2. COMPLETE CODE / DESCRIPTION:
 * High-performance domain service that manages the Customer AI Brain.
 */

// 3. IMPORTS
import { fetchCustomerAIProfile, generateCustomerAIProfile } from '../lib/api.js';
import { CustomerAIProfile } from '../types/index.js';

// 4. EXPORTS & IMPLEMENTATION
export const aiCustomerService = {
  /**
   * 6. FIRESTORE QUERY REFERENCE:
   * Document: /users/{uid}/customer_ai_profiles/{customerId}
   * Fetches the Customer AI Profile from the database.
   */
  async getAIProfile(customerId: string): Promise<CustomerAIProfile> {
    // 7. ERROR HANDLING
    try {
      if (!customerId) throw new Error('Customer ID is required');
      return await fetchCustomerAIProfile(customerId);
    } catch (error) {
      console.error(`[aiCustomerService.getAIProfile] Failed for ID ${customerId}:`, error);
      throw new Error(`Could not access AI profile for customer ID: ${customerId}`);
    }
  },

  /**
   * 6. API TRANSACTION REFERENCE:
   * Endpoint: POST /api/customers/:id/generate-ai-profile
   * Triggers generation and saves the newly calculated Customer AI Brain to database.
   */
  async generateAIProfile(customerId: string): Promise<CustomerAIProfile> {
    // 7. ERROR HANDLING
    try {
      if (!customerId) throw new Error('Customer ID is required');
      return await generateCustomerAIProfile(customerId);
    } catch (error) {
      console.error(`[aiCustomerService.generateAIProfile] Failed to generate for ID ${customerId}:`, error);
      throw new Error(`Failed to generate new AI brain profile for customer ID: ${customerId}`);
    }
  },

  /**
   * Extract predicted churn state for standard UI wrappers
   */
  async predictChurn(customerId: string): Promise<'LOW' | 'MEDIUM' | 'HIGH'> {
    try {
      const profile = await this.getAIProfile(customerId);
      return profile.churnRisk;
    } catch (error) {
      console.error(`[aiCustomerService.predictChurn] Failed for ID ${customerId}:`, error);
      return 'LOW';
    }
  },

  /**
   * Extract predicted lifecycle revenue yield
   */
  async predictRevenue(customerId: string): Promise<number> {
    try {
      const profile = await this.getAIProfile(customerId);
      return profile.predictedRevenue;
    } catch (error) {
      console.error(`[aiCustomerService.predictRevenue] Failed for ID ${customerId}:`, error);
      return 0;
    }
  },

  /**
   * Extract predicted next purchase event description
   */
  async predictNextPurchase(customerId: string): Promise<string> {
    try {
      const profile = await this.getAIProfile(customerId);
      return profile.nextPurchasePrediction;
    } catch (error) {
      console.error(`[aiCustomerService.predictNextPurchase] Failed for ID ${customerId}:`, error);
      return 'Expected in 14 days';
    }
  }
};
