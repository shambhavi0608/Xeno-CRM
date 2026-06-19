/**
 * src/services/aiSalesAgentService.ts
 * 
 * High-performance domain service managing the CRM AI Sales Agent.
 * Integrates directly with core telemetry and Gemini-powered micro-analysis.
 */

import { 
  fetchFindBuyers,
  fetchSalesStrategy,
  fetchSalesFollowup
} from '../lib/api.js';
import { SalesAgentResponse } from '../types/index.js';

export const aiSalesAgentService = {
  /**
   * Executes AI analysis to find high-propensity buyers across customer history.
   */
  async findPotentialBuyers(customerId?: string): Promise<SalesAgentResponse> {
    try {
      return await fetchFindBuyers(customerId);
    } catch (error) {
      console.error('[aiSalesAgentService.findPotentialBuyers] Error:', error);
      throw error;
    }
  },

  /**
   * Predicts highest-performing or highest-value customer profiles prone to buying.
   */
  async predictBestCustomers(customerId?: string): Promise<SalesAgentResponse> {
    try {
      // Re-uses find-buyers with predicted attributes
      return await fetchFindBuyers(customerId);
    } catch (error) {
      console.error('[aiSalesAgentService.predictBestCustomers] Error:', error);
      throw error;
    }
  },

  /**
   * Generates a fully localized sales strategy from purchasing and behavioral attributes.
   */
  async generateSalesStrategy(customerId?: string): Promise<SalesAgentResponse> {
    try {
      return await fetchSalesStrategy(customerId);
    } catch (error) {
      console.error('[aiSalesAgentService.generateSalesStrategy] Error:', error);
      throw error;
    }
  },

  /**
   * Formulates follow-up pitches or engagement scripts targeting warm leads.
   */
  async generateFollowup(customerId?: string): Promise<SalesAgentResponse> {
    try {
      return await fetchSalesFollowup(customerId);
    } catch (error) {
      console.error('[aiSalesAgentService.generateFollowup] Error:', error);
      throw error;
    }
  },

  /**
   * Utility helper resolving a pure WhatsApp-compatible micro-pitch string.
   */
  async generateWhatsAppPitch(customerId?: string): Promise<string> {
    try {
      const response = await fetchSalesStrategy(customerId);
      return response.whatsapp || '';
    } catch (error) {
      console.error('[aiSalesAgentService.generateWhatsAppPitch] Error:', error);
      return 'Fresh micro-lot single origins have arrived! Reach out directly to secure your bag!';
    }
  },

  /**
   * Utility helper resolving a pure, beautifully composed Email-compatible pitch.
   */
  async generateEmailPitch(customerId?: string): Promise<string> {
    try {
      const response = await fetchSalesStrategy(customerId);
      return response.email || '';
    } catch (error) {
      console.error('[aiSalesAgentService.generateEmailPitch] Error:', error);
      return 'Subject: New specialty coffees just arrived!\n\nGrab your exclusive single-origin micro-lot before slots run out.';
    }
  }
};
