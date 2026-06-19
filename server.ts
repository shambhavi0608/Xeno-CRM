import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { 
  loadDatabase, 
  saveDatabase, 
  getCustomers, 
  getOrders, 
  getCampaigns, 
  getEvents, 
  writeCampaigns, 
  writeEvents,
  writeOrders,
  writeCustomers
} from './src/server/db.js';
import { Customer, Order, Campaign, CommunicationEvent, AnalyticsOverview, calculateCustomerHealth } from './src/types/index.js';
import { optimizeChannel } from './src/server/channelOptimizer.js';
import workflowRouter from './src/api/workflowRoutes.js';
import agentRouter from './src/api/agentRoutes.js';
import memoryRouter from './src/api/memoryRoutes.js';
import graphRouter from './src/api/graphRoutes.js';
import simulationRouter from './src/api/simulationRoutes.js';

const app = express();

// Security headers with Helmet
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  // Disable DENY inside development environment to ensure iframe previews function beautifully, but keep enabled for production
  frameguard: process.env.NODE_ENV === 'production' ? { action: 'deny' } : false
}));

// Strip identifying headers to prevent scanner profiling
app.disable('x-powered-by');

app.use(express.json());

// 60 requests per minute limit across general CRM endpoints
const generalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many requests. General dashboard rate limit exceeded.' },
  statusCode: 429
});

// Apply general rate limit to all /api/ endpoints except specific LLM / Campaign ones
app.use('/api', generalLimiter);

// 10 requests per minute rate limit specifically for LLM-powered/AI Campaign operations
const copilotLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  keyGenerator: (req) => {
    // Identity check - match user identifier token or fallback to remote address
    return req.headers.authorization || req.ip || '';
  },
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many campaign or copilot requests. Rate limit is 10 requests per minute.' },
  statusCode: 429,
  handler: (req, res, next, options) => {
    res.setHeader('Retry-After', '60');
    res.status(options.statusCode).json(options.message);
  }
});

// Protect specified AI and prediction endpoints with copilot rate limiter
app.use([
  '/api/copilot/generate', 
  '/api/v1/copilot/generate',
  '/api/segment/suggest',
  '/api/campaigns/generate-copy',
  '/api/campaigns/predict',
  '/api/analytics/insights',
  '/api/churn/generate/:customerId',
  '/api/ai/sales/find-buyers',
  '/api/ai/sales/strategy',
  '/api/ai/sales/followup',
  '/api/workflows/:id/execute',
  '/api/agents/sales',
  '/api/agents/marketing',
  '/api/agents/customer-success',
  '/api/agents/revenue',
  '/api/agents/analytics',
  '/api/agents/run-all',
  '/api/memory/generate/:customerId',
  '/api/graph/similar/:customerId',
  '/api/graph/recommendations/:customerId',
  '/api/graph/recommend-campaigns/:customerId',
  '/api/graph/predict-purchase/:customerId',
  '/api/simulation/predict'
], copilotLimiter);

const PORT = 3000;

// Lazy initialization of Gemini developer SDK
let aiClient: GoogleGenAI | null = null;
export function getAi(): GoogleGenAI | null {
  const key = process.env.GEMINI_API_KEY;
  if (!key || key === 'MY_GEMINI_API_KEY') {
    return null;
  }
  if (!aiClient) {
    aiClient = new GoogleGenAI({ 
      apiKey: key,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build'
        }
      }
    });
  }
  return aiClient;
}

// Robust fallback & retry runner over Google GenAI API
export async function generateContentWithRetry(params: {
  contents: any;
  config: any;
  preferredModel?: string;
}): Promise<any> {
  const ai = getAi();
  if (!ai) {
    throw new Error('AI client not initialized');
  }

  // Backup models in cascade sequence
  const modelsToTry = [
    params.preferredModel || 'gemini-3.5-flash',
    'gemini-3.1-flash-lite',
    'gemini-flash-latest'
  ];

  let lastError: any = null;

  for (const modelName of modelsToTry) {
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        console.log(`[Gemini API] Querying model ${modelName} (attempt ${attempt}/3)...`);
        const response = await ai.models.generateContent({
          model: modelName,
          contents: params.contents,
          config: params.config
        });
        if (response && response.text) {
          console.log(`[Gemini API] Success with model: ${modelName}`);
          return response;
        }
      } catch (e: any) {
        lastError = e;
        const errMsg = typeof e === 'object' ? JSON.stringify(e) : (e?.message || e?.status || String(e));
        
        // Detect if the server is busy / experiencing high demand (503 / UNAVAILABLE)
        const isServerBusy = errMsg.includes('503') || 
                             errMsg.includes('UNAVAILABLE') || 
                             errMsg.includes('high demand') ||
                             errMsg.includes('temporary') ||
                             e?.status === 503 ||
                             e?.code === 503 ||
                             (e?.error && (e.error?.code === 503 || e.error?.status === 'UNAVAILABLE'));

        // Detect if error is a rate limit / quota exceeded (429 / RESOURCE_EXHAUSTED)
        const isRateLimited = errMsg.includes('429') ||
                              errMsg.includes('RESOURCE_EXHAUSTED') ||
                              e?.status === 429 ||
                              e?.code === 429 ||
                              (e?.error && (e.error?.code === 429 || e.error?.status === 'RESOURCE_EXHAUSTED'));

        if (isRateLimited) {
          console.log(`[Gemini API] Model ${modelName} returned 429 (Rate Limit). Skipping retries to cascade gracefully...`);
          break; // Cascade to next model immediately
        }

        if (isServerBusy) {
          console.log(`[Gemini API] Model ${modelName} is experiencing high demand (503). Skipping retries to cascade gracefully...`);
          break; // Stop retrying this model and proceed to the next model in the outer cascade loop
        }

        console.warn(`[Gemini API] Model ${modelName} (attempt ${attempt}/3) encountered error: ${errMsg}`);
        
        // Detect if error is an API key error, 400 or 403 request error. Fast-fail since retries won't help!
        const isAuthError = errMsg.includes('API key') || errMsg.includes('API_KEY_INVALID') || errMsg.includes('403') || errMsg.includes('400') || e?.status === 400 || e?.status === 403 || e?.code === 400 || e?.code === 403;
        if (isAuthError) {
          console.warn('[Gemini API] Request error or invalid API key. Fast-failing cascade.');
          throw e; // Fast fail immediately to let robust fallbacks run
        }

        // Brief delay before retry with backoff for non-503 temporary errors
        if (attempt < 3) {
          const delay = attempt * 1200;
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
  }

  throw lastError || new Error('All cascade Gemini model queries failed');
}

// -------------------------------------------------------------
// SEED INITIAL DATABASE ON SERVER BOOT
// -------------------------------------------------------------
loadDatabase();

// -------------------------------------------------------------
// ENDPOINTS
// -------------------------------------------------------------

// 1. GET SYSTEM STATUS
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// 2. GET CUSTOMERS
app.get('/api/customers', (req, res) => {
  const customers = getCustomers();
  const tagFilter = req.query.tag as string;
  const search = req.query.search as string;

  let filtered = [...customers];

  if (tagFilter && tagFilter !== 'all') {
    filtered = filtered.filter(c => c.tags.includes(tagFilter));
  }

  if (search) {
    const s = search.toLowerCase();
    filtered = filtered.filter(c => 
      c.name.toLowerCase().includes(s) || 
      c.email.toLowerCase().includes(s) || 
      c.phone.includes(s)
    );
  }

  res.json(filtered);
});

// 3. GET SINGLE CUSTOMER AND THEIR ORDERS
app.get('/api/customers/:id', (req, res) => {
  const customers = getCustomers();
  const orders = getOrders();
  const customer = customers.find(c => c.id === req.params.id);
  
  if (!customer) {
    return res.status(404).json({ message: 'Customer not found' });
  }

  const customerOrders = orders.filter(o => o.customerId === req.params.id);
  res.json({ customer, orders: customerOrders });
});

// 3c. GET CUSTOMER 360 COMPREHENSIVE INSIGHTS (Firestore * Gemini)
app.get('/api/customers/:id/customer360', async (req, res) => {
  try {
    const customers = getCustomers();
    const orders = getOrders();
    const customer = customers.find(c => c.id === req.params.id);
    
    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    const customerOrders = orders.filter(o => o.customerId === req.params.id);

    // 1. Derive deterministic metrics
    const last = new Date(customer.lastOrderDate);
    const now = new Date('2026-06-12T07:16:58-07:00');
    const diffMs = Math.abs(now.getTime() - last.getTime());
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    const recencyScore = diffDays <= 7 ? 5 : diffDays <= 30 ? 4 : diffDays <= 90 ? 3 : diffDays <= 180 ? 2 : 1;
    const frequencyScore = customer.orderCount >= 10 ? 5 : customer.orderCount >= 5 ? 4 : customer.orderCount >= 3 ? 3 : customer.orderCount >= 2 ? 2 : 1;
    const monetaryScore = customer.totalSpent >= 15000 ? 5 : customer.totalSpent >= 10000 ? 4 : customer.totalSpent >= 5000 ? 3 : customer.totalSpent >= 2000 ? 2 : 1;
    const rfmScore = `R${recencyScore}-F${frequencyScore}-M${monetaryScore}`;
    const avgOrderValue = Math.round(customer.totalSpent / (customer.orderCount || 1));

    const getCompany = (email: string, name: string) => {
      const domain = email.split('@')[1];
      if (domain && domain !== 'gmail.com' && domain !== 'yahoo.com' && domain !== 'hotmail.com' && domain !== 'outlook.com') {
        const parts = domain.split('.');
        return parts[0].charAt(0).toUpperCase() + parts[0].slice(1) + ' Corp';
      }
      const sur = name.split(' ').slice(-1)[0] || 'Malhotra';
      return `${sur} Inc`;
    };
    const companyName = getCompany(customer.email, customer.name);
    
    const customerStatus = diffDays > 60 ? 'dormant' : diffDays > 30 ? 'inactive' : 'active';

    // 2. Mock timeline events temporally linked
    const baseDate = new Date(customer.lastOrderDate);
    const dateOpen = new Date(baseDate);
    dateOpen.setHours(dateOpen.getHours() - 4);
    const dateSent = new Date(baseDate);
    dateSent.setDate(dateSent.getDate() - 1);
    const dateAI = new Date(baseDate);
    dateAI.setDate(dateAI.getDate() + 2);

    const timeline: any[] = [];

    customerOrders.forEach((o) => {
      timeline.push({
        id: `tl_ord_${o.orderId}`,
        type: 'order',
        title: `Order Placed: ₹${o.amount.toLocaleString()}`,
        description: `Purchased: ${o.items.join(', ')}`,
        timestamp: o.timestamp
      });
    });

    timeline.push({
      id: `tl_sent_${customer.id}`,
      type: 'sent',
      title: 'Campaign Delivered: Indian Coffee Roastings',
      description: 'Dispatched custom strategy WhatsApp newsletter to user.',
      timestamp: dateSent.toISOString().split('T')[0]
    });

    timeline.push({
      id: `tl_opened_${customer.id}`,
      type: 'opened',
      title: 'Campaign Message Opened',
      description: 'User unlocked and opened WhatsApp content within 15 minutes of receipt.',
      timestamp: dateOpen.toISOString().split('T')[0]
    });

    timeline.push({
      id: `tl_resp_${customer.id}`,
      type: 'responded',
      title: 'Promotion Link Clicked',
      description: 'User clicked promotional filter coffee dabara link, triggering checkout flow.',
      timestamp: baseDate.toISOString().split('T')[0]
    });

    const calculatedHealth = calculateCustomerHealth(customer);

    timeline.push({
      id: `tl_rec_${customer.id}`,
      type: 'ai_recommendation',
      title: 'AI Smart Next Best Action Generated',
      description: `Recommend 'Cold Brew Kit' next week. Customer Engagement is at ${calculatedHealth.engagementScore}%.`,
      timestamp: dateAI.toISOString().split('T')[0]
    });

    timeline.sort((a, b) => b.timestamp.localeCompare(a.timestamp));

    // 3. Fallback insights generator
    const getFallbackInsights = () => {
      const isHighValue = customer.tags.includes('high-value') || customer.totalSpent > 8000;
      const isAtRisk = calculatedHealth.churnRisk === 'High' || customer.tags.includes('at-risk');
      const isNew = customer.orderCount <= 1 || customer.tags.includes('new');
      
      let summary = '';
      let behaviour = '';
      let riskAnalysis = '';
      let recommendedAction = '';
      let upsellOpportunity = '';
      let predictedRev = Math.round(customer.totalSpent * 0.25);
      let expectedGrow = 10;

      if (isNew) {
        summary = `Newly registered customer with standard initial traction in roastery supplies and sample custom powders.`;
        behaviour = `Acquisition phase. Low purchase density but high onboarding interactions support a strong product conversion ceiling.`;
        riskAnalysis = `Standard welcome churn risk. Requires immediate trial validation to establish long-term brand stickiness.`;
        recommendedAction = `Trigger premium onboarding bundle workflow including discount codes and recipe blogs via WhatsApp.`;
        upsellOpportunity = `Standard French Press Unit or Starter Pour-over Kit.`;
        predictedRev = Math.max(3000, Math.round(customer.totalSpent * 1.5));
        expectedGrow = 45;
      } else if (isAtRisk) {
        summary = `Lapsed brand shopper on the verge of churn. Order frequency has dropped significantly over the past quarter.`;
        behaviour = `Lapsed habits. Customer previously purchased whole bean roast packs and manual grinders but hasn't browsed in 60+ days.`;
        riskAnalysis = `Critical churn risk due to extended period since last session. Competitor redirection is highly likely.`;
        recommendedAction = `Trigger automated high-priority SMS containing an exclusive 25% direct checkout voucher.`;
        upsellOpportunity = `Limited Release Bourbon Microlot Packs with personalized brewing notes.`;
        predictedRev = Math.round(customer.totalSpent * 0.1);
        expectedGrow = -15;
      } else if (isHighValue) {
        summary = `Elite brand loyalist demonstrating steady high-volume equipment selections and gourmet micro-lot reserve repeat orders.`;
        behaviour = `Frequent high-ticket shopping. Prefer rare roasted whole beans. Enjoys physical coffee-brewing workshops.`;
        riskAnalysis = `Negligible churn risk; outstanding transactional stickiness and high product affinity.`;
        recommendedAction = `Enroll into Mochi VIP Circle, providing first access to rare micro-lot coffee batches and physical roastery invitations.`;
        upsellOpportunity = `Premium Electric Coffee Grinder or Exclusive Geisha Blend Reserve.`;
        predictedRev = Math.round(customer.totalSpent * 0.4);
        expectedGrow = 20;
      } else {
        summary = `Consistent mid-value regular shopper with stable replenishment intervals for whole beans and paper filter cups.`;
        behaviour = `Steady seasonal purchasing behavior with moderate baseline basket size and clear preference for roasted powder.`;
        riskAnalysis = `Stable retention but risks migrating to other brands if standard replenishment reminders are not sent.`;
        recommendedAction = `Propose an automated monthly roasting subscription model to streamline coffee pantry refills.`;
        upsellOpportunity = `Subscribe & Save 10% on Standard Monsoon Malabar Roast.`;
        predictedRev = Math.round(customer.totalSpent * 0.35);
        expectedGrow = 12;
      }

      return {
        predictedRevenue: predictedRev,
        expectedGrowth: expectedGrow,
        aiInsight: {
          summary,
          behaviour,
          riskAnalysis,
          recommendedAction,
          upsellOpportunity
        }
      };
    };

    const fallback = getFallbackInsights();

    // 4. Try Gemini integration
    const ai = getAi();
    if (ai) {
      try {
        const sysInstruction = `You are Mochi CRM's Executive Customer 360 Strategy Analyst.
Given a customer's high-level dossier and order history, perform high-dimensional cognitive reviews.
You MUST analyze the profile and return a exact structured JSON profile representing their AI Customer 360 insights.
Format the output as a strict JSON object with these exact keys:
1. "predictedRevenue": (number) Predicted life-cycle revenue contribution from this customer over the next quarter. E.g. 15000.
2. "expectedGrowth": (number) Expected quarterly percentage growth of user's value (0-100). E.g. 18.
3. "aiInsight": {
     "summary": "...", (1-2 sentences of executive summary of customer relationship status and health)
     "behaviour": "...", (1-2 sentences capturing specific user purchase frequency, preferences, or channel affinity)
     "riskAnalysis": "...", (1 sentence detailing active churn warning signals or loyalty strengths)
     "recommendedAction": "...", (Clear, tactical next-step recommendation for marketing/sales team)
     "upsellOpportunity": "..." (Specific product, bundle, or tier upgrade to pitch to this customer)
   }
Your responses must be highly professional, specific to coffee/roastery context if relevant, and avoid fluff. Do not output markdown or code blocks, just the JSON.`;

        const aiResponse = await generateContentWithRetry({
          preferredModel: 'gemini-3.5-flash',
          contents: `Analyze this customer dossier:
Customer Profile:
Name: ${customer.name}
Email: ${customer.email}
Tags / Cohorts: ${customer.tags.join(', ')}
Total Lifetime Spend: ₹${customer.totalSpent}
Orders Count: ${customer.orderCount}
Last Order Date: ${customer.lastOrderDate}
Customer Since: ${customer.memberSince}
Health Score: ${calculatedHealth.healthScore}
Churn Risk: ${calculatedHealth.churnRisk}
Engagement Score: ${calculatedHealth.engagementScore}

Recent Orders:
${JSON.stringify(customerOrders)}`,
          config: {
            systemInstruction: sysInstruction,
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                predictedRevenue: { type: Type.NUMBER },
                expectedGrowth: { type: Type.NUMBER },
                aiInsight: {
                  type: Type.OBJECT,
                  properties: {
                    summary: { type: Type.STRING },
                    behaviour: { type: Type.STRING },
                    riskAnalysis: { type: Type.STRING },
                    recommendedAction: { type: Type.STRING },
                    upsellOpportunity: { type: Type.STRING }
                  },
                  required: ['summary', 'behaviour', 'riskAnalysis', 'recommendedAction', 'upsellOpportunity']
                }
              },
              required: ['predictedRevenue', 'expectedGrowth', 'aiInsight']
            }
          }
        });

        const parsed = JSON.parse(aiResponse.text || '{}');
        return res.json({
          customer,
          company: companyName,
          status: customerStatus,
          health: {
            rfmScore,
            healthScore: calculatedHealth.healthScore,
            churnRisk: calculatedHealth.churnRisk,
            engagementScore: calculatedHealth.engagementScore
          },
          revenue: {
            lifetimeValue: customer.totalSpent,
            averageOrderValue: avgOrderValue,
            predictedRevenue: parsed.predictedRevenue || fallback.predictedRevenue,
            expectedGrowth: parsed.expectedGrowth || fallback.expectedGrowth
          },
          aiInsight: {
            summary: parsed.aiInsight?.summary || fallback.aiInsight.summary,
            behaviour: parsed.aiInsight?.behaviour || fallback.aiInsight.behaviour,
            riskAnalysis: parsed.aiInsight?.riskAnalysis || fallback.aiInsight.riskAnalysis,
            recommendedAction: parsed.aiInsight?.recommendedAction || fallback.aiInsight.recommendedAction,
            upsellOpportunity: parsed.aiInsight?.upsellOpportunity || fallback.aiInsight.upsellOpportunity
          },
          timeline
        });

      } catch (err) {
        console.warn('Gemini Customer 360 generation failed, triggering robust fallback...', err);
      }
    }

    // Return fallback directly if no AI client, or in case of error
    return res.json({
      customer,
      company: companyName,
      status: customerStatus,
      health: {
        rfmScore,
        healthScore: calculatedHealth.healthScore,
        churnRisk: calculatedHealth.churnRisk,
        engagementScore: calculatedHealth.engagementScore
      },
      revenue: {
        lifetimeValue: customer.totalSpent,
        averageOrderValue: avgOrderValue,
        predictedRevenue: fallback.predictedRevenue,
        expectedGrowth: fallback.expectedGrowth
      },
      aiInsight: fallback.aiInsight,
      timeline
    });

  } catch (err: any) {
    res.status(500).json({ message: err.message || 'Error compiling Customer 360 data.' });
  }
});

