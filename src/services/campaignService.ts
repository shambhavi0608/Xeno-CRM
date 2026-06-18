/**
 * 1. FILE NAME: src/services/campaignService.ts
 * 
 * 2. COMPLETE CODE / DESCRIPTION:
 * High-performance, strictly-typed domain service that abstracts standard Firestore operations 
 * and custom server endpoints for auditing, creating, predicting, and launching Mochi Campaigns.
 */

// 3. IMPORTS
import { 
  fetchCampaigns, 
  fetchCampaignById, 
  createCampaign, 
  launchCampaign, 
  deleteCampaign, 
  predictCampaign 
} from '../lib/api.js';
import { Campaign, CampaignPrediction } from '../types/index.js';

// 5. TYPES & DTOs
export interface LaunchCampaignResponse {
  success: boolean;
  campaign: Campaign;
}

export interface PredictionPayload {
  matchedCount: number;
  channel: 'whatsapp' | 'email' | 'sms' | 'rcs' | string;
  message: string;
  audiencePrompt: string;
}

// 4. EXPORTS & IMPLEMENTATION
export const campaignService = {
  /**
   * 6. FIRESTORE QUERY REFERENCE:
   * Collection: /users/{uid}/campaigns
   * Retrieve list of corporate campaigns.
   */
  async list(): Promise<Campaign[]> {
    // 7. ERROR HANDLING
    try {
      return await fetchCampaigns();
    } catch (error) {
      console.error('[campaignService.list] Failed to fetch campaign documents:', error);
      throw new Error('Could not retrieve campaign logs from database.');
    }
  },

  /**
   * 6. FIRESTORE QUERY REFERENCE:
   * Document: /users/{uid}/campaigns/{id}
   * Inspect a customized campaign by its specific Firestore document ID.
   */
  async get(id: string): Promise<Campaign> {
    // 7. ERROR HANDLING
    try {
      if (!id) throw new Error('Campaign ID is required');
      const campaign = await fetchCampaignById(id);
      if (!campaign) {
        throw new Error(`Campaign with ID ${id} not found.`);
      }
      return campaign;
    } catch (error) {
      console.error(`[campaignService.get] Error fetching campaign ${id}:`, error);
      throw new Error(`Permission denied or campaign not found: ${id}`);
    }
  },

  /**
   * 6. FIRESTORE QUERY REFERENCE:
   * Document: /users/{uid}/campaigns/{random_id} (write operation)
   * Create a new campaign draft template with custom audience heuristics.
   */
  async create(campaignSubset: Partial<Campaign>): Promise<Campaign> {
    // 7. ERROR HANDLING
    try {
      if (!campaignSubset.name) throw new Error('Campaign Name is required');
      if (!campaignSubset.message) throw new Error('Campaign message template is required');
      return await createCampaign(campaignSubset);
    } catch (error) {
      console.error('[campaignService.create] Failed to create campaign template:', error);
      throw new Error('Database insertion rejected. Check your profile settings.');
    }
  },

  /**
   * 6. FIRESTORE QUERY REFERENCE:
   * Document: /users/{uid}/campaigns/{id} (delete operation)
   * Delete specific campaign archives.
   */
  async delete(id: string): Promise<void> {
    // 7. ERROR HANDLING
    try {
      if (!id) throw new Error('Campaign ID is required for deletion');
      await deleteCampaign(id);
    } catch (error) {
      console.error(`[campaignService.delete] Failed to delete campaign ${id}:`, error);
      throw new Error('Deletion operation failed. Verify write permissions on campaign documents.');
    }
  },

  /**
   * 6. FIRESTORE QUERY REFERENCE:
   * Document: /users/{uid}/campaigns/{id} (write operation)
   * Dispatches dispatch simulation webhooks over the background pipeline, updating metrics.
   */
  async launch(id: string): Promise<LaunchCampaignResponse> {
    // 7. ERROR HANDLING
    try {
      if (!id) throw new Error('Campaign ID is required for dispatching');
      const result = await launchCampaign(id);
      return result as LaunchCampaignResponse;
    } catch (error) {
      console.error(`[campaignService.launch] Campaign deployment crashed for ID ${id}:`, error);
      throw new Error('Unable to deploy campaign. Check telemetry rules and try again.');
    }
  },

  /**
   * 6. API QUERY REFERENCE:
   * Endpoint: /api/campaigns/predict (or fallback model metrics)
   * Fetch advanced statistics, open rates, Conversion Rates, and expected Revenue indices.
   */
  async predict(params: PredictionPayload): Promise<CampaignPrediction> {
    // 7. ERROR HANDLING
    try {
      if (!params || params.matchedCount === undefined) {
        throw new Error('Prediction parameters are invalid.');
      }
      return await predictCampaign(params);
    } catch (error) {
      console.error('[campaignService.predict] Analytics projection failed:', error);
      return {
        predictedReach: params.matchedCount || 0,
        openRate: 85,
        conversionRate: 12,
        predictedRevenue: (params.matchedCount || 0) * 1500 * 0.12,
        explanation: 'Default deterministic projection fallback activated after pipeline trace.'
      };
    }
  }
};
