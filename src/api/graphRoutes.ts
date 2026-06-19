/**
 * src/api/graphRoutes.ts
 * 
 * Defines Customer Knowledge Graph routes:
 * - GET /api/graph/vip
 * - GET /api/graph/similar/:customerId
 * - GET /api/graph/recommendations/:customerId
 * - GET /api/graph/recommend-campaigns/:customerId
 * - GET /api/graph/predict-purchase/:customerId
 * - POST /api/graph/build
 */

import { Router } from 'express';
import { Type } from '@google/genai';
import { getCustomers, getOrders, getCampaigns, getEvents } from '../server/db.js';
import { getAi, generateContentWithRetry } from '../../server.js';

const router = Router();

// GET /api/graph/vip
router.get('/vip', (req, res) => {
  try {
    const customers = getCustomers();
    const vip = customers
      .filter(c => c.totalSpent > 12000 || c.orderCount >= 4)
      .map(c => ({
        id: c.id,
        name: c.name,
        email: c.email,
        totalSpent: c.totalSpent,
        orderCount: c.orderCount,
        lastOrderDate: c.lastOrderDate,
        engagementLevel: c.totalSpent > 20000 ? 'Platinum VIP' : 'Gold VIP'
      }));
    res.json(vip);
  } catch (err: any) {
    res.status(500).json({ message: err.message || 'Error fetching VIP customers' });
  }
});

// GET /api/graph/similar/:customerId
router.get('/similar/:customerId', async (req, res) => {
  try {
    const { customerId } = req.params;
    const customers = getCustomers();
    const target = customers.find(c => c.id === customerId);
    if (!target) return res.status(404).json({ message: 'Customer not found.' });

    const ai = getAi();
    if (ai) {
      try {
        const sysInstruction = `You are a graph adjacency Similarity Search Engine.
Compare the targeted customer with other directory customer nodes.
Determine the top 3 most similar customers based on purchase volumes, status tags, and order frequency patterns.
Return a strictly formatted valid JSON array matching this schema exactly:
[
  {
    "similarCustomerId": "c2",
    "name": "Jane Doe",
    "similarityScore": 0.94,
    "matchingAttributes": ["High-spend category", "Active coffee drinker"],
    "sharedProducts": ["Ethiopian Blend"]
  }
]`;

        const response = await generateContentWithRetry({
          preferredModel: 'gemini-3.5-flash',
          contents: `Target customer:\n${JSON.stringify(target)}\n\nOther potential customer nodes:\n${JSON.stringify(customers.filter(c => c.id !== customerId).slice(0, 8))}`,
          config: {
            systemInstruction: sysInstruction,
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  similarCustomerId: { type: Type.STRING },
                  name: { type: Type.STRING },
                  similarityScore: { type: Type.NUMBER },
                  matchingAttributes: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING }
                  },
                  sharedProducts: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING }
                  }
                },
                required: ['similarCustomerId', 'name', 'similarityScore', 'sharedProducts']
              }
            }
          }
        });

        return res.json(JSON.parse(response.text || '[]'));
      } catch (geminiErr) {
        console.error('[Graph Similarity Endpoint] Gemini execution failed, fallback triggered:', geminiErr);
      }
    }

    // Fallback comparison
    const matches = customers
      .filter(c => c.id !== customerId)
      .slice(0, 2)
      .map(c => ({
        similarCustomerId: c.id,
        name: c.name,
        similarityScore: target.tags?.includes('inactive') && c.tags?.includes('inactive') ? 0.92 : 0.78,
        matchingAttributes: ["Similar purchase volume", "Matched status tags"],
        sharedProducts: ["Signature Artisan Blend"]
      }));
    res.json(matches);
  } catch (err: any) {
    res.status(500).json({ message: err.message || 'Error finding similar customer nodes' });
  }
});