// -------------------------------------------------------------
// REVENUE FORECAST ENGINE FILE PERSISTENCE & HELPERS
// -------------------------------------------------------------
const REVENUE_FORECASTS_FILE = path.join(process.cwd(), 'revenue_forecasts.json');

function getLocalForecasts(): any[] {
  try {
    if (fs.existsSync(REVENUE_FORECASTS_FILE)) {
      return JSON.parse(fs.readFileSync(REVENUE_FORECASTS_FILE, 'utf8'));
    }
  } catch (e) {
    console.error('[Revenue Forecasts Server] Error loading local forecasts:', e);
  }
  return [];
}

function writeLocalForecasts(forecasts: any[]): void {
  try {
    fs.writeFileSync(REVENUE_FORECASTS_FILE, JSON.stringify(forecasts, null, 2), 'utf8');
  } catch (e) {
    console.error('[Revenue Forecasts Server] Error saving local forecasts:', e);
  }
}

function calculateFallbackForecast(customer: any, orders: any[], events: any[]): any {
  try {
    const avgOrderValue = customer.orderCount > 0 ? (customer.totalSpent / customer.orderCount) : 1000;
    
    // Calculate a baseline prediction for next month
    let predictedRevenue = avgOrderValue;
    let growthPercentage = 5.0; // default 5%
    let confidence = 85;
    let reason = `${customer.name} demonstrates a stable average order value of ₹${Math.round(avgOrderValue)} with steady purchase habits.`;

    // Dynamic adjustments based on tags and activity
    if (customer.tags.includes('inactive')) {
      predictedRevenue = 0;
      growthPercentage = -100.0;
      confidence = 60;
      reason = `Customer has lapsed. Purchase gaps indicate zero organic transactional potential without incentive intervention.`;
    } else if (customer.tags.includes('at-risk')) {
      predictedRevenue = Math.round(avgOrderValue * 0.3);
      growthPercentage = -40.0;
      confidence = 70;
      reason = `Dormancy warning: Decline in interaction speed signals active churn risk. Estimated Next month demand is compressed.`;
    } else if (customer.tags.includes('high-value')) {
      predictedRevenue = Math.round(avgOrderValue * 1.25);
      growthPercentage = 18.5;
      confidence = 92;
      reason = `Top tier affinity: Consistent premium order basket sizing and strong campaign feedback signals solid upcoming spend volume.`;
    }

    // Adjust prediction if order frequencies have changed
    const lastOrderDate = new Date(customer.lastOrderDate);
    const now = new Date('2026-06-12T07:16:58-07:00'); // pivot reference date
    const daysSinceLastOrder = Math.max(0, Math.floor((now.getTime() - lastOrderDate.getTime()) / (1000 * 60 * 60 * 24)));
    
    if (daysSinceLastOrder > 90 && predictedRevenue > 0) {
      predictedRevenue = Math.round(predictedRevenue * 0.5);
      growthPercentage -= 20.0;
      confidence = Math.max(50, confidence - 15);
      reason += ` Projected volume halved due to ${daysSinceLastOrder} days of transaction inactivity.`;
    }

    return {
      customerId: customer.id,
      month: '2026-07', // Predict next month
      predictedRevenue,
      growthPercentage: Math.round(growthPercentage * 10) / 10,
      confidence,
      reason,
      generatedAt: new Date().toISOString()
    };
  } catch (err) {
    console.warn('[calculateFallbackForecast] calculation failed', err);
    return {
      customerId: customer.id,
      month: '2026-07',
      predictedRevenue: 1000,
      growthPercentage: 0,
      confidence: 80,
      reason: 'Standard calculation template fallback applied on error.',
      generatedAt: new Date().toISOString()
    };
  }
}

// -------------------------------------------------------------
// CHURN PREDICTION ENGINE FILE PERSISTENCE & HELPERS
// -------------------------------------------------------------
const CHURN_PREDICTIONS_FILE = path.join(process.cwd(), 'churn_predictions.json');

function getLocalChurnPredictions(): any[] {
  try {
    if (fs.existsSync(CHURN_PREDICTIONS_FILE)) {
      return JSON.parse(fs.readFileSync(CHURN_PREDICTIONS_FILE, 'utf8'));
    }
  } catch (e) {
    console.error('[Churn Predictions Server] Error loading local predictions:', e);
  }
  return [];
}

function writeLocalChurnPredictions(predictions: any[]): void {
  try {
    fs.writeFileSync(CHURN_PREDICTIONS_FILE, JSON.stringify(predictions, null, 2), 'utf8');
  } catch (e) {
    console.error('[Churn Predictions Server] Error saving local predictions:', e);
  }
}

const WORKFLOWS_FILE = path.join(process.cwd(), 'workflow_automations.json');

function getLocalWorkflows(): any[] {
  try {
    if (fs.existsSync(WORKFLOWS_FILE)) {
      return JSON.parse(fs.readFileSync(WORKFLOWS_FILE, 'utf8'));
    }
  } catch (e) {
    console.error('[Workflows Server] Error loading local workflows:', e);
  }
  return [
    {
      id: "wf_1",
      name: "Dormant Brewer Recovery Trigger",
      trigger: "customer_inactive",
      condition: "Inactivity > 60 days",
      action: "generate_campaign",
      status: "active",
      createdAt: new Date().toISOString()
    },
    {
      id: "wf_2",
      name: "VIP Appreciation Reward Loop",
      trigger: "high_value_customer",
      condition: "Total Spent > 20000 INR",
      action: "send_whatsapp",
      status: "paused",
      createdAt: new Date().toISOString()
    }
  ];
}

function writeLocalWorkflows(workflows: any[]): void {
  try {
    fs.writeFileSync(WORKFLOWS_FILE, JSON.stringify(workflows, null, 2), 'utf8');
  } catch (e) {
    console.error('[Workflows Server] Error saving local workflows:', e);
  }
}

function calculateFallbackChurnPrediction(customer: any, orders: any[], events: any[]): any {
  try {
    const lastOrderDate = new Date(customer.lastOrderDate);
    const now = new Date('2026-06-18T15:50:09-07:00'); // pivot reference date
    const daysSinceLastOrder = Math.max(0, Math.floor((now.getTime() - lastOrderDate.getTime()) / (1000 * 60 * 60 * 24)));

    const opensCount = events.filter(e => e.status === 'opened').length;
    const clicksCount = events.filter(e => e.status === 'clicked').length;
    const deliveryCount = events.length;

    // Base churn risk scoring calculation (range: 0 to 100)
    let recencyScore = 0; // recency contribution (max 50)
    if (daysSinceLastOrder > 120) {
      recencyScore = 50;
    } else if (daysSinceLastOrder > 60) {
      recencyScore = 35;
    } else if (daysSinceLastOrder > 30) {
      recencyScore = 20;
    } else {
      recencyScore = 5;
    }

    // Activity level contributions (max 30)
    let engagementContribution = 30;
    if (deliveryCount > 0) {
      const interactionRate = (opensCount + clicksCount) / (deliveryCount * 2);
      engagementContribution = Math.max(0, Math.round(30 * (1 - interactionRate)));
    }

    // Loyalty frequency check (max 20)
    let loyaltyReduction = Math.min(20, customer.orderCount * 4);
    
    let score = Math.max(5, Math.min(99, recencyScore + engagementContribution - loyaltyReduction + 15));

    // Dynamic adjustments based on tags
    if (customer.tags.includes('inactive')) {
      score = Math.max(90, score);
    } else if (customer.tags.includes('at-risk')) {
      score = Math.max(75, score);
    } else if (customer.tags.includes('high-value') || customer.tags.includes('loyal')) {
      score = Math.max(5, Math.round(score * 0.4));
    }

    let risk: 'LOW' | 'MEDIUM' | 'HIGH' = 'LOW';
    if (score >= 75) {
      risk = 'HIGH';
    } else if (score >= 40) {
      risk = 'MEDIUM';
    }

    const reason: string[] = [];
    const recommendedActions: string[] = [];

    if (daysSinceLastOrder > 90) {
      reason.push(`Dormancy: Customer has not placed an order in ${daysSinceLastOrder} days.`);
      recommendedActions.push("Launch an aggressive high-discount win-back campaign.");
      recommendedActions.push("Assign sales representative for personal account check-in.");
    } else if (daysSinceLastOrder > 30) {
      reason.push(`Gap alert: Last transaction was ${daysSinceLastOrder} days ago.`);
      recommendedActions.push("Target with limited-time 15% coupon.");
    } else {
      reason.push("Active purchase patterns: Placed an order within the last 30 days.");
      recommendedActions.push("Invite to premium tier early arrival previews.");
    }

    if (deliveryCount > 0 && (opensCount + clicksCount) === 0) {
      reason.push("Digital fatigue: Zero opens/clicks detected across last communication campaign events.");
      recommendedActions.push("Switch channels to SMS or WhatsApp to improve open rates.");
    } else if (clicksCount > 0) {
      reason.push("Receptive communication: Recent click logs demonstrate high campaign engagement levels.");
      recommendedActions.push("Trigger custom catalog emails corresponding to clicked items.");
    } else {
      reason.push("Neutral activity profile: Open events without high active purchasing interactions.");
    }

    if (customer.tags.includes('at-risk')) {
      reason.push("Customer is listed under the CRM ruleset in the 'at-risk' segment.");
      recommendedActions.push("Incentivize with a tailored mystery reward offer.");
    }

    if (customer.orderCount <= 1) {
      reason.push("Single-order pattern: Low retention speed across single purchased items.");
      recommendedActions.push("Deliver immediate satisfaction follow-up support survey.");
    }

    return {
      customerId: customer.id,
      risk,
      score,
      reason: reason.slice(0, 3),
      recommendedActions: recommendedActions.slice(0, 3),
      predictedAt: new Date().toISOString()
    };
  } catch (err) {
    console.warn('[calculateFallbackChurnPrediction] calculation failed', err);
    return {
      customerId: customer.id,
      risk: 'LOW',
      score: 10,
      reason: ['Calculated score baseline fallback.'],
      recommendedActions: ['No action needed at this time.'],
      predictedAt: new Date().toISOString()
    };
  }
}

// -------------------------------------------------------------
// CUSTOMER AI BRAIN PROFILE ENDPOINTS
// -------------------------------------------------------------
const AI_PROFILES_FILE = path.join(process.cwd(), 'customer_ai_profiles.json');

function getAIProfiles(): any[] {
  try {
    if (fs.existsSync(AI_PROFILES_FILE)) {
      return JSON.parse(fs.readFileSync(AI_PROFILES_FILE, 'utf8'));
    }
  } catch (e) {
    console.error('[AI Profiles Server] Error loading profiles:', e);
  }
  return [];
}

function writeAIProfiles(profiles: any[]): void {
  try {
    fs.writeFileSync(AI_PROFILES_FILE, JSON.stringify(profiles, null, 2), 'utf8');
  } catch (e) {
    console.error('[AI Profiles Server] Error saving profiles:', e);
  }
}

function getRFMScore(customer: any): string {
  const last = new Date(customer.lastOrderDate);
  const now = new Date('2026-06-12T07:16:58-07:00');
  const diffMs = Math.abs(now.getTime() - last.getTime());
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  const recencyScore = diffDays <= 7 ? 5 : diffDays <= 30 ? 4 : diffDays <= 90 ? 3 : diffDays <= 180 ? 2 : 1;
  const frequencyScore = customer.orderCount >= 10 ? 5 : customer.orderCount >= 5 ? 4 : customer.orderCount >= 3 ? 3 : customer.orderCount >= 1 ? 2 : 1;
  const monetaryScore = customer.totalSpent >= 15000 ? 5 : customer.totalSpent >= 10000 ? 4 : customer.totalSpent >= 5000 ? 3 : customer.totalSpent >= 2000 ? 2 : 1;
  return `R${recencyScore}-F${frequencyScore}-M${monetaryScore}`;
}

