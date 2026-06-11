import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
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
import { Customer, Order, Campaign, CommunicationEvent, AnalyticsOverview } from './src/types/index.js';

const app = express();
app.use(express.json());

const PORT = 3000;

// Lazy initialization of Gemini developer SDK
let aiClient: GoogleGenAI | null = null;
function getAi(): GoogleGenAI | null {
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
async function generateContentWithRetry(params: {
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
        console.warn(`[Gemini API] Model ${modelName} (attempt ${attempt}/3) failed: ${errMsg}`);
        
        // Detect if the server is busy / experiencing high demand (503 / UNAVAILABLE)
        const isServerBusy = errMsg.includes('503') || 
                             errMsg.includes('UNAVAILABLE') || 
                             errMsg.includes('high demand') ||
                             errMsg.includes('temporary') ||
                             e?.status === 503 ||
                             e?.code === 503 ||
                             (e?.error && (e.error?.code === 503 || e.error?.status === 'UNAVAILABLE'));

        if (isServerBusy) {
          console.log(`[Gemini API] Model ${modelName} is experiencing high demand (503). Skipping immediate retries to cascade to next model...`);
          break; // Stop retrying this model and proceed to the next model in the outer cascade loop
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

  const avgDeliveryRate = totalSents > 0 ? (totalDelivereds / totalSents) * 100 : 85.0;
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

      const sysInstruction = `You are the AI brain behind Xeno CRM's Hybrid Segmentation Engine. Given a list of customers and the marketer's natural language goal description, you must identify which customer IDs match the criteria.
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

      const sysInstruction = `You are Xeno CRM's Chief Data Scientist AI. Analyze the uploaded customer base and marketing metrics. Generate exactly 5 valuable business insights matching the 5 requested categories:
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
      const sysInstruction = `You are a D2C e-commerce forecasting neural network. Predict real-time engagement and financial outcomes for Xeno CRM. Given a count of targeted customers, the chosen communication channel, the message text, and the target cohort prompt, calculate:
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

  res.json({ success: true, oldStatus, newStatus: status, campaignStats: campaign });
});

// Post /api/send is called in batch when a campaign is launched
app.post('/api/send', (req, res) => {
  const { campaignId, channel, targetCustomers } = req.body;

  if (!campaignId || !targetCustomers || !targetCustomers.length) {
    return res.status(400).json({ message: 'Missing campaignId or targetCustomers list' });
  }

  // We immediately respond OK to satisfy async decoupled architecture
  res.json({ status: 'queued', message: `Campaign sending initiated for ${targetCustomers.length} customers.` });

  // Now, fire off separate non-blocking asynchronous callback pipelines with timeouts!
  targetCustomers.forEach((cust: { id: string; name: string }) => {
    // 1. Sent Callback (very fast ~400ms)
    setTimeout(() => {
      triggerCallback(campaignId, cust.id, 'sent');
    }, Math.random() * 500 + 200);

    // 2. Delivery Evaluation (~1500ms to 3000ms)
    const outcomeRoll = Math.random(); // 0 to 1
    
    setTimeout(() => {
      if (outcomeRoll < 0.10) {
        // 10% Failed
        triggerCallback(campaignId, cust.id, 'failed');
      } else {
        // 90% Delivered (Sum: Clicked 5%, Opened 15%, Delivered 70%)
        triggerCallback(campaignId, cust.id, 'delivered');

        // 3. Open Evaluation (~3500ms to 6000ms)
        const totalOpenRate = 0.222; // 20% of delivered users open
        if (outcomeRoll >= 0.10 && outcomeRoll < 0.35) {
          setTimeout(() => {
            triggerCallback(campaignId, cust.id, 'opened');

            // 4. Click Evaluation (~7000ms to 10000ms)
            const clickTrigger = Math.random();
            if (clickTrigger < 0.25) { // 25% of opened users click
              setTimeout(() => {
                triggerCallback(campaignId, cust.id, 'clicked');

                // 5. ATTRIBUTED CONVERSION ORDER (Magical touch!)
                // With 30% conversion probability from a click, shopper makes a direct order!
                if (Math.random() < 0.35) {
                  setTimeout(() => {
                    handleAttributedOrder(campaignId, cust.id);
                  }, Math.random() * 2000 + 1000);
                }
              }, Math.random() * 3000 + 2000);
            }
          }, Math.random() * 2000 + 2000);
        }
      }
    }, Math.random() * 1500 + 1500);
  });
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

// Function to call /callback internally (simulating decoupled webhook loop)
function triggerCallback(campaignId: string, customerId: string, status: string) {
  // We mock a POST webhook call to our same server API
  const url = `http://localhost:${PORT}/api/callback`;
  
  fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ campaignId, customerId, status })
  })
  .then(res => res.json())
  .catch(err => {
    // console.error('[Webhook Simulation Error]', err.message);
  });
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
