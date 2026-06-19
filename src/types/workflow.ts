export interface WorkflowAutomation {
  id: string;
  name: string;
  trigger: 'customer_inactive' | 'high_churn_risk' | 'new_customer' | 'campaign_opened' | 'purchase_completed' | 'high_value_customer' | string;
  condition: string;
  action: 'send_whatsapp' | 'send_email' | 'generate_campaign' | 'notify_sales' | 'create_followup_task' | 'generate_ai_recommendation' | string;
  status: 'active' | 'paused';
  lastExecuted?: string | any;
  createdAt: string | any;
}

export interface WorkflowExecutionResponse {
  workflow: WorkflowAutomation;
  generatedCampaign?: string;
  message?: string;
  predictedRecovery?: number;
  reason: string;
}