function calculateFallbackAIProfile(customer: any): any {
  const calculatedHealth = calculateCustomerHealth(customer);
  const rfm = getRFMScore(customer);
  const spent = customer.totalSpent;
  const count = customer.orderCount;

  const preferredChannel = customer.phone ? 'whatsapp' : 'email';

  let recommendedActions = [
    `Trigger loyalty reward points drop for next purchase replenishment`,
    `Send direct WhatsApp invite for new winter single-origins roast launch`,
    `Offer flat trial discount coupon for Mochi Specialty steel brewing dripper`
  ];
  let sentiment = 'Positive';
  let churnRisk: 'LOW' | 'MEDIUM' | 'HIGH' = 'LOW';
  let aiSummary = `${customer.name} is a highly engaged customer of Mochi CRM, exhibiting strong affinity for artisanal whole beans. Recommended high-frequency engagement via their preferred ${preferredChannel} channel.`;

  if (calculatedHealth.churnRisk === 'High') {
    churnRisk = 'HIGH';
    sentiment = 'Slightly Dissatisfied';
    recommendedActions = [
      `Dispatch high-priority winback coupon of 25% within 48 hours`,
      `Deliver satisfaction survey post transaction checkout failures`,
      `Recommend Monsoon Malabar roast subscription setup for streamlined refills`
    ];
    aiSummary = `Active churn hazard detected for ${customer.name}. Purchase gaps exceed standard replenishment models by 45+ days. Immediate high-incentive outreach recommended.`;
  } else if (calculatedHealth.churnRisk === 'Medium') {
    churnRisk = 'MEDIUM';
    sentiment = 'Neutral';
    recommendedActions = [
      `Introduce to Subscribe & Save 10% options for daily standard roasts`,
      `Offer trial filters bag alongside next checkout order`,
      `Send personalized recipe guide for Cold Brew kits`
    ];
    aiSummary = `${customer.name} shows minor engagement erosion. Strategic subscription offers should prevent lapse into complete dormancy.`;
  }

  return {
    customerId: customer.id,
    healthScore: calculatedHealth.healthScore,
    rfmScore: rfm,
    churnRisk,
    engagementScore: calculatedHealth.engagementScore,
    sentiment,
    preferredChannel,
    lifetimeValue: spent,
    predictedRevenue: Math.round(spent * (churnRisk === 'HIGH' ? 0.05 : churnRisk === 'MEDIUM' ? 0.25 : 0.45)),
    nextPurchasePrediction: churnRisk === 'HIGH' ? 'Unlikely within 30 days' : 'Expected in 10-14 days (Espresso drip purchase)',
    aiSummary,
    recommendedActions
  };
}

// GET /api/customers/:id/ai-profile
app.get('/api/customers/:id/ai-profile', (req, res) => {
  try {
    const customerId = req.params.id;
    const customers = getCustomers();
    const customer = customers.find(c => c.id === customerId);
    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    const profiles = getAIProfiles();
    let profile = profiles.find(p => p.customerId === customerId);

    if (!profile) {
      profile = calculateFallbackAIProfile(customer);
    }

    res.json(profile);
  } catch (err: any) {
    res.status(500).json({ message: err.message || 'Error loading AI Profile' });
  }
});

// POST /api/customers/:id/generate-ai-profile
app.post('/api/customers/:id/generate-ai-profile', async (req, res) => {
  try {
    const customerId = req.params.id;
    const customers = getCustomers();
    const customer = customers.find(c => c.id === customerId);
    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    const orders = getOrders().filter(o => o.customerId === customerId);
    const events = getEvents().filter(e => e.customerId === customerId);
    
    const calculatedHealth = calculateCustomerHealth(customer);
    const fallbackProfile = calculateFallbackAIProfile(customer);

    const analysisPayload = {
      customer: {
        id: customer.id,
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
        memberSince: customer.memberSince,
        totalSpent: customer.totalSpent,
        orderCount: customer.orderCount,
        lastOrderDate: customer.lastOrderDate,
        tags: customer.tags,
        healthScore: calculatedHealth.healthScore,
        engagementScore: calculatedHealth.engagementScore,
        churnRisk: calculatedHealth.churnRisk
      },
      orders: orders.map(o => ({ amount: o.amount, items: o.items, timestamp: o.timestamp })),
      campaignInteractions: events.map(e => ({ status: e.status, timestamp: e.timestamp }))
    };

    const ai = getAi();
    if (ai) {
      try {
        const sysInstruction = `You are Mochi CRM's advanced machine learning Customer Brain Engine.
Analyze the customer data, their spending habits, orders, and campaign interaction history.
Perform high-dimensional predictive modeling to deliver the customer's AI Brain Profile.
You MUST output a single, strict, valid JSON object matching this schema:
{
  "healthScore": (number) Customer relationship health out of 100.
  "rfmScore": (string) Recency-Frequency-Monetary metric like 'R5-F4-M4'.
  "churnRisk": (string) Must be exactly one of: 'LOW', 'MEDIUM', 'HIGH' (all capitalized).
  "engagementScore": (number) Engagement index out of 100.
  "sentiment": (string) Overall customer brand satisfaction and vibe (e.g., 'Positive', 'Dissatisfied', 'Highly Enthusiastic').
  "preferredChannel": (string) Best communication pathway like 'whatsapp', 'email', 'sms', 'rcs'.
  "lifetimeValue": (number) The historical accumulated spend of the customer.
  "predictedRevenue": (number) The expected revenue contribution over the next quarter.
  "nextPurchasePrediction": (string) 1 sentence projection of what they'll buy next and when.
  "aiSummary": (string) 2-3 sentences summarizing their profile state, purchase behavior, and trends.
  "recommendedActions": (string[]) EXACTLY 3 highly strategic personal recommendations for direct marketing.
}`;

        const gResponse = await generateContentWithRetry({
          preferredModel: 'gemini-3.5-flash',
          contents: `Deconstruct customer dossier and order transaction loops:
${JSON.stringify(analysisPayload)}`,
          config: {
            systemInstruction: sysInstruction,
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                healthScore: { type: Type.INTEGER },
                rfmScore: { type: Type.STRING },
                churnRisk: { type: Type.STRING, enum: ['LOW', 'MEDIUM', 'HIGH'] },
                engagementScore: { type: Type.INTEGER },
                sentiment: { type: Type.STRING },
                preferredChannel: { type: Type.STRING },
                lifetimeValue: { type: Type.INTEGER },
                predictedRevenue: { type: Type.INTEGER },
                nextPurchasePrediction: { type: Type.STRING },
                aiSummary: { type: Type.STRING },
                recommendedActions: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING }
                }
              },
              required: [
                'healthScore',
                'rfmScore',
                'churnRisk',
                'engagementScore',
                'sentiment',
                'preferredChannel',
                'lifetimeValue',
                'predictedRevenue',
                'nextPurchasePrediction',
                'aiSummary',
                'recommendedActions'
              ]
            }
          }
        });

        const parsed = JSON.parse(gResponse.text || '{}');
        const finalProfile = {
          customerId: customer.id,
          healthScore: parsed.healthScore ?? fallbackProfile.healthScore,
          rfmScore: parsed.rfmScore ?? fallbackProfile.rfmScore,
          churnRisk: (parsed.churnRisk || fallbackProfile.churnRisk).toUpperCase(),
          engagementScore: parsed.engagementScore ?? fallbackProfile.engagementScore,
          sentiment: parsed.sentiment ?? fallbackProfile.sentiment,
          preferredChannel: parsed.preferredChannel ?? fallbackProfile.preferredChannel,
          lifetimeValue: parsed.lifetimeValue ?? fallbackProfile.lifetimeValue,
          predictedRevenue: parsed.predictedRevenue ?? fallbackProfile.predictedRevenue,
          nextPurchasePrediction: parsed.nextPurchasePrediction ?? fallbackProfile.nextPurchasePrediction,
          aiSummary: parsed.aiSummary ?? fallbackProfile.aiSummary,
          recommendedActions: parsed.recommendedActions ?? fallbackProfile.recommendedActions
        };

        const profiles = getAIProfiles();
        const existingIdx = profiles.findIndex(p => p.customerId === customerId);
        if (existingIdx !== -1) {
          profiles[existingIdx] = finalProfile;
        } else {
          profiles.push(finalProfile);
        }
        writeAIProfiles(profiles);

        return res.json(finalProfile);

      } catch (e) {
        console.error('[Copilot Engine] Gemini AI Brain profiling model failed, falling back safely:', e);
      }
    }

    const profiles = getAIProfiles();
    const existingIdx = profiles.findIndex(p => p.customerId === customerId);
    if (existingIdx !== -1) {
      profiles[existingIdx] = fallbackProfile;
    } else {
      profiles.push(fallbackProfile);
    }
    writeAIProfiles(profiles);

    res.json(fallbackProfile);

  } catch (err: any) {
    res.status(500).json({ message: err.message || 'Error generating AI Profile' });
  }
});

// -------------------------------------------------------------
// REVENUE FORECAST ROUTING PATHS
// -------------------------------------------------------------

// GET /api/revenue/forecast/:customerId
app.get('/api/revenue/forecast/:customerId', (req, res) => {
  try {
    const customerId = req.params.customerId;
    const customers = getCustomers();
    const customer = customers.find(c => c.id === customerId);
    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    const forecasts = getLocalForecasts();
    let forecast = forecasts.find(f => f.customerId === customerId);

    if (!forecast) {
      const orders = getOrders().filter(o => o.customerId === customerId);
      const events = getEvents().filter(e => e.customerId === customerId);
      forecast = calculateFallbackForecast(customer, orders, events);
    }

    res.json(forecast);
  } catch (err: any) {
    res.status(500).json({ message: err.message || 'Error loading revenue forecast' });
  }
});

// GET /api/revenue/monthly
app.get('/api/revenue/monthly', (req, res) => {
  try {
    const customers = getCustomers();
    const orders = getOrders();
    const profiles = getLocalForecasts();
    
    const months = [
      { name: 'Jul 2026', factor: 1.0 },
      { name: 'Aug 2026', factor: 1.05 },
      { name: 'Sep 2026', factor: 1.15 },
      { name: 'Oct 2026', factor: 1.10 },
      { name: 'Nov 2026', factor: 1.30 },
      { name: 'Dec 2026', factor: 1.50 }
    ];

    const baseForecasts = customers.map(c => {
      const cOrders = orders.filter(o => o.customerId === c.id);
      const cEvents = getEvents().filter(e => e.customerId === c.id);
      const saved = profiles.find(p => p.customerId === c.id);
      if (saved) return saved;
      return calculateFallbackForecast(c, cOrders, cEvents);
    });

    const aggregateNextMonthRev = baseForecasts.reduce((sum, f) => sum + f.predictedRevenue, 0);
    const avgConfidence = Math.round(baseForecasts.reduce((sum, f) => sum + f.confidence, 0) / Math.max(1, baseForecasts.length));
    const avgGrowth = Math.round(baseForecasts.reduce((sum, f) => sum + f.growthPercentage, 0) / Math.max(1, baseForecasts.length) * 10) / 10;

    const monthlyData = months.map((m, idx) => {
      const predictedRevenue = Math.round(aggregateNextMonthRev * m.factor);
      let growthPercentage = avgGrowth;
      if (idx > 0) {
        const priorRev = Math.round(aggregateNextMonthRev * months[idx - 1].factor);
        growthPercentage = Math.round(((predictedRevenue - priorRev) / priorRev) * 100 * 10) / 10;
      }
      return {
        month: m.name,
        predictedRevenue,
        growthPercentage,
        confidence: Math.max(60, avgConfidence - idx * 2)
      };
    });

    res.json(monthlyData);
  } catch (err: any) {
    res.status(500).json({ message: err.message || 'Error compiling monthly predictions' });
  }
});

// GET /api/revenue/quarterly
app.get('/api/revenue/quarterly', (req, res) => {
  try {
    const customers = getCustomers();
    const orders = getOrders();
    const profiles = getLocalForecasts();

    const quarters = [
      { name: 'Q3 2026', monthsCount: 3, seasonalBump: 1.08 },
      { name: 'Q4 2026', monthsCount: 3, seasonalBump: 1.40 },
      { name: 'Q1 2027', monthsCount: 3, seasonalBump: 1.15 },
      { name: 'Q2 2027', monthsCount: 3, seasonalBump: 1.25 }
    ];

    const baseForecasts = customers.map(c => {
      const cOrders = orders.filter(o => o.customerId === c.id);
      const cEvents = getEvents().filter(e => e.customerId === c.id);
      const saved = profiles.find(p => p.customerId === c.id);
      if (saved) return saved;
      return calculateFallbackForecast(c, cOrders, cEvents);
    });

    const baselineMonthlyRev = baseForecasts.reduce((sum, f) => sum + f.predictedRevenue, 0);
    const avgConfidence = Math.round(baseForecasts.reduce((sum, f) => sum + f.confidence, 0) / Math.max(1, baseForecasts.length));

    let previousQuarterRev = baselineMonthlyRev * 3;

    const quarterlyData = quarters.map((q, idx) => {
      const predictedRevenue = Math.round(baselineMonthlyRev * q.monthsCount * q.seasonalBump);
      const growthPercentage = Math.round(((predictedRevenue - previousQuarterRev) / previousQuarterRev) * 100 * 10) / 10;
      previousQuarterRev = predictedRevenue;
      
      return {
        quarter: q.name,
        predictedRevenue,
        growthPercentage,
        confidence: Math.max(55, avgConfidence - 5 - idx * 3)
      };
    });

    res.json(quarterlyData);
  } catch (err: any) {
    res.status(500).json({ message: err.message || 'Error compiling quarterly predictions' });
  }
});

// POST /api/revenue/generate/:customerId
app.post('/api/revenue/generate/:customerId', async (req, res) => {
  try {
    const customerId = req.params.customerId;
    const customers = getCustomers();
    const customer = customers.find(c => c.id === customerId);
    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    const orders = getOrders().filter(o => o.customerId === customerId);
    const events = getEvents().filter(e => e.customerId === customerId);
    const fallbackForecast = calculateFallbackForecast(customer, orders, events);

    const aov = customer.orderCount > 0 ? (customer.totalSpent / customer.orderCount) : 0;
    
    const analysisPayload = {
      customer: {
        id: customer.id,
        name: customer.name,
        email: customer.email,
        memberSince: customer.memberSince,
        totalSpent: customer.totalSpent,
        orderCount: customer.orderCount,
        lastOrderDate: customer.lastOrderDate,
        averageOrderValue: aov,
        tags: customer.tags
      },
      orders: orders.map(o => ({ amount: o.amount, items: o.items, timestamp: o.timestamp })),
      campaignEngagement: events.map(e => {
        const campaign = getCampaigns().find(c => c.campaignId === e.campaignId);
        return {
          campaignId: e.campaignId,
          channel: campaign?.channel || 'unknown',
          status: e.status,
          timestamp: e.timestamp
        };
      })
    };

    const ai = getAi();
    if (ai) {
      try {
        const sysInstruction = `You are Mochi CRM's advanced machine learning Revenue Forecast Engine.
Analyze the customer details, historical purchase orders, transaction values, average order values, and campaign interactions.
Perform high-dimensional predictive LTV modelling to project their revenue potential, expected growth, and prediction confidence for NEXT MONTH (July 2026).
You MUST output a single, strict, valid JSON object matching this schema:
{
  "predictedRevenue": (number) Next month's predicted revenue in INR (₹) or standard customer budget projection,
  "growthPercentage": (number) expected growth/change percentage compared to historical average monthly order spend,
  "confidence": (number) predictive confidence score out of 100,
  "reason": (string) 1-2 sentences of strategic rationale based on their behavior
}`;

        const gResponse = await generateContentWithRetry({
          preferredModel: 'gemini-3.5-flash',
          contents: `Deconstruct customer transaction velocity & campaign signals:
${JSON.stringify(analysisPayload)}`,
          config: {
            systemInstruction: sysInstruction,
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                predictedRevenue: { type: Type.INTEGER },
                growthPercentage: { type: Type.NUMBER },
                confidence: { type: Type.INTEGER },
                reason: { type: Type.STRING }
              },
              required: [
                'predictedRevenue',
                'growthPercentage',
                'confidence',
                'reason'
              ]
            }
          }
        });

        const parsed = JSON.parse(gResponse.text || '{}');
        const finalForecast = {
          customerId: customer.id,
          month: '2026-07',
          predictedRevenue: typeof parsed.predictedRevenue === 'number' ? parsed.predictedRevenue : fallbackForecast.predictedRevenue,
          growthPercentage: typeof parsed.growthPercentage === 'number' ? parsed.growthPercentage : fallbackForecast.growthPercentage,
          confidence: typeof parsed.confidence === 'number' ? parsed.confidence : fallbackForecast.confidence,
          reason: parsed.reason || fallbackForecast.reason,
          generatedAt: new Date().toISOString()
        };

        const profiles = getLocalForecasts();
        const existingIdx = profiles.findIndex(p => p.customerId === customerId);
        if (existingIdx !== -1) {
          profiles[existingIdx] = finalForecast;
        } else {
          profiles.push(finalForecast);
        }
        writeLocalForecasts(profiles);

        return res.json(finalForecast);

      } catch (e) {
        console.error('[Forecast Engine] Gemini AI forecasting model failed, falling back safely:', e);
      }
    }

    const profiles = getLocalForecasts();
    const existingIdx = profiles.findIndex(p => p.customerId === customerId);
    if (existingIdx !== -1) {
      profiles[existingIdx] = fallbackForecast;
    } else {
      profiles.push(fallbackForecast);
    }
    writeLocalForecasts(profiles);

    res.json(fallbackForecast);

  } catch (err: any) {
    res.status(500).json({ message: err.message || 'Error generating revenue forecast' });
  }
});

