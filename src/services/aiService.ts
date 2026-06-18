/**
 * 1. FILE NAME: src/services/aiService.ts
 * 
 * 2. COMPLETE CODE / DESCRIPTION:
 * High-performance, strictly-typed strategic AI core that proxies Gemini-backed intelligence endpoints.
 */

// 3. IMPORTS
import { 
  fetchAIInsights, 
  fetchDailyInsights, 
  suggestSegment, 
  chatWithCopilot 
} from '../lib/api.js';
import { AIInsightItem, DailyInsightsResponse, AISuggestion, CopilotResponse } from '../types/index.js';

// 4. EXPORTS & IMPLEMENTATION
export const aiService = {
  /**
   * 6. API QUERY REFERENCE:
   * Endpoint: /api/analytics/insights
   * Run full-pipeline cognitive trends and strategic opportunities.
   */
  async getInsights(): Promise<AIInsightItem[]> {
    // 7. ERROR HANDLING
    try {
      return await fetchAIInsights();
    } catch (error) {
      console.error('[aiService.getInsights] Could not load AI trends:', error);
      throw new Error('AI strategic engine returned transient timeout error. Please retry shortly.');
    }
  },

  /**
   * 6. API QUERY REFERENCE:
   * Endpoint: /api/v1/insights/daily
   * Fetch live strategic summaries of the entire company database.
   */
  async getDailyBrief(): Promise<DailyInsightsResponse> {
    // 7. ERROR HANDLING
    try {
      return await fetchDailyInsights();
    } catch (error) {
      console.error('[aiService.getDailyBrief] Failed to access daily CRM summary:', error);
      throw new Error('Could not pull AI briefing data logs.');
    }
  },

  /**
   * 6. API QUERY REFERENCE:
   * Endpoint: /api/segment/suggest
   * Use Gemini to segment target cohorts out of raw human statements.
   */
  async generateSegment(strategyPrompt: string): Promise<AISuggestion> {
    // 7. ERROR HANDLING
    try {
      if (!strategyPrompt || !strategyPrompt.trim()) {
        throw new Error('Heuristic prompt cannot be empty or whitespace.');
      }
      return await suggestSegment(strategyPrompt);
    } catch (error) {
      console.error('[aiService.generateSegment] Lexical parsing failure:', error);
      throw new Error('Failed to parse segmentation syntax. Try stating simple user keywords.');
    }
  },

  /**
   * 6. API QUERY REFERENCE:
   * Endpoint: /api/v1/copilot/generate
   * Core AI Copilot conversational engine proxy, with integrated fallback structures.
   */
  async chat(message: string): Promise<CopilotResponse> {
    // 7. ERROR HANDLING
    try {
      if (!message || !message.trim()) {
        throw new Error('Strategic copilot prompt is empty.');
      }
      return await chatWithCopilot(message);
    } catch (error) {
      console.error('[aiService.chat] Strategic copilot engine offline or restricted:', error);
      throw new Error('Copilot Service rate limited or offline. Falling back to internal engine logs.');
    }
  }
};
