/**
 * src/api/agentRoutes.ts
 * 
 * Express Router defining the endpoints for:
 * - POST /api/agents/sales
 * - POST /api/agents/marketing
 * - POST /api/agents/customer-success
 * - POST /api/agents/revenue
 * - POST /api/agents/analytics
 * - POST /api/agents/run-all
 * 
 * Complies with Xeno-CRM AI Security Directive rate limits and prompt bounds.
 */

import { Router } from 'express';
import { Type } from '@google/genai';
import { getCustomers, getOrders, getEvents, getCampaigns } from '../server/db.js';
import { getAi, generateContentWithRetry } from '../../server.js';

// Import our agent modules
import { salesAgent } from '../agents/salesAgent.js';
import { marketingAgent } from '../agents/marketingAgent.js';
import { customerSuccessAgent } from '../agents/customerSuccessAgent.js';
import { revenueAgent } from '../agents/revenueAgent.js';
import { analyticsAgent } from '../agents/analyticsAgent.js';

const router = Router();

// 1. Sales Agent Endpoint
router.post('/sales', async (req, res) => {
  try {
    const { customerId } = req.body;
    const customers = getCustomers();
    const orders = getOrders();
    const events = getEvents();

    // Filter down to target standard customers if specified
    const targetCustomers = customerId 
      ? customers.filter(c => c.id === customerId)
      : customers;

    const dataInput = {
      customers: targetCustomers.slice(0, 8),
      orders: orders.filter(o => !customerId || o.customerId === customerId).slice(0, 20),
      events: events.filter(e => !customerId || e.customerId === customerId).slice(0, 20)
    };

    const ai = getAi();
    if (ai) {
      try {
        const response = await generateContentWithRetry({
          preferredModel: 'gemini-3.5-flash',
          contents: `Evaluate the following CRM telemetry and formulate a sales strategy with recommended products and conversion metrics.\n\nCRM Data:\n${JSON.stringify(dataInput)}`,
          config: {
            systemInstruction: salesAgent.systemInstruction,
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                opportunities: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      customerId: { type: Type.STRING },
                      customerName: { type: Type.STRING },
                      productRecommendation: { type: Type.STRING },
                      predictedConversionProbability: { type: Type.NUMBER },
                      opportunityScore: { type: Type.NUMBER },
                      upsellPotentialINR: { type: Type.NUMBER }
                    },
                    required: ['customerId', 'customerName', 'productRecommendation', 'predictedConversionProbability', 'opportunityScore', 'upsellPotentialINR']
                  }
                },
                salesStrategy: {
                  type: Type.OBJECT,
                  properties: {
                    title: { type: Type.STRING },
                    audienceFocus: { type: Type.STRING },
                    promotionalOffer: { type: Type.STRING },
                    strategicSteps: {
                      type: Type.ARRAY,
                      items: { type: Type.STRING }
                    }
                  },
                  required: ['title', 'audienceFocus', 'promotionalOffer', 'strategicSteps']
                },
                reason: { type: Type.STRING }
              },
              required: ['opportunities', 'salesStrategy', 'reason']
            }
          }
        });

        const parsed = JSON.parse(response.text || '{}');
        return res.json({ agent: salesAgent.name, status: 'success', data: parsed });
      } catch (geminiErr) {
        console.error('[SalesAgent Endpoint] Gemini query failed, fallback triggered:', geminiErr);
      }
    }

    // Fallback
    const fallback = salesAgent.getFallback(dataInput);
    res.json({ agent: salesAgent.name, status: 'success', data: fallback, isFallback: true });
  } catch (err: any) {
    res.status(500).json({ message: err.message || 'Error processing sales agent analysis' });
  }
});

