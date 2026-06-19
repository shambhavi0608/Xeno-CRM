/**
 * src/services/simulationService.ts
 * 
 * Client SDK connecting to the Express AI Business Simulation Engine.
 * Predicts ROI, converted targets count, recovery potential, and associated risks.
 */

const API_BASE = '/api';

export interface SimulationParameters {
  discountPercent?: number;
  communicationChannel?: 'whatsapp' | 'email' | 'sms' | string;
  recipientSegment?: 'dormant' | 'all' | 'vip' | 'new_customer' | string;
  loyaltyBonusPoints?: number;
}

export interface SimulationResult {
  scenario: string;
  expectedRevenueINR: number;
  expectedCustomersReturned: number;
  expectedOpenRatePercent: number;
  roiPercent: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | string;
  riskRationale: string;
}

export const simulationService = {
  /**
   * Run simulation over custom query or distinct parameters
   */
  async runSimulation(params: SimulationParameters): Promise<SimulationResult> {
    const response = await fetch(`${API_BASE}/simulation/predict`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(params)
    });
    if (!response.ok) throw new Error('Simulation engine prediction run failed');
    return response.json();
  }
};
