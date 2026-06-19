/**
 * src/services/revenueForecastService.ts
 * 
 * High-performance domain service managing the Customer AI Revenue Forecast Engine.
 */

import { 
  fetchCustomerForecast, 
  triggerGenerateForecast, 
  fetchMonthlyForecasts, 
  fetchQuarterlyForecasts 
} from '../lib/api.js';
import { RevenueForecast } from '../types/index.js';

export const revenueForecastService = {
  /**
   * Triggers or triggers updates of customer AI revenue forecast over Gemini.
   */
  async generateForecast(customerId: string): Promise<RevenueForecast> {
    try {
      if (!customerId) throw new Error('Customer ID is required');
      return await triggerGenerateForecast(customerId);
    } catch (error) {
      console.error(`[revenueForecastService.generateForecast] Failed for customer ${customerId}:`, error);
      throw error;
    }
  },

  /**
   * Resolves the forecast for a single customer.
   */
  async getForecast(customerId: string): Promise<RevenueForecast> {
    try {
      if (!customerId) throw new Error('Customer ID is required');
      return await fetchCustomerForecast(customerId);
    } catch (error) {
      console.error(`[revenueForecastService.getForecast] Failed for customer ${customerId}:`, error);
      throw error;
    }
  },

  /**
   * Retrieves aggregated monthly forecast dataset.
   */
  async getMonthlyForecast(): Promise<any[]> {
    try {
      return await fetchMonthlyForecasts();
    } catch (error) {
      console.error('[revenueForecastService.getMonthlyForecast] Failed to fetch:', error);
      return [];
    }
  },

  /**
   * Retrieves aggregated quarterly forecast dataset.
   */
  async getQuarterlyForecast(): Promise<any[]> {
    try {
      return await fetchQuarterlyForecasts();
    } catch (error) {
      console.error('[revenueForecastService.getQuarterlyForecast] Failed to fetch:', error);
      return [];
    }
  }
};
