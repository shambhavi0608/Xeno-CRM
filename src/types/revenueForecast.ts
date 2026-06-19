export interface RevenueForecast {
  customerId: string;
  month: string;
  predictedRevenue: number;
  growthPercentage: number;
  confidence: number;
  reason: string;
  generatedAt: string; // ISO String
}

export interface CompactForecastResponse {
  predictedRevenue: number;
  growthPercentage: number;
  confidence: number;
  reason: string;
}
