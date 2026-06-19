/**
 * src/agents/customerSuccessAgent.ts
 * 
 * CustomerSuccessAgent Specialist: Detect unhappy customers, predict churn, recommend retention actions, generate follow up outreach.
 */

export interface CustomerSuccessAgentInput {
  customers: any[];
  orders: any[];
  events: any[];
}

export interface CustomerSuccessAgentResult {
  unhappyCustomers: Array<{
    customerId: string;
    customerName: string;
    healthScore: number; // 0 to 100
    predictedChurnRisk: 'High' | 'Medium' | 'Low' | string;
    churnRationale: string;
    recommendedRetentionAction: string;
    followUpScript: string;
  }>;
  reason: string;
}

export const customerSuccessAgent = {
  name: 'CustomerSuccessAgent' as const,
  role: 'Specialist Churn Mitigation & Customer Loyalty Agent',

  systemInstruction: `You are Mochi CRM's dedicated CustomerSuccessAgent Specialist.
Your goals are:
1. Parse interaction data, feedback logs, and purchase recurrence patterns to identify unhappy or slipping customers.
2. Predict overall health scores (0-100, where lower is more at risk) and assign a churn risk classification (High, Medium, Low).
3. Recommend specific high-impact retention actions (e.g. VIP waiver, free service, custom premium samples).
4. Draft a direct, helpful, highly empathetic follow-up pitch designed to rebuild trust.

You must return a strictly formatted valid JSON object matching this schema exactly:
{
  "unhappyCustomers": [
    {
      "customerId": "...",
      "customerName": "...",
      "healthScore": 45,
      "predictedChurnRisk": "High",
      "churnRationale": "Why this user is at risk of churning",
      "recommendedRetentionAction": "Description of retention incentive",
      "followUpScript": "Friendly email text asking details and offering help"
    }
  ],
  "reason": "Detailed support insights and customer health patterns narrative"
}`,

  getFallback(input: CustomerSuccessAgentInput): CustomerSuccessAgentResult {
    const list = input.customers.filter(c => c.tags?.includes('inactive') || c.orderCount <= 1).map(c => ({
      customerId: c.id,
      customerName: c.name,
      healthScore: 40,
      predictedChurnRisk: 'High',
      churnRationale: `Inactive for more than 45 days. Recurrence interval exceeded previous standards.`,
      recommendedRetentionAction: `Send a complimentary micro-lot tasting samples box + personalized consultation check-in`,
      followUpScript: `Hi ${c.name},\n\nWe haven't shared a cup of coffee recently. We'd love to know how we can make your Mochi experience better. Reply directly with any questions, or enjoy a free espresso sample on us using code SUPPORTCOFFEE.\n\nWarmly,\nMochi Care Team`
    }));

    return {
      unhappyCustomers: list.length > 0 ? list : [
        {
          customerId: "c2",
          customerName: "Dormant Brewer",
          healthScore: 35,
          predictedChurnRisk: "High",
          churnRationale: "No orders matching usual winter seasonal purchase. Missing engagement history triggers.",
          recommendedRetentionAction: "Provide 25% off direct order code and premium customized bean suggestion",
          followUpScript: "Hi there, We missed brewing with you! Let us know how your brewing is going. Enjoy 25% off with code WINBACK."
        }
      ],
      reason: "Identified profiles with dropping engagement profiles or inactive flags. Prescribes supportive retention check-ins to reduce immediate churn rates."
    };
  }
};
