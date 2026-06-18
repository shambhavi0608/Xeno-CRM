import { fetchCustomer360 } from '../lib/api.js';
import { Customer360Data } from '../types/index.js';

export const customer360Service = {
  /**
   * Fetches full customer 360 profile, including RFM score, health scores, churn prediction, LTV metrics, and timeline events
   */
  async get360(id: string): Promise<Customer360Data> {
    return fetchCustomer360(id);
  }
};
