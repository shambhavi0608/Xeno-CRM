/**
 * src/agents/marketingAgent.ts
 * 
 * MarketingAgent Specialist: Create campaign content, suggest channels, predict open rate, generate copy templates.
 */

export interface MarketingAgentInput {
  customers: any[];
  orders: any[];
  events: any[];
}

export interface MarketingAgentResult {
  suggestedCampaigns: Array<{
    campaignTitle: string;
    targetSegment: string;
    recommendedChannel: 'whatsapp' | 'email' | 'sms' | string;
    predictedOpenRate: number; // 0.0 to 1.0
    predictedClickThroughRate: number; // 0.0 to 1.0
    copywriting: {
      emailSubjectLine?: string;
      emailBodyText?: string;
      whatsappMessageText: string;
    };
  }>;
  reason: string;
}

export const marketingAgent = {
  name: 'MarketingAgent' as const,
  role: 'Specialist Content & Channel Outreach Optimizer',

  systemInstruction: `You are Mochi CRM's digital MarketingAgent Specialist.
Your goals are:
1. Synthesize targeted campaigns based on recent customer interactions and preferences.
2. Recommend the best marketing outbound channels (Email, WhatsApp, or standard SMS).
3. Forecast performance metrics (predicted open rate and click-through rate between 0.0 and 1.0).
4. Compose complete, highly engaging email subject lines / bodies, and emojis-rich WhatsApp templates.

You must return a strictly formatted valid JSON object matching this schema exactly:
{
  "suggestedCampaigns": [
    {
      "campaignTitle": "Campaign name",
      "targetSegment": "Audience sector",
      "recommendedChannel": "email",
      "predictedOpenRate": 0.42,
      "predictedClickThroughRate": 0.18,
      "copywriting": {
        "emailSubjectLine": "Subject...",
        "emailBodyText": "Dear customer...",
        "whatsappMessageText": "Hey brewer! ☕ Custom offer details..."
      }
    }
  ],
  "reason": "Detailed copywriting logic and behavioral rationale"
}`,

  getFallback(input: MarketingAgentInput): MarketingAgentResult {
    const mainCustomer = input.customers[0]?.name || 'Valued Partner';
    return {
      suggestedCampaigns: [
        {
          campaignTitle: "Mochi Artisanal Single-Origin Showcase",
          targetSegment: "Specialty blend lovers and recurring active coffee brewers",
          recommendedChannel: "email",
          predictedOpenRate: 0.48,
          predictedClickThroughRate: 0.22,
          copywriting: {
            emailSubjectLine: `An exclusive single-origin update for ${mainCustomer} ☕`,
            emailBodyText: `Dear Brewer,\n\nOur head roaster just unpacked our fresh micro-lot single-origin beans straight from our partner farm in Ethiopia.\n\nEnjoy early access and a special 15% discount code: ORIGIN15.\n\nWarm regards,\nThe Mochi Crew`,
            whatsappMessageText: `Hey ${mainCustomer}! ☕ Fresh single-origin beans have arrived at Mochi. Get 15% off using your personalized unlock code *ORIGIN15*. Tap to order!`
          }
        }
      ],
      reason: "Prioritizes specialty roasts for the top segment. Early morning coffee-related copy matches peak user interest triggers."
    };
  }
};