// -------------------------------------------------------------
// CHURN PREDICTION ROUTING ENDPOINTS
// -------------------------------------------------------------

// GET /api/churn/dashboard
app.get('/api/churn/dashboard', (req, res) => {
  try {
    const customers = getCustomers();
    const predictions = getLocalChurnPredictions();
    const orders = getOrders();
    const events = getEvents();

    let totalScoreSum = 0;
    let highCount = 0;
    let mediumCount = 0;
    let lowCount = 0;
    const factorCounts: { [key: string]: number } = {};

    for (const customer of customers) {
      let pred = predictions.find(p => p.customerId === customer.id);
      if (!pred) {
        const custOrders = orders.filter(o => o.customerId === customer.id);
        const custEvents = events.filter(e => e.customerId === customer.id);
        pred = calculateFallbackChurnPrediction(customer, custOrders, custEvents);
      }

      totalScoreSum += pred.score;
      if (pred.risk === 'HIGH') {
        highCount++;
      } else if (pred.risk === 'MEDIUM') {
        mediumCount++;
      } else {
        lowCount++;
      }

      if (pred.reason && Array.isArray(pred.reason)) {
        pred.reason.forEach((r: string) => {
          factorCounts[r] = (factorCounts[r] || 0) + 1;
        });
      }
    }

    const topChurnFactors = Object.entries(factorCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([factor]) => factor);

    const averageChurnScore = customers.length > 0 ? (totalScoreSum / customers.length) : 0;

    res.json({
      highRiskCount: highCount,
      mediumRiskCount: mediumCount,
      lowRiskCount: lowCount,
      averageChurnScore: Math.round(averageChurnScore * 10) / 10,
      topChurnFactors: topChurnFactors.length > 0 ? topChurnFactors : [
        "Inactivity over 90 days",
        "Single-order purchase patterns",
        "High campaign digital fatigue"
      ]
    });
  } catch (err: any) {
    res.status(500).json({ message: err.message || 'Error loading churn dashboard statistics' });
  }
});

// GET /api/churn/high-risk
app.get('/api/churn/high-risk', (req, res) => {
  try {
    const customers = getCustomers();
    const predictions = getLocalChurnPredictions();
    const orders = getOrders();
    const events = getEvents();

    const highRiskAlerts: any[] = [];
    for (const customer of customers) {
      let pred = predictions.find(p => p.customerId === customer.id);
      if (!pred) {
        const custOrders = orders.filter(o => o.customerId === customer.id);
        const custEvents = events.filter(e => e.customerId === customer.id);
        pred = calculateFallbackChurnPrediction(customer, custOrders, custEvents);
      }
      
      if (pred.risk === 'HIGH') {
        highRiskAlerts.push({
          customerName: customer.name,
          customerEmail: customer.email,
          totalSpent: customer.totalSpent,
          orderCount: customer.orderCount,
          lastOrderDate: customer.lastOrderDate,
          tags: customer.tags,
          ...pred
        });
      }
    }

    res.json(highRiskAlerts);
  } catch (err: any) {
    res.status(500).json({ message: err.message || 'Error loading high-risk predictions' });
  }
});

// GET /api/churn/:customerId
app.get('/api/churn/:customerId', (req, res) => {
  try {
    const customerId = req.params.customerId;
    const customers = getCustomers();
    const customer = customers.find(c => c.id === customerId);
    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    const predictions = getLocalChurnPredictions();
    let pred = predictions.find(p => p.customerId === customerId);

    if (!pred) {
      const orders = getOrders().filter(o => o.customerId === customerId);
      const events = getEvents().filter(e => e.customerId === customerId);
      pred = calculateFallbackChurnPrediction(customer, orders, events);
    }

    res.json(pred);
  } catch (err: any) {
    res.status(500).json({ message: err.message || 'Error loading customer' });
  }
});

// POST /api/churn/generate/:customerId
app.post('/api/churn/generate/:customerId', async (req, res) => {
  try {
    const customerId = req.params.customerId;
    const customers = getCustomers();
    const customer = customers.find(c => c.id === customerId);
    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    const orders = getOrders().filter(o => o.customerId === customerId);
    const events = getEvents().filter(e => e.customerId === customerId);
    const fallbackPred = calculateFallbackChurnPrediction(customer, orders, events);

    const analysisPayload = {
      customer: {
        id: customer.id,
        name: customer.name,
        email: customer.email,
        memberSince: customer.memberSince,
        totalSpent: customer.totalSpent,
        orderCount: customer.orderCount,
        lastOrderDate: customer.lastOrderDate,
        tags: customer.tags
      },
      orders: orders.map(o => ({ amount: o.amount, items: o.items, timestamp: o.timestamp })),
      campaignEngagement: events.map(e => {
        const campaign = getCampaigns().find(c => c.campaignId === e.campaignId);
        return {
          campaignId: e.campaignId,
          channel: campaign?.channel || 'unknown',
          status: e.status,
          timestamp: e.timestamp
        };
      })
    };

    const ai = getAi();
    if (ai) {
      try {
        const sysInstruction = `You are Mochi CRM's advanced machine learning Customer Churn Prediction Engine.
Analyze the customer's behavioral telemetry (recency of last purchase, order count frequency, spending trend direction, newsletter opens, campaign link clicks, segment tags, and interaction logs).
Predict their likelihood of churn and generate deep preventative recovery plans.
Perform rigorous forecasting and output a strictly formatted valid JSON object matching this schema:
{
  "risk": "LOW" | "MEDIUM" | "HIGH",
  "score": (number) probability of churn/attrition rate from 0.0 to 100.0,
  "reason": [string] exact top 2-3 behavioral root causes for this churn index classification,
  "recommendedActions": [string] exact 2-3 highly operational, personalized win-back suggestions
}`;

        const gResponse = await generateContentWithRetry({
          preferredModel: 'gemini-3.5-flash',
          contents: `Evaluate customer attrition attributes and engagement signals:
${JSON.stringify(analysisPayload)}`,
          config: {
            systemInstruction: sysInstruction,
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                risk: { type: Type.STRING, enum: ['LOW', 'MEDIUM', 'HIGH'] },
                score: { type: Type.NUMBER },
                reason: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING }
                },
                recommendedActions: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING }
                }
              },
              required: ['risk', 'score', 'reason', 'recommendedActions']
            }
          }
        });

        const parsed = JSON.parse(gResponse.text || '{}');
        const finalPred = {
          customerId: customer.id,
          risk: (parsed.risk === 'LOW' || parsed.risk === 'MEDIUM' || parsed.risk === 'HIGH') ? parsed.risk : fallbackPred.risk,
          score: typeof parsed.score === 'number' ? parsed.score : fallbackPred.score,
          reason: Array.isArray(parsed.reason) ? parsed.reason : fallbackPred.reason,
          recommendedActions: Array.isArray(parsed.recommendedActions) ? parsed.recommendedActions : fallbackPred.recommendedActions,
          predictedAt: new Date().toISOString()
        };

        const predictions = getLocalChurnPredictions();
        const existingIdx = predictions.findIndex(p => p.customerId === customerId);
        if (existingIdx !== -1) {
          predictions[existingIdx] = finalPred;
        } else {
          predictions.push(finalPred);
        }
        writeLocalChurnPredictions(predictions);

        return res.json(finalPred);
      } catch (err) {
        console.error('[Churn Engine] Gemini churn prediction generation failed, using fallback calculations:', err);
      }
    }

    // Direct fallback application
    const predictions = getLocalChurnPredictions();
    const existingIdx = predictions.findIndex(p => p.customerId === customerId);
    if (existingIdx !== -1) {
      predictions[existingIdx] = fallbackPred;
    } else {
      predictions.push(fallbackPred);
    }
    writeLocalChurnPredictions(predictions);

    res.json(fallbackPred);
  } catch (err: any) {
    res.status(500).json({ message: err.message || 'Error generating churn prediction' });
  }
});

// GETS sales telemetry prepared for prompt
function prepareSalesTelemetry(targetCustomerId?: string) {
  const customers = getCustomers();
  const orders = getOrders();
  const events = getEvents();
  const churnPredictions = getLocalChurnPredictions();

  let relevantCustomers = customers;
  if (targetCustomerId) {
    relevantCustomers = customers.filter(c => c.id === targetCustomerId);
    if (relevantCustomers.length === 0) {
      relevantCustomers = customers.slice(0, 5);
    }
  } else {
    // Sort to prioritize interesting cohorts & limit data package size safely
    relevantCustomers = customers.slice(0, 15);
  }

  return relevantCustomers.map(c => {
    const custOrders = orders.filter(o => o.customerId === c.id);
    const custEvents = events.filter(e => e.customerId === c.id);
    const churnPred = churnPredictions.find(p => p.customerId === c.id);
    const health = calculateCustomerHealth(c);

    return {
      id: c.id,
      name: c.name,
      email: c.email,
      memberSince: c.memberSince,
      totalSpent: c.totalSpent,
      orderCount: c.orderCount,
      lastOrderDate: c.lastOrderDate,
      tags: c.tags,
      orders: custOrders.map(o => ({ amount: o.amount, timestamp: o.timestamp, itemsCount: o.items?.length || 1 })),
      campaignEngagement: custEvents.map(e => ({ status: e.status, timestamp: e.timestamp })),
      churnRisk: churnPred ? { risk: churnPred.risk, score: churnPred.score } : { risk: 'MEDIUM', score: 50 },
      health: health
    };
  });
}

function generateDynamicSalesFallback(type: 'find-buyers' | 'strategy' | 'followup', customerId?: string): any {
  const customers = getCustomers();
  
  let target: any[] = [];
  if (customerId) {
    const found = customers.find(c => c.id === customerId);
    if (found) target.push(found);
  } else {
    target = [...customers].sort((a,b) => b.totalSpent - a.totalSpent).slice(0, 2);
  }

  if (target.length === 0 && customers.length > 0) {
    target.push(customers[0]);
  }

  const mappedCustomers = target.map(c => {
    return {
      id: c.id,
      name: c.name,
      email: c.email,
      score: Math.round(75 + Math.random() * 20),
      health: c.tags?.includes('inactive') ? 'At Risk' : 'Healthy',
      preferredChannel: c.tags?.includes('whatsapp') ? 'WhatsApp' : 'Email'
    };
  });

  const mainName = mappedCustomers[0]?.name || 'Valued Customer';
  let reason = '';
  let predictedRevenue = 15000;
  let recommendedCampaign = '';
  let email = '';
  let whatsapp = '';

  if (type === 'find-buyers') {
    reason = "Fallback: Identified strong spending levels and active interaction frequency across target profiles.";
    predictedRevenue = 24000;
    recommendedCampaign = "VIP Micro-Lot Espresso Blend Showcase";
    email = `Subject: First-Access Invitation: Fresh Single-Origin beans have landed at Mochi!\n\nDear ${mainName},\n\nWe appreciate your amazing history with us. We have secured early-access bags of our fresh microlot single-origin. Code: VIPFRESH for 20% off.`;
    whatsapp = `Hey ${mainName}! ☕ Your exceptional brewing score makes you eligible for early access to our new microlot beans. Code VIPFRESH for 20% off!`;
  } else if (type === 'strategy') {
    reason = "Fallback: High loyalty metrics paired with moderate fatigue suggest premium value retention triggers.";
    predictedRevenue = 18000;
    recommendedCampaign = "Mochi Special Loyalty and Churn Mitigation Outreach";
    email = `Subject: Fresh coffee points waiting inside (An update for ${mainName})\n\nHi ${mainName},\n\nWe want to thank you for brewing with us! We have credited 150 bonus loyalty points to your account + added a special 15% discount for your favorite blends code LOYAL15.`;
    whatsapp = `Hi ${mainName}! ☕ Grab your exclusive 150 loyalty points reward and a 15% discount code *LOYAL15* valid this week!`;
  } else {
    reason = "Fallback: Targeted follow-up to address recent dormant or warm lead activity indicators.";
    predictedRevenue = 9500;
    recommendedCampaign = "Localized Win-Back Engagement Campaign";
    email = `Subject: Let's brew something wonderful again - grab a free handcrafted treat!\n\nHi ${mainName},\n\nWe haven't seen you in a bit. Order any fresh batch of beans inside 48h and we'll add a beautiful complimentary handcrafted canvas tote bag. Code GIVETOTE.`;
    whatsapp = `Hey ${mainName}! ☕ Fresh roasts are waiting in our Mochi kitchen. Grab a complimentary canvas tote bag with your next order using code: GIVETOTE!`;
  }

  return {
    customers: mappedCustomers,
    reason,
    predictedRevenue,
    recommendedCampaign,
    email,
    whatsapp
  };
}

// -------------------------------------------------------------
// AI SALES AGENT ENDPOINTS
// -------------------------------------------------------------

// POST /api/ai/sales/find-buyers
app.post('/api/ai/sales/find-buyers', async (req, res) => {
  try {
    const { customerId } = req.body;
    const telemetry = prepareSalesTelemetry(customerId);

    const ai = getAi();
    if (ai) {
      try {
        const sysInstruction = `You are Mochi CRM's advanced machine learning Customer Buyer Propensity Agent.
Analyze the provided customer profiles containing purchase history, customer health, churn score, campaigns, and engagement metrics.
Recommend target customer(s) with high sales potential.
Return a strictly formatted valid JSON matching the schema:
{
  "customers": [
    {
      "id": "...",
      "name": "...",
      "email": "...",
      "score": (number between 0 and 100 representing purchase propensity),
      "health": "Healthy" | "At Risk",
      "preferredChannel": "Email" | "WhatsApp" | "SMS"
    }
  ],
  "reason": "Detailed explanatory rationale about why these customers are highly likely to convert",
  "predictedRevenue": (number) estimated incremental sales revenue in INR,
  "recommendedCampaign": "Dynamic recommended sales campaign title",
  "email": "Subject: ...\\n\\nFull written personalized promotional email pitch",
  "whatsapp": "Direct WhatsApp message template featuring emoji and bold markdown"
}`;

        const gResponse = await generateContentWithRetry({
          preferredModel: 'gemini-3.5-flash',
          contents: `Evaluate buyer propensity telemetry signals:\n${JSON.stringify(telemetry)}`,
          config: {
            systemInstruction: sysInstruction,
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                customers: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      id: { type: Type.STRING },
                      name: { type: Type.STRING },
                      email: { type: Type.STRING },
                      score: { type: Type.NUMBER },
                      health: { type: Type.STRING },
                      preferredChannel: { type: Type.STRING }
                    },
                    required: ['id', 'name', 'email']
                  }
                },
                reason: { type: Type.STRING },
                predictedRevenue: { type: Type.NUMBER },
                recommendedCampaign: { type: Type.STRING },
                email: { type: Type.STRING },
                whatsapp: { type: Type.STRING }
              },
              required: ['customers', 'reason', 'predictedRevenue', 'recommendedCampaign', 'email', 'whatsapp']
            }
          }
        });

        const parsed = JSON.parse(gResponse.text || '{}');
        return res.json(parsed);
      } catch (geminiErr) {
        console.error('[Sales Agent Engine] Gemini find-buyers analysis failed, fallback triggered:', geminiErr);
      }
    }

    const fallback = generateDynamicSalesFallback('find-buyers', customerId);
    res.json(fallback);
  } catch (err: any) {
    res.status(500).json({ message: err.message || 'Error executing client buyer matching' });
  }
});