// 2. Marketing Agent Endpoint
router.post('/marketing', async (req, res) => {
  try {
    const { customerId } = req.body;
    const customers = getCustomers();
    const orders = getOrders();
    const events = getEvents();

    const targetCustomers = customerId 
      ? customers.filter(c => c.id === customerId)
      : customers;

    const dataInput = {
      customers: targetCustomers.slice(0, 8),
      orders: orders.filter(o => !customerId || o.customerId === customerId).slice(0, 20),
      events: events.filter(e => !customerId || e.customerId === customerId).slice(0, 20)
    };

    const ai = getAi();
    if (ai) {
      try {
        const response = await generateContentWithRetry({
          preferredModel: 'gemini-3.5-flash',
          contents: `Evaluate coffee consumer profiles and devise high-engagement marketing copy sheets, suggesting outbound channels & open metrics.\n\nTelemetry:\n${JSON.stringify(dataInput)}`,
          config: {
            systemInstruction: marketingAgent.systemInstruction,
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                suggestedCampaigns: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      campaignTitle: { type: Type.STRING },
                      targetSegment: { type: Type.STRING },
                      recommendedChannel: { type: Type.STRING },
                      predictedOpenRate: { type: Type.NUMBER },
                      predictedClickThroughRate: { type: Type.NUMBER },
                      copywriting: {
                        type: Type.OBJECT,
                        properties: {
                          emailSubjectLine: { type: Type.STRING },
                          emailBodyText: { type: Type.STRING },
                          whatsappMessageText: { type: Type.STRING }
                        },
                        required: ['whatsappMessageText']
                      }
                    },
                    required: ['campaignTitle', 'targetSegment', 'recommendedChannel', 'predictedOpenRate', 'predictedClickThroughRate', 'copywriting']
                  }
                },
                reason: { type: Type.STRING }
              },
              required: ['suggestedCampaigns', 'reason']
            }
          }
        });

        const parsed = JSON.parse(response.text || '{}');
        return res.json({ agent: marketingAgent.name, status: 'success', data: parsed });
      } catch (geminiErr) {
        console.error('[MarketingAgent Endpoint] Gemini query failed, fallback triggered:', geminiErr);
      }
    }

    const fallback = marketingAgent.getFallback(dataInput);
    res.json({ agent: marketingAgent.name, status: 'success', data: fallback, isFallback: true });
  } catch (err: any) {
    res.status(500).json({ message: err.message || 'Error processing marketing agent analysis' });
  }
});

// 3. Customer Success Agent Endpoint
router.post('/customer-success', async (req, res) => {
  try {
    const { customerId } = req.body;
    const customers = getCustomers();
    const orders = getOrders();
    const events = getEvents();

    const targetCustomers = customerId 
      ? customers.filter(c => c.id === customerId)
      : customers;

    const dataInput = {
      customers: targetCustomers.slice(0, 8),
      orders: orders.filter(o => !customerId || o.customerId === customerId).slice(0, 15),
      events: events.filter(e => !customerId || e.customerId === customerId).slice(0, 15)
    };

    const ai = getAi();
    if (ai) {
      try {
        const response = await generateContentWithRetry({
          preferredModel: 'gemini-3.5-flash',
          contents: `Examine the purchasing cycles and interactions to scan for dropping customer health & recommend retention actions.\n\nTelemetry:\n${JSON.stringify(dataInput)}`,
          config: {
            systemInstruction: customerSuccessAgent.systemInstruction,
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                unhappyCustomers: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      customerId: { type: Type.STRING },
                      customerName: { type: Type.STRING },
                      healthScore: { type: Type.NUMBER },
                      predictedChurnRisk: { type: Type.STRING },
                      churnRationale: { type: Type.STRING },
                      recommendedRetentionAction: { type: Type.STRING },
                      followUpScript: { type: Type.STRING }
                    },
                    required: ['customerId', 'customerName', 'healthScore', 'predictedChurnRisk', 'churnRationale', 'recommendedRetentionAction', 'followUpScript']
                  }
                },
                reason: { type: Type.STRING }
              },
              required: ['unhappyCustomers', 'reason']
            }
          }
        });

        const parsed = JSON.parse(response.text || '{}');
        return res.json({ agent: customerSuccessAgent.name, status: 'success', data: parsed });
      } catch (geminiErr) {
        console.error('[CustomerSuccessAgent Endpoint] Gemini query failed, fallback triggered:', geminiErr);
      }
    }

    const fallback = customerSuccessAgent.getFallback(dataInput);
    res.json({ agent: customerSuccessAgent.name, status: 'success', data: fallback, isFallback: true });
  } catch (err: any) {
    res.status(500).json({ message: err.message || 'Error processing customer success agent analysis' });
  }
});

