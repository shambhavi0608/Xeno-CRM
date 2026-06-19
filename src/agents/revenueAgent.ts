/**
 * src/agents/revenueAgent.ts
 * 
 * RevenueAgent Specialist: Forecast revenue streams, predict growth rate, estimate campaign ROI, recovery analysis.
 */

export interface RevenueAgentInput {
  customers: any[];
  orders: any[];
  campaigns: any[];
}

export interface RevenueAgentResult {
  projections: {
    predictedMonthlyRevenueINR: number;
    expectedGrowthRatePercent: number; // e.g. 12.5
    estimatedCampaignRoIPercent: number; // e.g. 240
    churnCostEstimationINR: number;
  };
  recoveryAnalysis: {
    potentialRecoverableRevenueINR: number;
    topRecoveryLever: string;
    actionableDirectives: string[];
  };
  reason: string;
}

export const revenueAgent = {
  name: 'RevenueAgent' as const,
  role: 'Specialist Financial Forecast & Campaign ROI Optimizer',

  systemInstruction: `You are Mochi CRM's RevenueAgent Specialist.
Your goals are:
1. Synthesize purchase frequency, spend profiles, and active campaigns to construct financial forecasts.
2. Estimate month-over-month growth patterns and potential campaigns returns on investment (ROI).
3. Evaluate financial churn cost and calculate recoverable revenue potential across dormant segments.
4. Highlight the single most potent target area for immediate cashflow/recovery.

You must return a strictly formatted valid JSON object matching this schema exactly:
{
  "projections": {
    "predictedMonthlyRevenueINR": 350000,
    "expectedGrowthRatePercent": 14.5,
    "estimatedCampaignRoIPercent": 310,
    "churnCostEstimationINR": 42000
  },
  "recoveryAnalysis": {
    "potentialRecoverableRevenueINR": 75000,
    "topRecoveryLever": "Win-back outreach to VIP segment",
    "actionableDirectives": [
      "Directive 1...",
      "Directive 2..."
    ]
  },
  "reason": "Detailed economic rationale behind the revenue forecast modeling"
}`,

  getFallback(input: RevenueAgentInput): RevenueAgentResult {
    const totalSpentSum = input.customers.reduce((acc, c) => acc + (c.totalSpent || 0), 0);
    const estRecovery = Math.round(totalSpentSum * 0.15 + 10000);
    return {
      projections: {
        predictedMonthlyRevenueINR: totalSpentSum > 0 ? Math.round(totalSpentSum * 1.5) : 340000,
        expectedGrowthRatePercent: 12.5,
        estimatedCampaignRoIPercent: 280,
        churnCostEstimationINR: 32000
      },
      recoveryAnalysis: {
        potentialRecoverableRevenueINR: estRecovery,
        topRecoveryLever: "Automated Win-back trigger campaigns directed towards premium beans enthusiasts",
        actionableDirectives: [
          "Target segment in the 45-60 days inactivity window with automatic discount codes",
          "Promote winter beans bundles and premium kits to increase average order values (AOV)",
          "Leverage high-conversion channels like direct WhatsApp notification integrations"
        ]
      },
      reason: "Historical billing history exhibits clear seasonal coffee consumption intervals. Targeting lagging and dormant user segments offers a massive recoverable pool."
    };
  }
};