// GET /api/graph/recommendations/:customerId
router.get('/recommendations/:customerId', async (req, res) => {
  try {
    const { customerId } = req.params;
    const customers = getCustomers();
    const target = customers.find(c => c.id === customerId);
    if (!target) return res.status(404).json({ message: 'Customer not found.' });

    const ai = getAi();
    if (ai) {
      try {
        const sysInstruction = `You are a Customer Graph Product Recommendation Engine.
Analyze the target's past order behaviors, tags, and similar customer purchase records in the graph.
Produce 2 highly aligned specialty coffee products or accessories recommendations.
Return a strictly formatted valid JSON array matching this schema exactly:
[
  {
    "productId": "p_ethiopian",
    "productName": "Guatemala Antigua Micro-lot",
    "recommendationReason": "Similar customers who buy Artisan blends also highly favor Guatemalan roasts.",
    "affinityScore": 0.89,
    "priceINR": 1400
  }
]`;

        const response = await generateContentWithRetry({
          preferredModel: 'gemini-3.5-flash',
          contents: `Target profile: ${JSON.stringify(target)}\n\nOrder History context: ${JSON.stringify(getOrders().filter(o => o.customerId === customerId).slice(0, 5))}`,
          config: {
            systemInstruction: sysInstruction,
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  productId: { type: Type.STRING },
                  productName: { type: Type.STRING },
                  recommendationReason: { type: Type.STRING },
                  affinityScore: { type: Type.NUMBER },
                  priceINR: { type: Type.NUMBER }
                },
                required: ['productId', 'productName', 'recommendationReason', 'affinityScore', 'priceINR']
              }
            }
          }
        });

        return res.json(JSON.parse(response.text || '[]'));
      } catch (geminiErr) {
        console.error('[Graph Recommendations Endpoint] Gemini execution failed, fallback triggered:', geminiErr);
      }
    }

    // Fallback recommendation
    res.json([
      {
        productId: "p_signature",
        productName: "Signature Mochi Roast Select",
        recommendationReason: "High-affinity winter seasonal coffee match.",
        affinityScore: 0.85,
        priceINR: 1100
      },
      {
        productId: "p_aeropress",
        productName: "Artisanal AeroPress Brewer Edition",
        recommendationReason: "Recommended matching companion based on high total lifetime value.",
        affinityScore: 0.72,
        priceINR: 3500
      }
    ]);
  } catch (err: any) {
    res.status(500).json({ message: err.message || 'Error processing product graph recommendations' });
  }
});

// GET /api/graph/recommend-campaigns/:customerId
router.get('/recommend-campaigns/:customerId', async (req, res) => {
  try {
    const { customerId } = req.params;
    const customers = getCustomers();
    const target = customers.find(c => c.id === customerId);
    if (!target) return res.status(404).json({ message: 'Customer not found.' });

    const ai = getAi();
    if (ai) {
      try {
        const sysInstruction = `You are a Campaign Affinity Target Engine.
Determine which campaign would yield highest conversion rate for this customer node.
Return a strictly formatted valid JSON structure:
{
  "recommendedCampaign": "Exclusive Winter Tasting Box promotion",
  "expectedResponseRatePercent": 84,
  "optimalChannel": "whatsapp",
  "reasoning": "Highest WhatsApp event open rate matches seasonal coffee buying history."
}`;

        const response = await generateContentWithRetry({
          preferredModel: 'gemini-3.5-flash',
          contents: `Target client: ${JSON.stringify(target)}\n\nHistorical campaign list: ${JSON.stringify(getCampaigns().slice(0, 5))}`,
          config: {
            systemInstruction: sysInstruction,
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                recommendedCampaign: { type: Type.STRING },
                expectedResponseRatePercent: { type: Type.NUMBER },
                optimalChannel: { type: Type.STRING },
                reasoning: { type: Type.STRING }
              },
              required: ['recommendedCampaign', 'expectedResponseRatePercent', 'optimalChannel', 'reasoning']
// Note: no extra system codes
            }
          }
        });

        return res.json(JSON.parse(response.text || '{}'));
      } catch (geminErr) {
        console.error('[Graph Campaign Recs Endpoint] Gemini failed, fallback triggered:', geminErr);
      }
    }

    // fallback
    res.json({
      recommendedCampaign: "Mochi Artisanal Single-Origin Showcase",
      expectedResponseRatePercent: 78,
      optimalChannel: target.tags?.includes('inactive') ? "whatsapp" : "email",
      reasoning: "Dormant user profiles exhibit outstanding reactivation margins over active whatsapp coupons."
    });
  } catch (err: any) {
    res.status(500).json({ message: err.message || 'Error processing graph campaign affinity' });
  }
});

