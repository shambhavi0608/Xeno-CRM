/**
 * src/services/churnService.ts
 * 
 * High-performance domain service managing the Customer AI Churn Prediction Engine.
 */

import { 
  fetchCustomerChurnPrediction, 
  triggerGenerateChurnPrediction, 
  fetchHighRiskChurnAlerts, 
  fetchChurnDashboardMetrics 
} from '../lib/api.js';
import { CustomerChurnPrediction, ChurnDashboardData } from '../types/index.js';

export const churnService = {
  /**
   * Generates or fetches on-demand customer AI churn prediction over Gemini model.
   */
  async predictChurn(customerId: string): Promise<CustomerChurnPrediction> {
    try {
      if (!customerId) throw new Error('Customer ID is required');
      // POST generates, GET fetches fallback. Let's force trigger the generation to execute Gemini AI analysis
      return await triggerGenerateChurnPrediction(customerId);
    } catch (error) {
      console.error(`[churnService.predictChurn] Failed for customer ${customerId}:`, error);
      // Fallback: try fetching stored or calculated fallback prediction
      try {
        return await fetchCustomerChurnPrediction(customerId);
      } catch (innerError) {
        console.error(`[churnService.predictChurn] Fallback fetch also failed for ${customerId}:`, innerError);
        throw error;
      }
    }
  },

  /**
   * Retrieves the specific predictions cached for a customer without re-generating.
   */
  async getChurnPrediction(customerId: string): Promise<CustomerChurnPrediction> {
    try {
      if (!customerId) throw new Error('Customer ID is required');
      return await fetchCustomerChurnPrediction(customerId);
    } catch (error) {
      console.error(`[churnService.getChurnPrediction] Failed for customer ${customerId}:`, error);
      throw error;
    }
  },

  /**
   * Resolves the list of high churn-risk customers.
   */
  async getRiskCustomers(): Promise<any[]> {
    try {
      return await fetchHighRiskChurnAlerts();
    } catch (error) {
      console.error('[churnService.getRiskCustomers] Failed to fetch high-risk customers:', error);
      return [];
    }
  },

  /**
   * Retrieves aggregated churn risk dashboard statistics.
   */
  async getChurnDashboard(): Promise<ChurnDashboardData> {
    try {
      return await fetchChurnDashboardMetrics();
    } catch (error) {
      console.error('[churnService.getChurnDashboard] Failed to fetch dashboard statistics:', error);
      return {
        highRiskCount: 0,
        mediumRiskCount: 0,
        lowRiskCount: 0,
        averageChurnScore: 0,
        topChurnFactors: []
      };
    }
  }
};