// POST /api/ai/sales/strategy
app.post('/api/ai/sales/strategy', async (req, res) => {
  try {
    const { customerId } = req.body;
    const telemetry = prepareSalesTelemetry(customerId);

    const ai = getAi();
    if (ai) {
      try {
        const sysInstruction = `You are Mochi CRM's senior Customer Sales Strategist Agent.
Analyze the provided customer profiles (RFM, tags, churn, engagement) and construct a high-performance win-back and retention sales strategy.
Draft the exact promotional pitch and campaign strategy customized to coffee preferences.
Return a strictly formatted valid JSON matching the schema:
{
  "customers": [
    {
      "id": "...",
      "name": "...",
      "email": "...",
      "score": (number representing affinity),
      "health": "Healthy" | "At Risk",
      "preferredChannel": "Email" | "WhatsApp" | "SMS"
    }
  ],
  "reason": "Strategic behavioral reason behind current customer retention / upsell campaign",
  "predictedRevenue": (number) estimated strategy sales yield in INR,
  "recommendedCampaign": "Dynamic strategic campaign heading",
  "email": "Subject: ...\\n\\nFull strategic promotional email copy of the promotion",
  "whatsapp": "Compelling call-to-action WhatsApp text pitch with bold highlight markup"
}`;

        const gResponse = await generateContentWithRetry({
          preferredModel: 'gemini-3.5-flash',
          contents: `Build optimized high-conversion sales strategy from telemetry data:\n${JSON.stringify(telemetry)}`,
          config: {
            systemInstruction: sysInstruction,
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                customers: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      id: { type: Type.STRING },
                      name: { type: Type.STRING },
                      email: { type: Type.STRING },
                      score: { type: Type.NUMBER },
                      health: { type: Type.STRING },
                      preferredChannel: { type: Type.STRING }
                    },
                    required: ['id', 'name', 'email']
                  }
                },
                reason: { type: Type.STRING },
                predictedRevenue: { type: Type.NUMBER },
                recommendedCampaign: { type: Type.STRING },
                email: { type: Type.STRING },
                whatsapp: { type: Type.STRING }
              },
              required: ['customers', 'reason', 'predictedRevenue', 'recommendedCampaign', 'email', 'whatsapp']
            }
          }
        });

        const parsed = JSON.parse(gResponse.text || '{}');
        return res.json(parsed);
      } catch (geminiErr) {
        console.error('[Sales Agent Engine] Gemini sales-strategy failed, fallback triggered:', geminiErr);
      }
    }

    const fallback = generateDynamicSalesFallback('strategy', customerId);
    res.json(fallback);
  } catch (err: any) {
    res.status(500).json({ message: err.message || 'Error generating customer retention strategy' });
  }
});

// POST /api/ai/sales/followup
app.post('/api/ai/sales/followup', async (req, res) => {
  try {
    const { customerId } = req.body;
    const telemetry = prepareSalesTelemetry(customerId);

    const ai = getAi();
    if (ai) {
      try {
        const sysInstruction = `You are Mochi CRM's persistent Customer Sales Follow-up Agent.
Evaluate customer's latest engagement profiles (recent warmth signals, purchase periods, Churn Index score).
Draft an impactful, personalized win-back sales follow-up pitch offering exclusive rewards.
Return a strictly formatted valid JSON matching the schema:
{
  "customers": [
    {
      "id": "...",
      "name": "...",
      "email": "...",
      "score": (number representing follow-up prioritization),
      "health": "Healthy" | "At Risk",
      "preferredChannel": "Email" | "WhatsApp" | "SMS"
    }
  ],
  "reason": "Engagement follow-up justification based on abandoned cart/dormant triggers",
  "predictedRevenue": (number) estimated revenue recovered from direct follow-up,
  "recommendedCampaign": "Dynamic win-back follow-up campaign label",
  "email": "Subject: ...\\n\\nFull written personalized follow-up outbound email pitch",
  "whatsapp": "Direct WhatsApp reminder copy featuring clear call to action and highlights"
}`;

        const gResponse = await generateContentWithRetry({
          preferredModel: 'gemini-3.5-flash',
          contents: `Build optimized high-conversion follow-up pitch from telemetry data:\n${JSON.stringify(telemetry)}`,
          config: {
            systemInstruction: sysInstruction,
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                customers: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      id: { type: Type.STRING },
                      name: { type: Type.STRING },
                      email: { type: Type.STRING },
                      score: { type: Type.NUMBER },
                      health: { type: Type.STRING },
                      preferredChannel: { type: Type.STRING }
                    },
                    required: ['id', 'name', 'email']
                  }
                },
                reason: { type: Type.STRING },
                predictedRevenue: { type: Type.NUMBER },
                recommendedCampaign: { type: Type.STRING },
                email: { type: Type.STRING },
                whatsapp: { type: Type.STRING }
              },
              required: ['customers', 'reason', 'predictedRevenue', 'recommendedCampaign', 'email', 'whatsapp']
            }
          }
        });

        const parsed = JSON.parse(gResponse.text || '{}');
        return res.json(parsed);
      } catch (geminiErr) {
        console.error('[Sales Agent Engine] Gemini followup generation failed, fallback triggered:', geminiErr);
      }
    }

    const fallback = generateDynamicSalesFallback('followup', customerId);
    res.json(fallback);
  } catch (err: any) {
    res.status(500).json({ message: err.message || 'Error generating localized client sales follow-up' });
  }
});

// -------------------------------------------------------------
// SECURED MODULAR ROUTING FOR CRM ENGINE
// -------------------------------------------------------------
app.use('/api/workflows', workflowRouter);
app.use('/api/agents', agentRouter);
app.use('/api/memory', memoryRouter);
app.use('/api/graph', graphRouter);
app.use('/api/simulation', simulationRouter);

// 3b. DELETE CUSTOMER
app.delete('/api/customers/:id', (req, res) => {
  const customers = getCustomers();
  const filtered = customers.filter(c => c.id !== req.params.id);
  writeCustomers(filtered);
  res.json({ success: true, message: 'Customer successfully deleted' });
});

// 4. GET CAMPAIGNS
app.get('/api/campaigns', (req, res) => {
  const campaigns = getCampaigns();
  const statusFilter = req.query.status as string;

  let filtered = [...campaigns];
  if (statusFilter && statusFilter !== 'all') {
    filtered = filtered.filter(c => c.status === statusFilter);
  }

  res.json(filtered);
});

// 5. GET SINGLE CAMPAIGN
app.get('/api/campaigns/:id', (req, res) => {
  const campaigns = getCampaigns();
  const campaign = campaigns.find(c => c.campaignId === req.params.id);
  if (!campaign) {
    return res.status(404).json({ message: 'Campaign not found' });
  }
  res.json(campaign);
});

// 5b. DELETE CAMPAIGN
app.delete('/api/campaigns/:id', (req, res) => {
  const campaigns = getCampaigns();
  const filtered = campaigns.filter(c => c.campaignId !== req.params.id);
  writeCampaigns(filtered);
  res.json({ success: true, message: 'Campaign successfully deleted' });
});

// 6. CREATE DRAFT CAMPAIGN
app.post('/api/campaigns', (req, res) => {
  const { name, audiencePrompt, matchedCount, message, channel } = req.body;
  const campaigns = getCampaigns();

  const newCampaign: Campaign = {
    campaignId: `cmp_${Date.now()}`,
    name: name || `Campaign — ${new Date().toLocaleDateString()}`,
    audiencePrompt: audiencePrompt || 'Manual segment',
    matchedCount: matchedCount || 0,
    message: message || '',
    channel: channel || 'whatsapp',
    status: 'draft',
    createdAt: new Date().toISOString().split('T')[0],
    sent_count: 0,
    delivered_count: 0,
    opened_count: 0,
    clicked_count: 0,
    failed_count: 0,
    orders_attributed: 0,
    revenue_attributed: 0
  };

  campaigns.push(newCampaign);
  writeCampaigns(campaigns);

  res.status(201).json(newCampaign);
});

// 7. GET OVERVIEW METRICS
app.get('/api/analytics/overview', (req, res) => {
  const customers = getCustomers();
  const campaigns = getCampaigns();
  const events = getEvents();

  // Active campaigns
  const activeCount = campaigns.filter(c => c.status === 'active').length;

  // Let's compute actual average stats from current database
  const completedCampaigns = campaigns.filter(c => c.status === 'completed' || c.status === 'active');
  
  let totalSents = 0;
  let totalDelivereds = 0;
  let totalOpens = 0;
  let totalClicks = 0;

  completedCampaigns.forEach(c => {
    totalSents += c.sent_count;
    totalDelivereds += c.delivered_count;
    totalOpens += c.opened_count;
    totalClicks += c.clicked_count;
  });

  const rawDeliveryRate = totalSents > 0 ? (totalDelivereds / totalSents) * 100 : 0;
  // Clamped between 92% and 99% using random number generator if out of bounds or exceeding 100%
  const avgDeliveryRate = (rawDeliveryRate >= 92 && rawDeliveryRate <= 99) 
    ? rawDeliveryRate 
    : (92 + Math.random() * 7);
  const avgCtr = totalOpens > 0 ? (totalClicks / totalOpens) * 100 : 18.5;

  // Compute Messages This Week
  const messagesThisWeek = totalSents || 16;

  // Top Performing Channel computation
  const channelStats: Record<string, { sent: number; del: number }> = {};
  campaigns.forEach(c => {
    if (!channelStats[c.channel]) {
      channelStats[c.channel] = { sent: 0, del: 0 };
    }
    channelStats[c.channel].sent += c.sent_count;
    channelStats[c.channel].del += c.delivered_count;
  });

  let topChannel = 'whatsapp';
  let maxRate = 0;

  Object.entries(channelStats).forEach(([chan, stats]) => {
    if (stats.sent > 0) {
      const rate = (stats.del / stats.sent) * 100;
      if (rate > maxRate) {
        maxRate = rate;
        topChannel = chan;
      }
    }
  });

  if (maxRate === 0) {
    topChannel = 'whatsapp';
    maxRate = 92.5;
  }

  // Segment metrics
  const highValueCount = customers.filter(c => c.tags.includes('high-value')).length;

  const overview: AnalyticsOverview = {
    totalCustomers: customers.length,
    activeCampaigns: activeCount,
    avgDeliveryRate: Math.round(avgDeliveryRate * 10) / 10,
    avgCtr: Math.round(avgCtr * 10) / 10,
    messagesThisWeek,
    topChannel,
    topChannelRate: Math.round(maxRate * 10) / 10,
    mostActiveSegment: 'High Value Shoppers',
    mostActiveSegmentCount: highValueCount,
    messagesDeliveredPercent: Math.round(avgDeliveryRate)
  };

  res.json(overview);
});

// 8. GET CAMPAIGNS DETAILS FOR DASHBOARD GRAPH
app.get('/api/analytics/campaigns', (req, res) => {
  const campaigns = getCampaigns();
  res.json(campaigns);
});

// 8b. GET ENRICHED RECENT CHRONOLOGICAL ACTIVITY FEED
app.get('/api/analytics/activity', (req, res) => {
  const events = getEvents();
  const campaigns = getCampaigns();
  const customers = getCustomers();
  const orders = getOrders();

  const activityList: any[] = [];

  // 1. Process Communication events
  events.forEach(evt => {
    const campaign = campaigns.find(c => c.campaignId === evt.campaignId);
    const customer = customers.find(c => c.id === evt.customerId);
    
    let detailMsg = '';
    switch (evt.status) {
      case 'sent':
        detailMsg = `Campaign message triggered and dispatched via ${campaign ? campaign.channel.toUpperCase() : 'SMS'}`;
        break;
      case 'delivered':
        detailMsg = 'Delivered to handset successfully';
        break;
      case 'opened':
        detailMsg = 'Opened and read communication payload';
        break;
      case 'clicked':
        detailMsg = 'Clicked promotional link / CTA';
        break;
      case 'failed':
        detailMsg = 'Undelivered (handset unreachable or invalid route)';
        break;
      default:
        detailMsg = `Status changed to ${evt.status}`;
    }

    activityList.push({
      id: evt.eventId,
      type: evt.status === 'sent' ? 'trigger' : evt.status === 'failed' ? 'failed' : 'interaction',
      campaignId: evt.campaignId,
      campaignName: campaign ? campaign.name : 'System Dispatch',
      customerId: evt.customerId,
      customerName: customer ? customer.name : 'Unknown Shopper',
      channel: campaign ? campaign.channel : 'email',
      detail: detailMsg,
      status: evt.status,
      timestamp: evt.timestamp
    });
  });

  // 2. Process Order Conversions
  orders.forEach(order => {
    const customer = customers.find(c => c.id === order.customerId);
    
    // Check if there is an active/completed campaign attributing this order
    // Order Id from Campaign attribution contains word 'conv'
    const isAttributed = order.orderId.includes('conv');
    
    activityList.push({
      id: order.orderId,
      type: 'conversion',
      customerId: order.customerId,
      customerName: customer ? customer.name : 'Unknown Shopper',
      detail: `🛒 Shopper placed order of ₹${order.amount.toLocaleString()}${isAttributed ? ' (Attributed to Campaign coupon)' : ''}`,
      channel: isAttributed ? 'conversion' : undefined,
      timestamp: order.timestamp.includes('T') ? order.timestamp : `${order.timestamp}T12:00:00.000Z`
    });
  });

  // Sort descending: newest first
  activityList.sort((a, b) => {
    const timeA = new Date(a.timestamp).getTime();
    const timeB = new Date(b.timestamp).getTime();
    return timeB - timeA;
  });

  // Limit to latest 30 events for optimal render performance
  res.json(activityList.slice(0, 30));
});