// GET /api/graph/predict-purchase/:customerId
router.get('/predict-purchase/:customerId', async (req, res) => {
  try {
    const { customerId } = req.params;
    const customers = getCustomers();
    const target = customers.find(c => c.id === customerId);
    if (!target) return res.status(404).json({ message: 'Customer not found.' });

    const ai = getAi();
    if (ai) {
      try {
        const sysInstruction = `You are a Next-Purchase Prediction Engine.
Review customer order history, elapsed days, and buy frequency intervals.
Predict what they will likely purchase next, when, and estimated basket value.
Return a strictly formatted valid JSON structure matching:
{
  "predictedProduct": "Mochi Signature Winter Espresso Blend",
  "predictedDaysUntilNextPurchase": 14,
  "estimatedOrderValueINR": 1800,
  "confidenceScore": 88
}`;

        const response = await generateContentWithRetry({
          preferredModel: 'gemini-3.5-flash',
          contents: `Customer Profile:\n${JSON.stringify(target)}\n\nPast orders:\n${JSON.stringify(getOrders().filter(o => o.customerId === customerId).slice(0, 10))}`,
          config: {
            systemInstruction: sysInstruction,
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                predictedProduct: { type: Type.STRING },
                predictedDaysUntilNextPurchase: { type: Type.NUMBER },
                estimatedOrderValueINR: { type: Type.NUMBER },
                confidenceScore: { type: Type.NUMBER }
              },
              required: ['predictedProduct', 'predictedDaysUntilNextPurchase', 'estimatedOrderValueINR', 'confidenceScore']
            }
          }
        });

        return res.json(JSON.parse(response.text || '{}'));
      } catch (geminiErr) {
        console.error('[Next-Purchase predict] Gemini run failed, fallback triggered:', geminiErr);
      }
    }

    // fallback
    res.json({
      predictedProduct: "Mochi Signature Winter Espresso Blend",
      predictedDaysUntilNextPurchase: 18,
      estimatedOrderValueINR: Math.round(target.totalSpent / Math.max(1, target.orderCount)) || 1400,
      confidenceScore: 75
    });
  } catch (err: any) {
    res.status(500).json({ message: err.message || 'Error predicting next customer purchase' });
  }
});

// POST /api/graph/build
router.post('/build', (req, res) => {
  try {
    const { customerId } = req.body;
    const customers = getCustomers();
    const orders = getOrders();
    const campaigns = getCampaigns();

    const targetCustomer = customers.find(c => c.id === customerId) || customers[0];
    if (!targetCustomer) return res.status(404).json({ message: 'No customers available in Database.' });

    // Build graph structure nodes & edges representation
    const nodes = [
      { id: targetCustomer.id, label: 'customer', properties: { name: targetCustomer.name, email: targetCustomer.email } },
      ...orders.filter(o => o.customerId === targetCustomer.id).slice(0, 3).map(o => ({ id: o.orderId, label: 'order', properties: { totalAmount: o.amount, date: o.timestamp } })),
      ...campaigns.slice(0, 2).map(c => ({ id: c.campaignId, label: 'campaign', properties: { title: c.name, status: c.status } }))
    ];

    const edges = [
      ...orders.filter(o => o.customerId === targetCustomer.id).slice(0, 3).map(o => ({ source: targetCustomer.id, target: o.orderId, relationship: 'BOUGHT' })),
      ...campaigns.slice(0, 2).map(c => ({ source: targetCustomer.id, target: c.campaignId, relationship: 'TARGETED_BY' }))
    ];

    res.json({
      customerId: targetCustomer.id,
      nodes,
      edges,
      lastBuilt: new Date().toISOString()
    });
  } catch (err: any) {
    res.status(500).json({ message: err.message || 'Error building customer knowledge graph' });
  }
});

export default router;