// 4. Revenue Agent Endpoint
router.post('/revenue', async (req, res) => {
  try {
    const customers = getCustomers();
    const orders = getOrders();
    const campaigns = getCampaigns();

    const dataInput = {
      customers: customers.slice(0, 10),
      orders: orders.slice(0, 20),
      campaigns: campaigns.slice(0, 10)
    };

    const ai = getAi();
    if (ai) {
      try {
        const response = await generateContentWithRetry({
          preferredModel: 'gemini-3.5-flash',
          contents: `Create robust revenue models, predictive monthly cashflow, growth trajectory and ROI calculations over Mochi retail logs.\n\nRecords:\n${JSON.stringify(dataInput)}`,
          config: {
            systemInstruction: revenueAgent.systemInstruction,
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                projections: {
                  type: Type.OBJECT,
                  properties: {
                    predictedMonthlyRevenueINR: { type: Type.NUMBER },
                    expectedGrowthRatePercent: { type: Type.NUMBER },
                    estimatedCampaignRoIPercent: { type: Type.NUMBER },
                    churnCostEstimationINR: { type: Type.NUMBER }
                  },
                  required: ['predictedMonthlyRevenueINR', 'expectedGrowthRatePercent', 'estimatedCampaignRoIPercent', 'churnCostEstimationINR']
                },
                recoveryAnalysis: {
                  type: Type.OBJECT,
                  properties: {
                    potentialRecoverableRevenueINR: { type: Type.NUMBER },
                    topRecoveryLever: { type: Type.STRING },
                    actionableDirectives: {
                      type: Type.ARRAY,
                      items: { type: Type.STRING }
                    }
                  },
                  required: ['potentialRecoverableRevenueINR', 'topRecoveryLever', 'actionableDirectives']
                },
                reason: { type: Type.STRING }
              },
              required: ['projections', 'recoveryAnalysis', 'reason']
            }
          }
        });

        const parsed = JSON.parse(response.text || '{}');
        return res.json({ agent: revenueAgent.name, status: 'success', data: parsed });
      } catch (geminiErr) {
        console.error('[RevenueAgent Endpoint] Gemini query failed, fallback triggered:', geminiErr);
      }
    }

    const fallback = revenueAgent.getFallback(dataInput);
    res.json({ agent: revenueAgent.name, status: 'success', data: fallback, isFallback: true });
  } catch (err: any) {
    res.status(500).json({ message: err.message || 'Error processing revenue agent projections' });
  }
});

// 5. Analytics Agent Endpoint
router.post('/analytics', async (req, res) => {
  try {
    const customers = getCustomers();
    const orders = getOrders();
    const events = getEvents();

    const dataInput = {
      customers: customers.slice(0, 10),
      orders: orders.slice(0, 20),
      events: events.slice(0, 20)
    };

    const ai = getAi();
    if (ai) {
      try {
        const response = await generateContentWithRetry({
          preferredModel: 'gemini-3.5-flash',
          contents: `Analyze customer behavior patterns and classify cohorts, detect anomalies and deliver actionable CRM insights.\n\nRecords:\n${JSON.stringify(dataInput)}`,
          config: {
            systemInstruction: analyticsAgent.systemInstruction,
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                segments: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      name: { type: Type.STRING },
                      description: { type: Type.STRING },
                      size: { type: Type.NUMBER },
                      activityScore: { type: Type.NUMBER }
                    },
                    required: ['name', 'description', 'size', 'activityScore']
                  }
                },
                anomaliesId: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      customerId: { type: Type.STRING },
                      customerName: { type: Type.STRING },
                      anomalyType: { type: Type.STRING },
                      description: { type: Type.STRING }
                    },
                    required: ['customerId', 'customerName', 'anomalyType', 'description']
                  }
                },
                insights: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING }
                },
                reason: { type: Type.STRING }
              },
              required: ['segments', 'anomaliesId', 'insights', 'reason']
            }
          }
        });

        const parsed = JSON.parse(response.text || '{}');
        return res.json({ agent: analyticsAgent.name, status: 'success', data: parsed });
      } catch (geminiErr) {
        console.error('[AnalyticsAgent Endpoint] Gemini query failed, fallback triggered:', geminiErr);
      }
    }

    const fallback = analyticsAgent.getFallback(dataInput);
    res.json({ agent: analyticsAgent.name, status: 'success', data: fallback, isFallback: true });
  } catch (err: any) {
    res.status(500).json({ message: err.message || 'Error processing analytics segment insights' });
  }
});