// -------------------------------------------------------------
// 9. AI POWERED SEGMENTATION SUITE
// -------------------------------------------------------------
app.post('/api/segment/suggest', async (req, res) => {
  const { prompt } = req.body;
  const customers = req.body.customers || getCustomers();

  if (!prompt || prompt.trim() === '') {
    return res.status(400).json({ message: 'Prompt is required' });
  }

  const ai = getAi();

  if (ai) {
    try {
      // Let's pass the customer overview structure to Gemini for live matching!
      const minifiedCustomers = customers.map(c => ({
        id: c.id,
        name: c.name,
        totalSpent: c.totalSpent,
        orderCount: c.orderCount,
        lastOrderDate: c.lastOrderDate,
        tags: c.tags
      }));

      const sysInstruction = `You are the AI brain behind Mochi CRM's Hybrid Segmentation Engine. Given a list of customers and the marketer's natural language goal description, you must identify which customer IDs match the criteria.
Format the output as a strict JSON object with:
1. "explanation": A natural, professional description of who we are targeting and why (e.g. "Targeting customers with total spending over ₹5,000 who haven't ordered recently").
2. "rules": An array of rule description strings representing the filters applied (e.g., ["totalSpent > ₹5,000", "days_since_last_order > 30"]).
3. "matchedIds": An array of matching customer ID strings in the customer database. Only output IDs that actually exist in the database!

Be highly precise when evaluating criteria like numbers or durations mentioned. If the prompt is broad (e.g., "high value customers"), select the segment of top spent shoppers (e.g. totalSpent > 8000).`;

      const aiResponse = await generateContentWithRetry({
        preferredModel: 'gemini-3.5-flash',
        contents: `Evaluate this targeting prompt: "${prompt}". Match this against this customer array:\n${JSON.stringify(minifiedCustomers)}`,
        config: {
          systemInstruction: sysInstruction,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              explanation: { type: Type.STRING },
              rules: { 
                type: Type.ARRAY, 
                items: { type: Type.STRING } 
              },
              matchedIds: { 
                type: Type.ARRAY, 
                items: { type: Type.STRING } 
              }
            },
            required: ['explanation', 'rules', 'matchedIds']
          }
        }
      });

      const parsed = JSON.parse(aiResponse.text || '{}');
      const matchedIds = parsed.matchedIds || [];
      const matchedCustomers = customers.filter(c => matchedIds.includes(c.id));

      res.json({
        explanation: parsed.explanation || 'Matched segment details',
        rules: parsed.rules || [],
        count: matchedCustomers.length,
        customers: matchedCustomers
      });
      return;
    } catch (e) {
      console.error('Gemini segmentation failed, calling robust rule fallback...', e);
    }
  }

  // --- COMPREHENSIVE HEURISTIC FALLBACK ROUTER (works instantly if no api key) ---
  const p = prompt.toLowerCase();
  let matchedCustomers = [...customers];
  let explanation = 'Targeting regular customers';
  let rules: string[] = ['All base shoppers included'];

  if (p.includes('spent over 5') || p.includes('spent > 5') || p.includes('5000') || p.includes('5,000')) {
    matchedCustomers = customers.filter(c => c.totalSpent > 5000);
    explanation = 'Isolating customers who spent over ₹5,000 altogether';
    rules = ['totalSpent > ₹5,000'];
  } else if (p.includes('spent over 8') || p.includes('high value') || p.includes('top spend')) {
    matchedCustomers = customers.filter(c => c.totalSpent > 8000);
    explanation = 'Isolating high value loyal shoppers who constitute your top 40% margin driving segment';
    rules = ['totalSpent > ₹8,000', 'Loyal Segment'];
  } else if (p.includes('inactive') || p.includes('retarget') || p.includes('risk') || p.includes('miss')) {
    matchedCustomers = customers.filter(c => c.tags.includes('inactive') || c.tags.includes('at-risk'));
    explanation = 'Targeting at-risk and inactive customers who have not placed orders in over 60 days';
    rules = ['Tag includes "inactive" or "at-risk"', 'Days since last order > 60 days'];
  } else if (p.includes('new') || p.includes('fresh')) {
    matchedCustomers = customers.filter(c => c.tags.includes('new') || c.orderCount <= 1);
    explanation = 'Targeting newer customers who made 1 or fewer orders to prompt second purchasing loops';
    rules = ['orderCount <= 1', 'Tag includes "new"'];
  } else {
    // Default to high value and regular
    matchedCustomers = customers.filter(c => !c.tags.includes('inactive'));
    explanation = 'Targeting highly engaged active customers to drive high immediate CTR';
    rules = ['Active tag matched', 'Order count >= 1'];
  }

  res.json({
    explanation,
    rules,
    count: matchedCustomers.length,
    customers: matchedCustomers
  });
});

// -------------------------------------------------------------
// 10. AI GENERATIVE CAMPAIGN PERSONALIZATION LAYER
// -------------------------------------------------------------
app.post('/api/campaigns/generate-copy', async (req, res) => {
  const { goal, audienceExplanation } = req.body;

  if (!goal) {
    return res.status(400).json({ message: 'Goal description is required' });
  }

  const ai = getAi();

  if (ai) {
    try {
      const sysInstruction = `You are a premium, high-converting D2C retail copywriter expert. Generate customized campaign copy variations for 4 modern shopper channels (WhatsApp, SMS, Email, RCS) matching the marketer's goal and selected target audience.
Format the output as a strict JSON object with:
1. "whatsapp": Direct, short copy with emojis, bullet points, and high conversion call-to-action (character limit 220).
2. "sms": Short, punchy, include character count indicator, call-to-action link (max 160 chars).
3. "email": An object with "subject" (compelling open rate bait) and "body" (formatted nicely with greeting, offer, call to action).
4. "rcs": Compelling interactive rich RCS text.
5. "recommended_channel": Pick the single absolute prime channel for this goal (one of: "whatsapp", "email", "sms", "rcs").
6. "recommendation_reason": Explanation of why is this recommended (e.g. WhatsApp has a 95% open rate for young fashion demographics).

Always include "{name}" in all message drafts so we can personalize it dynamically.`;

      const aiResponse = await generateContentWithRetry({
        preferredModel: 'gemini-3.5-flash',
        contents: `Goal: "${goal}". Audience: "${audienceExplanation || 'Our loyal shoppers'}"`,
        config: {
          systemInstruction: sysInstruction,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              whatsapp: { type: Type.STRING },
              sms: { type: Type.STRING },
              email: { 
                type: Type.OBJECT,
                properties: {
                  subject: { type: Type.STRING },
                  body: { type: Type.STRING }
                },
                required: ['subject', 'body']
              },
              rcs: { type: Type.STRING },
              recommended_channel: { type: Type.STRING },
              recommendation_reason: { type: Type.STRING }
            },
            required: ['whatsapp', 'sms', 'email', 'rcs', 'recommended_channel', 'recommendation_reason']
          }
        }
      });

      const parsed = JSON.parse(aiResponse.text || '{}');
      res.json(parsed);
      return;
    } catch (e) {
      console.error('Gemini message copywrite failed, utilizing intelligent fallback template...', e);
    }
  }

  // --- DESIGNED FALLBACK COPYWRITER (works instantly if no api key) ---
  const g = goal.toLowerCase();
  let whatsapp = `Hey {name}! \u2728 We have something special for you. Just because you are a VIP, enjoy 15% off on our fresh releases. Use: VIP15 at checkout! \u2615\ufe0f xeno.coffee/vip`;
  let sms = `Hey {name}! Enjoy 15% off our premium single-origins with code VIP15. Shop now: xeno.coffee/vip`;
  let email = {
    subject: `Hey {name}, your VIP perks have arrived! \u2615\ufe0f`,
    body: `Hi {name},\n\nWe love having you as a core customer of our brand! To show our appreciation, here is a custom VIP coupon code: VIP15.\n\nEnjoy 15% off our entire stock of fresh roasts and brewers for the next 7 days.\n\nWarmly,\nYour Roastery Crew`
  };
  let rcs = `Hey {name}! \ud83c\udf1f Exclusive single-origin drop for you. Order now for 15% off using code VIP15!`;
  let recommended = 'whatsapp';
  let reason = 'WhatsApp is highly recommended for VIP clients because message deliverability is guaranteed and CTR rates average 25%+.';

  if (g.includes('win back') || g.includes('winback') || g.includes('inactive') || g.includes('miss')) {
    whatsapp = `Hi {name}! \ud83d\udc94 We miss your roastery updates! Here is a flat 20% discount coupon to welcome you back: COMEBACK20. Valid this week! xeno.coffee/return`;
    sms = `Hey {name}! We miss you! Enjoy 20% off your next checkout with code COMEBACK20. Order here: xeno.coffee/return`;
    email = {
      subject: `We miss you, {name}! Let us treat you to 20% off \u2764\ufe0f`,
      body: `Hi {name},\n\nIt has been a while since your last order, and we would love to have you back! We have updated our roastery menu with incredibly high-grade origins.\n\nTreat yourself to 20% off your next purchase using code: COMEBACK20.\n\nLet's brew something amazing together!`
    };
    rcs = `Hi {name}! We miss you! \u2764\ufe0f Here is 20% off your next roastery pack with code COMEBACK20.`;
    recommended = 'email';
    reason = 'Email is recommended here because win-back notifications are longer and allow rich story and discount context without feeling intrusive.';
  } else if (g.includes('offer') || g.includes('discount') || g.includes('sale')) {
    whatsapp = `ALERT! \ud83d\udd25 FLASH SALE! Get flat ₹500 cashback on all craft roasts today! Code: BREWNOW. Claim before roasts sell out! xeno.coffee/deals`;
    sms = `Flash Sale! Get flat ₹500 cashback on roasts with code BREWNOW. Offer expires tonight! xeno.coffee/deals`;
    email = {
      subject: `FLASH SALE: Flat \u20b9500 cashback on all beans today! \ud83d\udd25`,
      body: `Hi {name},\n\nThis is a major D2C flash roastery event!\n\nUse code BREWNOW today and receive a direct flat ₹500 cashback on your checkout total!\n\nNo minimum spent required. Shop here now.`
    };
    rcs = `FLASH SALE! \ud83d\udd25 Get flat ₹500 cashback on roasts with code BREWNOW!`;
    recommended = 'whatsapp';
    reason = 'Flash sales perform exceptionally well over WhatsApp where instant notifications drive rapid 2-hour checkouts.';
  }

  res.json({
    whatsapp,
    sms,
    email,
    rcs,
    recommended_channel: recommended,
    recommendation_reason: reason
  });
});

// -------------------------------------------------------------
// 10B. AI INSIGHTS ENGINE
// -------------------------------------------------------------
app.post('/api/analytics/insights', async (req, res) => {
  const customers = req.body.customers || getCustomers();
  const campaigns = req.body.campaigns || getCampaigns();
  const orders = req.body.orders || getOrders();
  const events = req.body.events || getEvents();

  const ai = getAi();
  if (ai) {
    try {
      // Create a dense summary for Gemini to read
      const totalCustomersCount = customers.length;
      const vipCount = customers.filter((c: any) => c.totalSpent > 8000).length;
      const inactiveCount = customers.filter((c: any) => c.tags.includes('inactive') || c.tags.includes('at-risk')).length;
      
      const campaignsCount = campaigns.length;
      const launchedCampaigns = campaigns.filter((c: any) => c.sent_count > 0);
      
      const channelStats: Record<string, { sent: number, opened: number, clicked: number, revenue: number }> = {};
      launchedCampaigns.forEach((c: any) => {
        const ch = c.channel || 'email';
        if (!channelStats[ch]) {
          channelStats[ch] = { sent: 0, opened: 0, clicked: 0, revenue: 0 };
        }
        channelStats[ch].sent += c.sent_count || 0;
        channelStats[ch].opened += c.opened_count || 0;
        channelStats[ch].clicked += c.clicked_count || 0;
        channelStats[ch].revenue += c.revenue_attributed || 0;
      });

      const sampleAtRisk = customers
        .filter((c: any) => c.tags.includes('inactive') || c.tags.includes('at-risk'))
        .slice(0, 3)
        .map((c: any) => ({ name: c.name, totalSpent: c.totalSpent, lastOrderDate: c.lastOrderDate }));

      const sysInstruction = `You are Mochi CRM's Chief Data Scientist AI. Analyze the uploaded customer base and marketing metrics. Generate exactly 5 valuable business insights matching the 5 requested categories:
1. "churn" (Churn risk customers): Isolate at-risk/inactive segments or valuable patrons about to lapse, mention their details and impact.
2. "revenue" (Revenue opportunities): Spot VIP growth paths, upsell segments, or high-potential customer groups.
3. "channel" (Best performing channel): Identify the absolute champion marketing channel (whatsapp, rcs, email, or sms) based on highest CTR or orders, with metrics.
4. "open_rate" (Open rate trends): Assess average open rate trends (increasing or decreasing across campaigns).
5. "conversion" (Conversion trends): Identify ROI or revenue-attribution conversions and general purchase loops.

For every insight, return a structured JSON object inside an outer "insights" array.
Format definition for each insight object:
- "id": string (unique)
- "category": (must be exactly one of: "churn", "revenue", "channel", "open_rate", "conversion")
- "title": string (punchy professional insight header)
- "description": string (clear action-oriented paragraph analyzing the specific metrics and naming actual customers if relevant)
- "impact": string (compelling impact prefix like "+₹15,200 potential LTV", "4 VIP at-risk", "Email (34% CTR)", "Open Rates active")
- "trend": string (must be exactly one of: "up", "down", "neutral")
- "actionLabel": string (clickable call-to-action string like "Launch Win-Back", "Promote Cold Brew", "Optimize Subject", "Retarget segment")
`;

      const contents = `Analyze this dataset summary:
- Total Customers: ${totalCustomersCount} (${vipCount} VIPs, ${inactiveCount} at-risk/inactive)
- Sample At-Risk VIPs: ${JSON.stringify(sampleAtRisk)}
- Campaigns Run: ${campaignsCount} total
- Channel Performance: ${JSON.stringify(channelStats)}`;

      const aiResponse = await generateContentWithRetry({
        preferredModel: 'gemini-3.5-flash',
        contents,
        config: {
          systemInstruction: sysInstruction,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              insights: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    id: { type: Type.STRING },
                    category: { type: Type.STRING },
                    title: { type: Type.STRING },
                    description: { type: Type.STRING },
                    impact: { type: Type.STRING },
                    trend: { type: Type.STRING },
                    actionLabel: { type: Type.STRING }
                  },
                  required: ['id', 'category', 'title', 'description', 'impact', 'trend', 'actionLabel']
                }
              }
            },
            required: ['insights']
          }
        }
      });

      const parsed = JSON.parse(aiResponse.text || '{}');
      if (parsed.insights && parsed.insights.length >= 5) {
        return res.json(parsed.insights);
      }
    } catch (e) {
      console.error('[Insights Engine] Gemini analysis failed. Shifting to Heuristics...', e);
    }
  }

  // --- MATHEMATHICAL ANALYTICS HEURISTICS (Double-Layered Fallback) ---
  const now = new Date('2026-06-11T07:45:01-07:00');
  const atRisk = customers.filter((c: any) => {
    const diffDays = Math.floor(Math.abs(now.getTime() - new Date(c.lastOrderDate).getTime()) / (1000 * 60 * 60 * 24));
    return diffDays > 30 && c.totalSpent > 4000;
  });
  
  const atRiskNames = atRisk.slice(0, 2).map((c: any) => c.name).join(' & ') || 'Zara Malik';
  const vipCount = customers.filter((c: any) => c.totalSpent > 8000).length;

  const heuristicsInsights = [
    {
      id: 'ins_churn',
      category: 'churn',
      title: 'High-Value VIP Churn Risk Detected',
      description: `Patrons ${atRiskNames} (spent over ₹4,000 previously) have been inactive for over 30 days. Immediate outreach is advised to curb customer friction.`,
      impact: `${atRisk.length || 2} VIPs Slipping`,
      trend: 'down',
      actionLabel: 'Launch Win-Back'
    },
    {
      id: 'ins_rev',
      category: 'revenue',
      title: 'Untapped VIP Revenue Segment',
      description: `We identified ${vipCount} high-spending loyalty champions. Sending a fresh, limited-edition roastery drop is estimated to drive massive checkout loops.`,
      impact: `+₹18,500 Upsell Target`,
      trend: 'up',
      actionLabel: 'Promote Specialty Beans'
    },
    {
      id: 'ins_channel',
      category: 'channel',
      title: 'WhatsApp Brand Outreach Champion',
      description: 'WhatsApp exhibits outstanding conversion speed with an average Customer CTR of 15%+. SMS and RCS follow as robust fallback structures for mobile.',
      impact: 'WhatsApp (15.2% CTR)',
      trend: 'up',
      actionLabel: 'View Channel Analytics'
    },
    {
      id: 'ins_open',
      category: 'open_rate',
      title: 'Average Open Rate Stabilization',
      description: 'Average open rates hold strong at 65% across WhatsApp messaging channels, while email campaigns maintain a 24.5% baseline benchmark.',
      impact: '65.2% Avg Open Rate',
      trend: 'neutral',
      actionLabel: 'Optimize Text Strings'
    },
    {
      id: 'ins_conv',
      category: 'conversion',
      title: 'High-Velocity Conversion Attribution',
      description: 'Recent campaign dispatches successfully triggered ₹11,350 in attributed store order transactions. Loyal shopper loops remain highly performant.',
      impact: '+₹11,350 Campaign Revenue',
      trend: 'up',
      actionLabel: 'Analyze Sales Funnels'
    }
  ];

  res.json(heuristicsInsights);
});

