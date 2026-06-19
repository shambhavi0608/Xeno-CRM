/**
 * src/agents/salesAgent.ts
 * 
 * SalesAgent Specialist: Find opportunities, recommend products, predict conversion, generate strategy.
 */

export interface SalesAgentInput {
  customers: any[];
  orders: any[];
  events: any[];
}

export interface SalesAgentResult {
  opportunities: Array<{
    customerId: string;
    customerName: string;
    productRecommendation: string;
    predictedConversionProbability: number; // 0 to 1
    opportunityScore: number; // 0 to 100
    upsellPotentialINR: number;
  }>;
  salesStrategy: {
    title: string;
    audienceFocus: string;
    promotionalOffer: string;
    strategicSteps: string[];
  };
  reason: string;
}

export const salesAgent = {
  name: 'SalesAgent' as const,
  role: 'Specialist Customer Buyer Propensity & Upsell Agent',
  
  systemInstruction: `You are Mochi CRM's elite SalesAgent Specialist.
Your goals are:
1. Identify high-value opportunity customers based on historical purchase patterns and engagement.
2. Recommend the best tailored specialty coffee products (e.g., specific micro-lot blends, premium accessories).
3. Predict conversion probability (0.0 to 1.0) and assign an opportunity score (1 to 100).
4. Construct a concrete, high-performance sales upsell strategy.

You must return a strictly formatted valid JSON object matching this schema exactly:
{
  "opportunities": [
    {
      "customerId": "...",
      "customerName": "...",
      "productRecommendation": "Name of specialty blend or brew craft gear",
      "predictedConversionProbability": 0.85,
      "opportunityScore": 88,
      "upsellPotentialINR": 2500
    }
  ],
  "salesStrategy": {
    "title": "Strategy campaign title",
    "audienceFocus": "Focus description",
    "promotionalOffer": "Main conversion offer details",
    "strategicSteps": ["Step 1...", "Step 2..."]
  },
  "reason": "Detailed analytics narrative behind this selection"
}`,

  getFallback(input: SalesAgentInput): SalesAgentResult {
    const list = input.customers.slice(0, 3).map(c => {
      const avgSpent = c.orderCount > 0 ? Math.round(c.totalSpent / c.orderCount) : 1000;
      return {
        customerId: c.id,
        customerName: c.name,
        productRecommendation: "Mochi Signature Winter Espresso Blend",
        predictedConversionProbability: 0.78,
        opportunityScore: 82,
        upsellPotentialINR: Math.round(avgSpent * 1.2)
      };
    });

    return {
      opportunities: list.length > 0 ? list : [
        {
          customerId: "c1",
          customerName: "Acme Brewer",
          productRecommendation: "Mochi Signature Winter Espresso Blend",
          predictedConversionProbability: 0.8,
          opportunityScore: 85,
          upsellPotentialINR: 1500
        }
      ],
      salesStrategy: {
        title: "Winter Micro-Lot Warmups Campaign",
        audienceFocus: "High engagement dormant coffee lovers looking for fresh premium blends",
        promotionalOffer: "Complimentary handcrafted ceramic cup with every winter batch order",
        strategicSteps: [
          "Target active coffee profiles with recent positive feedback labels",
          "Deploy custom winter espresso selection showcase email pitch",
          "Deliver direct conversational WhatsApp notifications featuring custom discount voucher code"
        ]
      },
      reason: "Sales metrics indicate strong historical coffee bean consumption patterns across evaluated profiles. Proposes warm upsell offering premium brewing accessories."
    };
  }
};
