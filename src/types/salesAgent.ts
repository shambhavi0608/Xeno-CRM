export interface SalesAgentCustomer {
  id: string;
  name: string;
  email: string;
  score?: number;
  health?: string;
  preferredChannel?: string;
  lastActive?: string;
}

export interface SalesAgentResponse {
  customers: SalesAgentCustomer[];
  reason: string;
  predictedRevenue: number;
  recommendedCampaign: string;
  email: string;
  whatsapp: string;
}