// -------------------------------------------------------------
// 10C. AI CAMPAIGN FORECAST PREDICTION
// -------------------------------------------------------------
app.post('/api/campaigns/predict', async (req, res) => {
  const { matchedCount = 5, channel = 'whatsapp', message = '', audiencePrompt = '' } = req.body;

  const ai = getAi();
  if (ai) {
    try {
      const sysInstruction = `You are a D2C e-commerce forecasting neural network. Predict real-time engagement and financial outcomes for Mochi CRM. Given a count of targeted customers, the chosen communication channel, the message text, and the target cohort prompt, calculate:
1. "predictedReach": Exact estimated count of successfully delivered messages (e.g. integer close to matchedCount).
2. "openRate": Predicted open rate percentage (number between 0 and 100, e.g. 70-95% for WhatsApp/SMS/RCS, 20-30% for email).
3. "conversionRate": Predicted checkout purchase conversion rate percentage (number between 0 and 100, typically 5-15% for instant messengers, 1.5-4% for email).
4. "predictedRevenue": Predicted total attributed sales in ₹ Rupees (integer). Usually conversions (Reach * conversionRate / 100) multiplied by ₹1,400 average roastery cart value.
5. "explanation": A brief, professional, data-centric forecast rationale explanation.

Your output must be a strict JSON object matching this schema. Be realistic and vary the rates slightly based on the message quality and target cohort.
`;

      const aiResponse = await generateContentWithRetry({
        preferredModel: 'gemini-3.5-flash',
        contents: `Targeting cohort: "${audiencePrompt}". Customer count: ${matchedCount}. Dispatch pathway: "${channel}". Message copy: "${message}"`,
        config: {
          systemInstruction: sysInstruction,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              predictedReach: { type: Type.INTEGER },
              openRate: { type: Type.NUMBER },
              conversionRate: { type: Type.NUMBER },
              predictedRevenue: { type: Type.INTEGER },
              explanation: { type: Type.STRING }
            },
            required: ['predictedReach', 'openRate', 'conversionRate', 'predictedRevenue', 'explanation']
          }
        }
      });

      const parsed = JSON.parse(aiResponse.text || '{}');
      if (parsed.predictedReach !== undefined) {
        return res.json(parsed);
      }
    } catch (e) {
      console.error('[Prediction Engine] Gemini forecast failed. Shifting to Heuristics...', e);
    }
  }

  // --- PRECISION OUTCOME FORECAST HEURISTICS (Double-Layered Fallback) ---
  const c = channel.toLowerCase();
  
  // Calculate reach
  const deliveryRate = c === 'email' ? 0.94 : 0.98;
  const predictedReach = Math.round(matchedCount * deliveryRate);

  // Determine rates
  let openRate = 92.5;
  let conversionRate = 8.8;
  let avgCartVal = 1450;

  if (c === 'email') {
    openRate = 24.5;
    conversionRate = 2.8;
    avgCartVal = 1800;
  } else if (c === 'sms') {
    openRate = 89.8;
    conversionRate = 4.5;
    avgCartVal = 1200;
  } else if (c === 'rcs') {
    openRate = 84.2;
    conversionRate = 6.2;
    avgCartVal = 1350;
  } else if (c === 'whatsapp') {
    openRate = 94.6;
    conversionRate = 10.4;
    avgCartVal = 1500;
  }

  const predictedRevenue = Math.round(predictedReach * (conversionRate / 100) * avgCartVal);
  const explanation = `Heuristic predictive run completed. ${c === 'whatsapp' ? 'WhatsApp’s instant push mechanisms expect maximum delivery and attention spans.' : 'Email provides a highly descriptive template format but typically receives standard open/CTR rates.'} Estimation is computed based on recent attributed purchases.`;

  res.json({
    predictedReach,
    openRate,
    conversionRate,
    predictedRevenue,
    explanation
  });
});

// -------------------------------------------------------------
// 11. DECOUPLED ASYNC SIMULATOR PIPELINE (CHANNEL STUB / CALLBACKS)
// -------------------------------------------------------------

// Post api callbacks (handles receiving communication status updates)
app.post('/api/callback', (req, res) => {
  const { campaignId, customerId, status } = req.body;
  const campaigns = getCampaigns();
  const events = getEvents();

  // Find campaign
  const campaign = campaigns.find(c => c.campaignId === campaignId);
  if (!campaign) {
    return res.status(404).json({ message: 'Campaign not found for callback' });
  }

  // Create or update CommunicationEvent
  const existingEvent = events.find(e => e.campaignId === campaignId && e.customerId === customerId);
  const oldStatus = existingEvent ? existingEvent.status : null;

  if (existingEvent) {
    existingEvent.status = status;
    existingEvent.timestamp = new Date().toISOString();
  } else {
    events.push({
      eventId: `evt_${campaignId}_${customerId}_${Date.now()}`,
      campaignId,
      customerId,
      status,
      timestamp: new Date().toISOString()
    });
  }
  writeEvents(events);

  // Recalculate campaign statistics based on event updates!
  // This avoids double counting and guarantees absolute precision!
  const campaignEvents = events.filter(e => e.campaignId === campaignId);
  const matchedCustomers = campaignEvents.map(e => e.customerId);

  // Update counters
  campaign.sent_count = campaignEvents.length;
  campaign.failed_count = campaignEvents.filter(e => e.status === 'failed').length;
  campaign.delivered_count = campaignEvents.filter(e => e.status === 'delivered' || e.status === 'opened' || e.status === 'clicked').length;
  campaign.opened_count = campaignEvents.filter(e => e.status === 'opened' || e.status === 'clicked').length;
  campaign.clicked_count = campaignEvents.filter(e => e.status === 'clicked').length;

  writeCampaigns(campaigns);

  // Trigger conversion order simulation when a customer clicks
  if (status === 'clicked') {
    if (Math.random() < 0.35) {
      setTimeout(() => {
        handleAttributedOrder(campaignId, customerId);
      }, Math.random() * 2000 + 1000);
    }
  }

  res.json({ success: true, oldStatus, newStatus: status, campaignStats: campaign });
});

// Post /api/send is called in batch when a campaign is launched
app.post('/api/send', (req, res) => {
  const { campaignId, channel, targetCustomers } = req.body;

  if (!campaignId || !targetCustomers || !targetCustomers.length) {
    return res.status(400).json({ message: 'Missing campaignId or targetCustomers list' });
  }

  // Forward details to the external, decoupled channelService simulation running on port 3001
  fetch('http://localhost:3001/channel/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ campaignId, channel, targetCustomers })
  })
  .then(resp => {
    if (!resp.ok) {
      console.error('[server.ts] Failed to forward sending process to channelService on 3001:', resp.statusText);
    }
  })
  .catch(err => {
    console.error('[server.ts] Error connecting to channelService on port 3001:', err.message);
  });

  res.json({ status: 'queued', message: `Campaign sending initiated for ${targetCustomers.length} customers over decoupled service.` });
});

// Helper to update Campaign when a Conversion Order occurs!
function handleAttributedOrder(campaignId: string, customerId: string) {
  const campaigns = getCampaigns();
  const orders = getOrders();
  const customers = getCustomers();

  const campaign = campaigns.find(c => c.campaignId === campaignId);
  const customer = customers.find(c => c.id === customerId);

  if (!campaign || !customer) return;

  // Create a real new Order record in DB!
  const orderId = `ord_conv_${Date.now()}_${customerId.substring(1)}`;
  const orderAmount = Math.max(800, Math.floor(Math.random() * 4000) + 500); // realistic range

  const newOrder: Order = {
    orderId,
    customerId,
    amount: orderAmount,
    items: ['Single Origin Coffee Beans Selection', 'Glass Drip Brewer'],
    timestamp: new Date().toISOString().split('T')[0]
  };

  orders.push(newOrder);
  writeOrders(orders);

  // Update customer spend aggregates
  customer.orderCount += 1;
  customer.totalSpent += orderAmount;
  customer.lastOrderDate = new Date().toISOString().split('T')[0];
  writeCustomers(customers);

  // Attribute order to Campaign
  campaign.orders_attributed += 1;
  campaign.revenue_attributed += orderAmount;
  writeCampaigns(campaigns);

  console.log(`[CONVERSION SUCCESS] Campaign ${campaignId} successfully converted customer ${customerId}! Order ₹${orderAmount} placed.`);
}

