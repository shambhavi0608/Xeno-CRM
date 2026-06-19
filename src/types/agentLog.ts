export interface AIAgentLog {
  id: string;
  agent: 'sales' | 'marketing' | 'customer-success' | 'revenue' | 'analytics' | string;
  customerId?: string | null;
  prompt: string;
  response: string | any;
  status: 'success' | 'failed' | string;
  createdAt: string | any;
}
