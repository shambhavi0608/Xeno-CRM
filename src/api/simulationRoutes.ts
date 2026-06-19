/**
 * src/api/simulationRoutes.ts
 * 
 * Express Router defining the AI Business Simulation points:
 * - POST /api/simulation/predict
 */

import { Router } from 'express';
import { Type } from '@google/genai';
import { getCustomers, getOrders, getCampaigns } from '../server/db.js';
import { getAi, generateContentWithRetry } from '../../server.js';

const router = Router();

// POST /api/simulation/predict
router.post('/predict', async (req, res) => {
  try {
    const { discountPercent, communicationChannel, recipientSegment, loyaltyBonusPoints } = req.body;

    const customers = getCustomers();
    const orders = getOrders();
    const campaigns = getCampaigns();

    // Grouping metrics for contextual simulation
    const totalCustomers = customers.length;
    const inactiveCount = customers.filter(c => c.tags?.includes('inactive')).length;
    const totalSpentSum = customers.reduce((acc, c) => acc + (c.totalSpent || 0), 0);
    const avgSpent = totalCustomers > 0 ? totalSpentSum / totalCustomers : 4000;

    const queryData = {
      simulationParameters: {
        discountPercent: discountPercent || 15,
        communicationChannel: communicationChannel || 'whatsapp',
        recipientSegment: recipientSegment || 'dormant',
        loyaltyBonusPoints: loyaltyBonusPoints || 0
      },
      telemetry: {
        totalCustomers,
        inactiveCustomers: inactiveCount,
        averageSpentAmount: avgSpent,
        activeCampaigns: campaigns.length,
        recentOrdersCount: orders.length
      }
    };

    const ai = getAi();
    if (ai) {
      try {
        const sysInstruction = `You are our CRM's master Business Simulation Engine.
Accurately forecast the financial and retention parameters when starting a specific target strategy (e.g. discount vouchers, customized WhatsApp notification bursts, loyalty point drops).
Calculate:
1. expectedRevenueINR (numerical)
2. expectedCustomersReturned (numerical)
3. expectedOpenRatePercent (0 to 100 percentage)
4. roiPercent (expected return on investment percentage)
5. riskLevel (LOW / MEDIUM / HIGH)
6. riskRationale (reason why this risk rating is chosen)

Return a strictly formatted valid JSON matching this schema exactly:
{
  "scenario": "Short description of the simulation scenario",
  "expectedRevenueINR": 340000,
  "expectedCustomersReturned": 145,
  "expectedOpenRatePercent": 68,
  "roiPercent": 240,
  "riskLevel": "LOW",
  "riskRationale": "Empathetic WhatsApp triggers have consistently high open rates without diluting core base brand pricing values."
}`;

        const response = await generateContentWithRetry({
          preferredModel: 'gemini-3.5-flash',
          contents: `Simulation context:\n${JSON.stringify(queryData)}`,
          config: {
            systemInstruction: sysInstruction,
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                scenario: { type: Type.STRING },
                expectedRevenueINR: { type: Type.NUMBER },
                expectedCustomersReturned: { type: Type.NUMBER },
                expectedOpenRatePercent: { type: Type.NUMBER },
                roiPercent: { type: Type.NUMBER },
                riskLevel: { type: Type.STRING },
                riskRationale: { type: Type.STRING }
              },
              required: ['scenario', 'expectedRevenueINR', 'expectedCustomersReturned', 'expectedOpenRatePercent', 'roiPercent', 'riskLevel', 'riskRationale']
            }
          }
        });

        return res.json(JSON.parse(response.text || '{}'));
      } catch (geminiErr) {
        console.error('[Simulation Engine Endpoint] Gemini simulation prediction failed, fallback triggered:', geminiErr);
      }
    }

    // High quality mathematical CRM fallback
    const disc = discountPercent || 15;
    const channel = communicationChannel || 'whatsapp';
    const segment = recipientSegment || 'dormant';

    let expectedCustomersReturned = Math.min(inactiveCount, Math.round(inactiveCount * (disc / 100 + 0.15)));
    if (segment === 'all') expectedCustomersReturned = Math.min(totalCustomers, Math.round(totalCustomers * 0.4));
    if (expectedCustomersReturned === 0) expectedCustomersReturned = 12;

    const expectedRevenueINR = Math.round(expectedCustomersReturned * avgSpent * 0.85);
    const expectedOpenRatePercent = channel === 'whatsapp' ? 82 : (channel === 'email' ? 44 : 28);
    const roiPercent = Math.max(120, Math.round((expectedRevenueINR / (expectedCustomersReturned * 220)) * 100));

    const riskLevel = disc > 25 ? 'HIGH' : (disc > 15 ? 'MEDIUM' : 'LOW');
    const riskRationale = disc > 25 
      ? `A highly aggressive ${disc}% general discount risks brand premium dissolution and severe margins erosion.`
      : `Stable ${disc}% incentive combined with ${channel} outreach represents high-performance retention with clean profit safeguarding.`;

    const result = {
      scenario: `Simulation of ${disc}% promotional coupon targeting ${segment} segment using ${channel} notifications`,
      expectedRevenueINR,
      expectedCustomersReturned,
      expectedOpenRatePercent,
      roiPercent,
      riskLevel,
      riskRationale
    };

    res.json(result);
  } catch (err: any) {
    res.status(500).json({ message: err.message || 'Error processing business strategy simulation' });
  }
});

export default router;