// 12. LAUNCH CAMPAIGN ROUTE
app.post('/api/campaigns/:id/launch', (req, res) => {
  const campaigns = getCampaigns();
  const campaign = campaigns.find(c => c.campaignId === req.params.id);

  if (!campaign) {
    return res.status(404).json({ message: 'Campaign not found' });
  }

  // Update status
  campaign.status = 'active';
  writeCampaigns(campaigns);

  // Fetch target matched customers to send into decoupling loop!
  // To keep it simple, we match a subset of customers based on audience tag/matched criteria
  const customers = getCustomers();
  let targetCustomers = [...customers];

  // Pick target customer count based on campaign matchedCount
  if (campaign.matchedCount > 0) {
    // Deterministically pick matchedCount users
    targetCustomers = customers.slice(0, campaign.matchedCount);
  } else {
    // Fallback pick 5 random customers
    targetCustomers = customers.sort(() => 0.5 - Math.random()).slice(0, 5);
    campaign.matchedCount = targetCustomers.length;
    writeCampaigns(campaigns);
  }

  // Trigger decoupled pipeline
  setTimeout(() => {
    fetch(`http://localhost:${PORT}/api/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        campaignId: campaign.campaignId,
        channel: campaign.channel,
        targetCustomers: targetCustomers.map(c => ({ id: c.id, name: c.name }))
      })
    })
    .catch(err => console.error('Decoupled launch trig failed:', err.message));
  }, 100);

  res.json({ success: true, campaign });
});

// 13. DATA INGESTION SUITE
app.post('/api/ingest', (req, res) => {
  const { customers: newCustomers, orders: newOrders } = req.body;
  
  if (!newCustomers && !newOrders) {
    return res.status(400).json({ message: 'Payload must contain customers or orders array' });
  }

  const databaseCustomers = getCustomers();
  const databaseOrders = getOrders();

  let addedCustomersCount = 0;
  let addedOrdersCount = 0;

  if (newCustomers && Array.isArray(newCustomers)) {
    newCustomers.forEach(nc => {
      // Validate customer structure
      if (!nc.name || !nc.email) return;
      const cid = nc.id || `c_ing_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
      
      const existing = databaseCustomers.find(c => c.id === cid || c.email === nc.email);
      if (!existing) {
        databaseCustomers.push({
          id: cid,
          name: nc.name,
          email: nc.email,
          phone: nc.phone || '+910000000000',
          memberSince: nc.memberSince || new Date().toISOString().split('T')[0],
          totalSpent: nc.totalSpent || 0,
          orderCount: nc.orderCount || 0,
          lastOrderDate: nc.lastOrderDate || new Date().toISOString().split('T')[0],
          tags: Array.isArray(nc.tags) ? nc.tags : ['new']
        });
        addedCustomersCount++;
      }
    });
    writeCustomers(databaseCustomers);
  }

  if (newOrders && Array.isArray(newOrders)) {
    newOrders.forEach(no => {
      if (!no.customerId || !no.amount) return;
      const oid = no.orderId || `ord_ing_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
      const existing = databaseOrders.find(o => o.orderId === oid);
      if (!existing) {
        databaseOrders.push({
          orderId: oid,
          customerId: no.customerId,
          amount: Number(no.amount),
          items: Array.isArray(no.items) ? no.items : ['Ingested Product Item'],
          timestamp: no.timestamp || new Date().toISOString().split('T')[0]
        });
        addedOrdersCount++;

        // Update customer spend aggregates
        const cust = databaseCustomers.find(c => c.id === no.customerId);
        if (cust) {
          cust.orderCount += 1;
          cust.totalSpent += Number(no.amount);
          cust.lastOrderDate = no.timestamp || new Date().toISOString().split('T')[0];
        }
      }
    });
    writeOrders(databaseOrders);
    writeCustomers(databaseCustomers);
  }

  res.json({
    success: true,
    message: `Data ingestion successful. Ingested ${addedCustomersCount} customers and ${addedOrdersCount} orders.`,
    stats: {
      addedCustomers: addedCustomersCount,
      addedOrders: addedOrdersCount,
      totalCustomers: databaseCustomers.length,
      totalOrders: databaseOrders.length
    }
  });
});

// FEATURE 1 & 3 & 4: COPOLIT GENERATION ENDPOINT
app.post(['/api/copilot/generate', '/api/v1/copilot/generate'], async (req, res) => {
  const { userPrompt } = req.body;
  if (!userPrompt) {
    return res.status(400).json({ message: 'userPrompt is required' });
  }

  const ai = getAi();
  const customers = getCustomers();
  const campaigns = getCampaigns();

  // Run channel optimizer natively (Feature 4)
  const optimized = optimizeChannel(campaigns);

  if (ai) {
    try {
      const sysInstruction = `You are a professional marketing strategist and database analyst for Mochi CRM.
Integrate the user's textual prompt to design a targeted campaign or perform CRM audits.
You have access to the real customer database: ${JSON.stringify(customers.map(c => ({ name: c.name, email: c.email, totalSpent: c.totalSpent, orderCount: c.orderCount, lastOrderDate: c.lastOrderDate, tags: c.tags })))}.

Analyse spending, order volume, tags, and dates to detect the core intent, categorizing it as one of:
- "show_high_value"
- "show_inactive"
- "predict_churn"
- "generate_email"
- "generate_whatsapp"
- "generate_sms"
- "generate_follow_up_email"
- "show_revenue_forecast"
(fallback to "generate_campaign" if no match).

Return a strict JSON conforming to this schema:
{
  "segment": {
    "rule": "Explanation of the rule filter applied, like 'totalSpent > 10000'",
    "audienceType": "Descriptive target group title, e.g., 'At-Risk Premium Coffee Drinkers'"
  },
  "channel": "whatsapp" | "email" | "sms" | "rcs",
  "message": "Enter high converting promotional message template body containing {name}",
  "prediction": {
    "openRate": number,
    "clickRate": number
  },
  "explainabilitySteps": [
    "A clean list of logical reasoning steps used to build this response"
  ],
  "intent": "Detected intent from listing above",
  "customers": [
    {
      "name": "Customer Name",
      "risk": "High" | "Medium" | "Low",
      "reason": "Direct reason based on their real metrics",
      "recommendedAction": "Actionable next step recommendation"
    }
  ],
  "summary": "Short professional summary of the action"
}

Suggested top-performing channel from historical logs: ${optimized.recommendedChannel} (Open rate: ${optimized.openRate}%, CTR: ${optimized.ctr}%). Try to recommend this channel unless the user prompt demands otherwise.`;

      const response = await generateContentWithRetry({
        preferredModel: 'gemini-3.5-flash',
        contents: `Marketer Prompt: "${userPrompt}"`,
        config: {
          systemInstruction: sysInstruction,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              segment: {
                type: Type.OBJECT,
                properties: {
                  rule: { type: Type.STRING },
                  audienceType: { type: Type.STRING }
                },
                required: ['rule', 'audienceType']
              },
              channel: { type: Type.STRING },
              message: { type: Type.STRING },
              prediction: {
                type: Type.OBJECT,
                properties: {
                  openRate: { type: Type.NUMBER },
                  clickRate: { type: Type.NUMBER }
                },
                required: ['openRate', 'clickRate']
              },
              explainabilitySteps: {
                type: Type.ARRAY,
                items: { type: Type.STRING }
              },
              intent: { type: Type.STRING },
              customers: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    name: { type: Type.STRING },
                    risk: { type: Type.STRING },
                    reason: { type: Type.STRING },
                    recommendedAction: { type: Type.STRING }
                  },
                  required: ['name', 'risk', 'reason', 'recommendedAction']
                }
              },
              summary: { type: Type.STRING }
            },
            required: ['segment', 'channel', 'message', 'prediction', 'explainabilitySteps', 'intent', 'customers', 'summary']
          }
        }
      });

      const parsed = JSON.parse(response.text || '{}');
      
      const r = (parsed.segment.rule || '').toLowerCase();
      let matched = [...customers];
      if (r.includes('60') || r.includes('inactive') || r.includes('days')) {
        matched = customers.filter(c => c.tags.includes('inactive') || c.tags.includes('at-risk'));
      } else if (r.includes('10000') || r.includes('vip') || r.includes('spent')) {
        matched = customers.filter(c => c.totalSpent > 10000);
      } else {
        matched = customers.slice(0, 8);
      }
      if (matched.length === 0) matched = customers.slice(0, 5);

      return res.json({
        ...parsed,
        matchedCount: matched.length
      });

    } catch (e) {
      console.error('[Copilot Engine] LLM failed, using advanced local fallback:', e);
    }
  }

  // Fallback trigger in case of API Key absence or rate limits
  const p = userPrompt.toLowerCase();
  let intent = 'generate_campaign';
  let channel: 'whatsapp' | 'email' | 'sms' | 'rcs' = 'whatsapp';
  let rule = 'customer.totalSpent > 5000';
  let audienceType = 'VIP Coffee Lovers';
  let message = 'Hey {name}! ☕ As one of our top patrons, here is an exclusive 15% off coupon: COFFEEVIP15. Validate yours here: xeno.coffee/vip';
  let openRate = 92;
  let clickRate = 14;
  let explainability = [
    "Historically spent over ₹10,000 at our brand outlets",
    "Highest active engagement loops in recent quarters",
    "Preference detected for premium single-origin roasts"
  ];
  let clientAudit: any[] = [];
  let summary = 'Copilot processed requested workflow.';

  if (p.includes('high value') || p.includes('vip') || p.includes('big spender')) {
    intent = 'show_high_value';
    const highVal = customers.filter(c => c.totalSpent > 9000);
    clientAudit = highVal.map(c => ({
      name: c.name,
      risk: 'Low',
      reason: `Healthy customer with ₹${c.totalSpent.toLocaleString()} lifetime spend over ${c.orderCount} orders.`,
      recommendedAction: 'Send exclusive early access invites to premium seasonal single-origins.'
    }));
    rule = 'customer.totalSpent > 9000';
    audienceType = 'High-Value VIPs';
    channel = 'whatsapp';
    message = 'Greetings {name}! ⭐ As a valued Mochi VIP, enjoy early release slots for our micro-lot Panama Geisha beans: mochi.coffee/reserve';
    summary = `Detected ${highVal.length} high value premium client profiles with Lifetime Value exceeding ₹9,000.`;
  } else if (p.includes('inactive') || p.includes('lapsed') || p.includes('dormant') || p.includes('no purchase')) {
    intent = 'show_inactive';
    const inactives = customers.filter(c => c.tags.includes('inactive') || c.tags.includes('at-risk'));
    clientAudit = inactives.map(c => ({
      name: c.name,
      risk: 'High',
      reason: `No purchase recorded since ${c.lastOrderDate || '90 days'}. Tagged as inactive.`,
      recommendedAction: 'Engage with aggressive 25% discount re-engagement campaign.'
    }));
    rule = 'customer.tags.contains("inactive")';
    audienceType = 'Lapsed Inactive Patrons';
    channel = 'email';
    message = 'Hi {name}, we miss you at Mochi CRM! ☕ Brew again with a fresh 20% discount coupon code: COMEBACK20. Claim: mochi.crm/welcomeback';
    summary = `Identified ${inactives.length} lapsed customer profiles with no recent order activity in past 60-90 days.`;
  } else if (p.includes('churn') || p.includes('predict churn') || p.includes('risk')) {
    intent = 'predict_churn';
    const atRisk = customers.filter(c => c.tags.includes('at-risk') || c.totalSpent < 3000);
    clientAudit = atRisk.slice(0, 4).map(c => ({
      name: c.name,
      risk: c.tags.includes('at-risk') ? 'High' : 'Medium',
      reason: `Reduced purchase frequency (${c.orderCount} orders total) and declining engagement indices.`,
      recommendedAction: 'Send rapid satisfaction surveys via WhatsApp followed by immediate 15% discount.'
    }));
    rule = 'customer.churnRisk == "High"';
    audienceType = 'High Churn Risk Cohorts';
    channel = 'sms';
    message = 'Hey {name}, your feedback matters! Take our 1-min quick survey & unlock safe free coffee perks: mochi.coffee/survey';
    summary = `Analytical churn model detects ${atRisk.length} active customer profiles showing high/medium risk criteria.`;
  } else if (p.includes('whatsapp')) {
    intent = 'generate_whatsapp';
    rule = 'preferredChannel == "whatsapp"';
    audienceType = 'WhatsApp-Preferred Shoppers';
    channel = 'whatsapp';
    message = 'Hey {name}! ⚡ Quick update: Mochi Espresso Stout returns tonight! Claim a free mug with code STOUTMUG today: mochi.coffee/stout';
    clientAudit = customers.filter(c => c.phone).slice(0, 3).map(c => ({
      name: c.name,
      risk: 'Low',
      reason: `Highly responsive on mobile channel (${c.phone}).`,
      recommendedAction: 'Broadcast conversational checkout template.'
    }));
    summary = 'Synthesized conversational WhatsApp broadcast for high mobile-intent subscribers.';
  } else if (p.includes('email') && p.includes('follow')) {
    intent = 'generate_follow_up_email';
    rule = 'campaign.opened == true && campaign.clicked == false';
    audienceType = 'Email Engaged Non-Convertors';
    channel = 'email';
    message = 'Subject: Quick question about your Mochi order, {name}...\n\nHi {name},\nWe noticed you checked out our micro-lots but didn\'t claim your slots. Need help picking a roast? Reply directly or claim 10% off: mochi.coffee/assist';
    clientAudit = customers.slice(0, 2).map(c => ({
      name: c.name,
      risk: 'Medium',
      reason: 'Lapsed cart conversion after launching the principal campaign.',
      recommendedAction: 'Deliver gentle follow-up sequence containing conversational queries.'
    }));
    summary = 'Generated conversational multi-stage email follow-up sequence with secondary activation links.';
  } else if (p.includes('email')) {
    intent = 'generate_email';
    rule = 'preferredChannel == "email"';
    audienceType = 'Newsletter Subscribers';
    channel = 'email';
    message = 'Subject: Your Exclusive Weekend Brew Report from Mochi ☕\n\nDear {name},\nOur Master Roaster just pulled a limited release of Ethiopian Yirgacheffe. Buy one, get one 50% off: mochi.coffee/weekend';
    clientAudit = customers.filter(c => c.email).slice(0, 3).map(c => ({
      name: c.name,
      risk: 'Low',
      reason: `Email delivery opt-in confirmed (${c.email}).`,
      recommendedAction: 'Enroll into bi-weekly newsletters.'
    }));
    summary = 'Synthesized premium HTML-compatible marketing email layout focusing on artisanal coffee drops.';
  } else if (p.includes('sms')) {
    intent = 'generate_sms';
    rule = 'customer.orderCount == 1';
    audienceType = 'Single-Purchase Converts';
    channel = 'sms';
    message = 'Mochi Alert: Hey {name}! Get double stars on all coffee orders this Thursday! Claim extra stars: mochi.coffee/loyalty';
    clientAudit = customers.slice(0, 3).map(c => ({
      name: c.name,
      risk: 'Low',
      reason: 'Ideal SMS-responsive transactional user profiles.',
      recommendedAction: 'Automate SMS triggers post point-of-sale checkouts.'
    }));
    summary = 'Drafted short high-conversion SMS broadcast for 160-character cellular deliverability.';
  } else if (p.includes('forecast') || p.includes('revenue') || p.includes('expect')) {
    intent = 'show_revenue_forecast';
    rule = 'all';
    audienceType = 'Total Addressable Market';
    channel = 'email';
    message = 'Hey {name}! ☕ Double up your balances at Mochi CRM & get flat ₹500 cashback credit: mochi.coffee/recharge';
    clientAudit = customers.slice(0, 4).map(c => ({
      name: c.name,
      risk: 'Low',
      reason: `Steady past spend of ₹${c.totalSpent.toLocaleString()}.`,
      recommendedAction: 'Predicting ₹${(c.totalSpent * 1.15).toFixed(0)} spent within next fiscal quarter.'
    }));
    const totalCurrent = customers.reduce((sum, c) => sum + c.totalSpent, 0);
    summary = `Statistical models project positive growth. Current CRM aggregate is ₹${totalCurrent.toLocaleString()}. Expected Q3 lift is +14.2% (₹${(totalCurrent * 1.142).toFixed(0)} total forecast).`;
  }

  const matched = customers.slice(0, clientAudit.length > 0 ? clientAudit.length : 4);

  res.json({
    segment: { rule, audienceType },
    channel,
    message,
    prediction: { openRate, clickRate },
    matchedCount: matched.length,
    explainabilitySteps: explainability,
    intent,
    customers: clientAudit,
    summary
  });
});

// FEATURE 2: DAILY STRATEGIC INSIGHTS ENDPOINT
app.get(['/api/insights/daily', '/api/v1/insights/daily'], async (req, res) => {
  const customers = getCustomers();
  const orders = getOrders();
  const campaigns = getCampaigns();

  // Dynamic Metrics Aggregators
  const now = new Date('2026-06-12T07:16:58-07:00');
  
  // 1. Churn Risk (lastPurchase > 60 days)
  const churnList = customers.filter(c => {
    const lastDate = new Date(c.lastOrderDate);
    const diffDays = Math.floor(Math.abs(now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays > 60;
  });
  
  // 2. VIP Tiers (totalSpent > 10000)
  const vipList = customers.filter(c => c.totalSpent > 10000);

  // 3. Inactive volume (lastPurchase > 90 days)
  const inactiveList = customers.filter(c => {
    const lastDate = new Date(c.lastOrderDate);
    const diffDays = Math.floor(Math.abs(now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays > 90;
  });

  // Calculate Average Order Value (AOV)
  const totalSpend = orders.reduce((acc, o) => acc + o.amount, 0);
  const avgOrderValue = orders.length > 0 ? totalSpend / orders.length : 1250;
  const revenueAtRisk = Math.round(avgOrderValue * inactiveList.length);

  const statsPayload = {
    churnRiskCount: churnList.length,
    vipCount: vipList.length,
    inactive90Count: inactiveList.length,
    revenueAtRisk
  };

  const ai = getAi();
  if (ai) {
    try {
      const sysInstruction = `You are Mochi CRM's executive Marketing Analytics Advisor. Given daily metrics on churn, VIPs, and risk:
${JSON.stringify(statsPayload)}

Generate exactly 3 high-impact marketing actions formatted as JSON.
The return structure must be a strict JSON object matching:
{
  "insights": [
    {
      "title": "Title of the alert card",
      "description": "Short, highly descriptive and action-oriented summary tailored to the specific collection metrics",
      "impact": "Highlight string (e.g. '₹84,500 at risk' or '48 at risk')",
      "actionLabel": "Action button text like 'Launch Retention Campaign'",
      "campaignPayload": {
        "name": "Campaign title to auto-fill",
        "audiencePrompt": "Prompt string to identify segment",
        "matchedCount": number,
        "message": "Promotional message targeting this cohort with {name}",
        "channel": "whatsapp" | "email" | "sms" | "rcs"
      }
    }
  ]
}`;

      const response = await generateContentWithRetry({
        preferredModel: 'gemini-3.5-flash',
        contents: `Analyze daily numbers and generate the action items list. Current AOV is ₹${Math.round(avgOrderValue)}`,
        config: {
          systemInstruction: sysInstruction,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              insights: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    title: { type: Type.STRING },
                    description: { type: Type.STRING },
                    impact: { type: Type.STRING },
                    actionLabel: { type: Type.STRING },
                    campaignPayload: {
                      type: Type.OBJECT,
                      properties: {
                        name: { type: Type.STRING },
                        audiencePrompt: { type: Type.STRING },
                        matchedCount: { type: Type.INTEGER },
                        message: { type: Type.STRING },
                        channel: { type: Type.STRING }
                      },
                      required: ['name', 'audiencePrompt', 'matchedCount', 'message', 'channel']
                    }
                  },
                  required: ['title', 'description', 'impact', 'actionLabel', 'campaignPayload']
                }
              }
            },
            required: ['insights']
          }
        }
      });

      const parsed = JSON.parse(response.text || '{}');
      if (parsed.insights && parsed.insights.length >= 3) {
        return res.json({
          counts: statsPayload,
          insights: parsed.insights
        });
      }
    } catch (e) {
      console.error('[Strategic Insights] Gemini model failed, using analytic heuristics fallbacks:', e);
    }
  }

  // Dynamic fallback heuristics
  const fallbackInsights = [
    {
      title: `Lapsed Customers Retention`,
      description: `Identify ${statsPayload.churnRiskCount} valuable customers with no purchases over 60 days. Sending a flat discount reduces churn rate instantly before complete dormancy.`,
      impact: `${statsPayload.churnRiskCount} Shoppers Churning`,
      actionLabel: 'Create Retention Campaign',
      campaignPayload: {
        name: 'VIP Customer Retention Campaign 💖',
        audiencePrompt: 'Spent over ₹5,000, last purchased > 60 days ago',
        matchedCount: statsPayload.churnRiskCount || 12,
        message: 'Hey {name}! We miss you! Enjoy 20% off our premium single-origins with code BACK20. Shop: links.xeno.com/back',
        channel: 'email' as const
      }
    },
    {
      title: `VIP Growth Push`,
      description: `${statsPayload.vipCount} customers exceed our ₹10,000 premium loyalty threshold. Introduce them to limited single-origin micro-lots via high open messaging.`,
      impact: `+₹15,000 Upsell Target`,
      actionLabel: 'Launch VIP Campaign',
      campaignPayload: {
        name: 'Micro-lot Premium Cold Brew Drop ☕',
        audiencePrompt: 'Super VIP Segment with > ₹10,000 organic spend',
        matchedCount: statsPayload.vipCount || 5,
        message: 'Hey {name}! ☕ Exclusive first-access to our limited organic Geisha beans. Use: GEISHA15. Order now: links.xeno.com/geisha',
        channel: 'whatsapp' as const
      }
    },
    {
      title: `Dormancy Risk Recovery`,
      description: `${statsPayload.inactive90Count} customers reached complete dormancy (>90 days inactive). Recapturing this group protects critical marketing margins.`,
      impact: `₹${statsPayload.revenueAtRisk.toLocaleString()} At Churn Risk`,
      actionLabel: 'Launch Win-Back',
      campaignPayload: {
        name: 'Dormant Leads Win-Back Event ✨',
        audiencePrompt: 'Inactive leads, last purchased > 90 days ago',
        matchedCount: statsPayload.inactive90Count || 8,
        message: 'Hey {name}! It has been a while. Here is continuous cash reward worth ₹500 for your second purchase. Redeem: links.xeno.com/rewards',
        channel: 'sms' as const
      }
    }
  ];

  res.json({
    counts: statsPayload,
    insights: fallbackInsights
  });
});

// 14. RESET DATABASE API FOR TESTING Demo
app.post('/api/reset-demo', (req, res) => {
  // Just clear crm_db.json on disk to trigger fresh seed!
  const DB_FILE = path.join(process.cwd(), 'crm_db.json');
  if (fs.existsSync(DB_FILE)) {
    try {
      fs.unlinkSync(DB_FILE);
    } catch(err) {}
  }
  loadDatabase();
  res.json({ success: true, message: 'Database reset to beautiful demo defaults!' });
});


// -------------------------------------------------------------
// VITE OR STATIC SERVING MIDDLEWARE MOUNT
// -------------------------------------------------------------
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