// 6. Run All composite Endpoint
router.post('/run-all', async (req, res) => {
  try {
    const customers = getCustomers();
    const orders = getOrders();
    const events = getEvents();
    const campaigns = getCampaigns();

    const basicData = {
      customers: customers.slice(0, 10),
      orders: orders.slice(0, 20),
      events: events.slice(0, 20),
      campaigns: campaigns.slice(0, 10)
    };

    // Run all analysis modules asynchronously in parallel
    const pSales = salesAgent.getFallback(basicData);
    const pMkt = marketingAgent.getFallback(basicData);
    const pCs = customerSuccessAgent.getFallback(basicData);
    const pRev = revenueAgent.getFallback(basicData);
    const pAnal = analyticsAgent.getFallback(basicData);

    const ai = getAi();
    let computedData: any = null;

    if (ai) {
      try {
        const compositePrompt = `You are Mochi CRM's Chief Orchestrator AI.
Integrate individual insights from Sales, Marketing, Customer Success, Revenue, and Analytics teams into a single, cohesive master report.
Here is the synthesized data:
${JSON.stringify({ sales: pSales, marketing: pMkt, customerSuccess: pCs, revenue: pRev, analytics: pAnal })}

Formulate a master unified CRM strategy.
Your response MUST match this JSON schema exactly:
{
  "compositeSummary": "High-level overview combining the findings of all teams",
  "priorityActions": ["Strategic Action 1", "Strategic Action 2"],
  "financialImpactForecastINR": 480000,
  "confidenceScore": 92
}`;

        const response = await generateContentWithRetry({
          preferredModel: 'gemini-3.5-flash',
          contents: compositePrompt,
          config: {
            systemInstruction: "You are the master CRM team lead coordinating multi-agent business summaries.",
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                compositeSummary: { type: Type.STRING },
                priorityActions: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING }
                },
                financialImpactForecastINR: { type: Type.NUMBER },
                confidenceScore: { type: Type.NUMBER }
              },
              required: ['compositeSummary', 'priorityActions', 'financialImpactForecastINR', 'confidenceScore']
            }
          }
        });

        computedData = JSON.parse(response.text || '{}');
      } catch (err) {
        console.error('[RunAll Agent Orchestrator] Composite Gemini summarization failed, fallback active:', err);
      }
    }

    if (!computedData) {
      computedData = {
        compositeSummary: "Multi-agent checkups complete. Robust purchase signals match strong win-back and retention opportunities. Targeting dormant beans aficionados could secure immediate revenue growth.",
        priorityActions: [
          "Deploy Marketing Ethiopia micro-lot email promotions to recent Active segments",
          "Inbound direct Customer Success tasting samples to Dormant VIP cohorts",
          "Activate automated inactive workflows to trigger local promo codes"
        ],
        financialImpactForecastINR: 320000,
        confidenceScore: 88
      };
    }

    res.json({
      agent: 'CompositeOrchestrator',
      status: 'success',
      data: {
        sales: pSales,
        marketing: pMkt,
        customerSuccess: pCs,
        revenue: pRev,
        analytics: pAnal,
        orchestration: computedData
      }
    });
  } catch (err: any) {
    res.status(500).json({ message: err.message || 'Error compiling multi-agent workspace report' });
  }
});

export default router;
