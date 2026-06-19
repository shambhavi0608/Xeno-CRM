export interface CustomerChurnPrediction {
  customerId: string;
  risk: 'LOW' | 'MEDIUM' | 'HIGH';
  score: number;
  reason: string[];
  recommendedActions: string[];
  predictedAt: string; // ISO Date String
}

export interface ChurnDashboardData {
  highRiskCount: number;
  mediumRiskCount: number;
  lowRiskCount: number;
  averageChurnScore: number;
  topChurnFactors: string[];
}
