import { 
  Customer, 
  Order, 
  Campaign, 
  CommunicationEvent, 
  AnalyticsOverview, 
  AISuggestion, 
  AIMessages,
  RecentActivityItem,
  calculateCustomerHealth,
  AIInsightItem,
  CampaignPrediction
} from '../types/index.js';
import { db, auth, handleFirestoreError, OperationType } from './firebase.js';
import { SEED_CUSTOMERS, SEED_CAMPAIGNS, SEED_ORDERS_MAPPING } from '../components/FirebaseProvider.js';
import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  setDoc, 
  updateDoc, 
  query, 
  where,
  writeBatch
} from 'firebase/firestore';

const API_BASE = '/api';

// Helper to check if Demo Mode is active
export function isDemoMode(): boolean {
  return localStorage.getItem('xeno_demo_mode') === 'true';
}

// Initialise storage collections for offline/localStorage Demo Mode
export function initLocalDemoStorage() {
  if (!localStorage.getItem('xeno_demo_customers')) {
    localStorage.setItem('xeno_demo_customers', JSON.stringify(SEED_CUSTOMERS));
  }
  if (!localStorage.getItem('xeno_demo_campaigns')) {
    localStorage.setItem('xeno_demo_campaigns', JSON.stringify(SEED_CAMPAIGNS));
  }
  if (!localStorage.getItem('xeno_demo_orders')) {
    const seedOrders: Order[] = [];
    SEED_CUSTOMERS.forEach((customer) => {
      const { count, total, lastDate } = SEED_ORDERS_MAPPING[customer.id] || { count: 1, total: 1000, lastDate: '2026-06-01' };
      let accumulated = 0;
      for (let i = 0; i < count; i++) {
        const amt = i === count - 1 ? Math.max(100, total - accumulated) : Math.floor(total / count);
        accumulated += amt;
        const oId = `ord_${customer.id}_${i}`;
        seedOrders.push({
          orderId: oId,
          customerId: customer.id,
          amount: amt,
          items: i % 2 === 0 ? ['Single Origin Coffee Bag'] : ['Glass Drip Brewer'],
          timestamp: lastDate
        });
      }
    });
    localStorage.setItem('xeno_demo_orders', JSON.stringify(seedOrders));
  }
  if (!localStorage.getItem('xeno_demo_events')) {
    const seedEvents = [
      { eventId: 'evt_cmp_001_c1', campaignId: 'cmp_001', customerId: 'c1', status: 'clicked', timestamp: '2026-05-20' },
      { eventId: 'evt_cmp_001_c2', campaignId: 'cmp_001', customerId: 'c2', status: 'opened', timestamp: '2026-05-21' },
      { eventId: 'evt_cmp_002_c1', campaignId: 'cmp_002', customerId: 'c1', status: 'opened', timestamp: '2026-06-01' }
    ];
    localStorage.setItem('xeno_demo_events', JSON.stringify(seedEvents));
  }
}

// Local simulation helper functions
function triggerLocalDemoCallback(campaignId: string, customerId: string, status: 'sent' | 'delivered' | 'opened' | 'clicked' | 'failed') {
  try {
    const eId = `evt_${campaignId}_${customerId}_${Date.now()}`;
    const localEvents: any[] = JSON.parse(localStorage.getItem('xeno_demo_events') || '[]');
    localEvents.push({
      eventId: eId,
      campaignId,
      customerId,
      status,
      timestamp: new Date().toISOString()
    });
    localStorage.setItem('xeno_demo_events', JSON.stringify(localEvents));

    // Update campaign metrics
    const localCampaigns: Campaign[] = JSON.parse(localStorage.getItem('xeno_demo_campaigns') || '[]');
    const targetIdx = localCampaigns.findIndex(c => c.campaignId === campaignId);
    if (targetIdx !== -1) {
      const cmp = localCampaigns[targetIdx];
      if (status === 'sent') cmp.sent_count = (cmp.sent_count || 0) + 1;
      else if (status === 'failed') cmp.failed_count = (cmp.failed_count || 0) + 1;
      else if (status === 'delivered') cmp.delivered_count = (cmp.delivered_count || 0) + 1;
      else if (status === 'opened') cmp.opened_count = (cmp.opened_count || 0) + 1;
      else if (status === 'clicked') cmp.clicked_count = (cmp.clicked_count || 0) + 1;
      localCampaigns[targetIdx] = cmp;
      localStorage.setItem('xeno_demo_campaigns', JSON.stringify(localCampaigns));
    }
  } catch (err) {
    console.warn('[Local Demo Webhook Simulation failed]', err);
  }
}

function triggerLocalDemoAttributedOrder(campaignId: string, customerId: string) {
  try {
    const amount = Math.max(800, Math.floor(Math.random() * 4000) + 500);
    const oId = `ord_conv_${Date.now()}_${customerId}`;
    
    // Create new converted transaction document locally
    const localOrders: Order[] = JSON.parse(localStorage.getItem('xeno_demo_orders') || '[]');
    localOrders.push({
      orderId: oId,
      customerId,
      amount,
      items: ['Single Origin Coffee Beans Selection', 'Glass Drip Brewer'],
      timestamp: new Date().toISOString().split('T')[0]
    });
    localStorage.setItem('xeno_demo_orders', JSON.stringify(localOrders));

    // Update customer spending profile locally
    const localCustomers: Customer[] = JSON.parse(localStorage.getItem('xeno_demo_customers') || '[]');
    const custIdx = localCustomers.findIndex(c => c.id === customerId);
    if (custIdx !== -1) {
      const customer = localCustomers[custIdx];
      customer.orderCount = (customer.orderCount || 0) + 1;
      customer.totalSpent = (customer.totalSpent || 0) + amount;
      customer.lastOrderDate = new Date().toISOString().split('T')[0];
      localCustomers[custIdx] = customer;
      localStorage.setItem('xeno_demo_customers', JSON.stringify(localCustomers));
    }

    // Attribute to Campaign locally
    const localCampaigns: Campaign[] = JSON.parse(localStorage.getItem('xeno_demo_campaigns') || '[]');
    const cmpIdx = localCampaigns.findIndex(c => c.campaignId === campaignId);
    if (cmpIdx !== -1) {
      const campaign = localCampaigns[cmpIdx];
      campaign.orders_attributed = (campaign.orders_attributed || 0) + 1;
      campaign.revenue_attributed = (campaign.revenue_attributed || 0) + amount;
      localCampaigns[cmpIdx] = campaign;
      localStorage.setItem('xeno_demo_campaigns', JSON.stringify(localCampaigns));
    }
  } catch (err) {
    console.warn('[Local Demo Conversion Simulation failed]', err);
  }
}

export function triggerLocalDemoMetricsSimulation(campaignId: string) {
  try {
    initLocalDemoStorage();
    const localCampaigns: Campaign[] = JSON.parse(localStorage.getItem('xeno_demo_campaigns') || '[]');
    const campaign = localCampaigns.find(c => c.campaignId === campaignId);
    if (!campaign) return;

    const customers: Customer[] = JSON.parse(localStorage.getItem('xeno_demo_customers') || '[]');
    const targetCount = campaign.matchedCount || 5;
    const targets = customers.slice(0, targetCount);

    targets.forEach((cust) => {
      // Step A: Dispatched status
      setTimeout(() => {
        triggerLocalDemoCallback(campaignId, cust.id, 'sent');
      }, Math.random() * 400 + 200);

      // Step B: Delivery Status
      const roll = Math.random();
      setTimeout(() => {
        if (roll < 0.12) {
          triggerLocalDemoCallback(campaignId, cust.id, 'failed');
        } else {
          triggerLocalDemoCallback(campaignId, cust.id, 'delivered');

          // Step C: Opened Engagement
          if (roll >= 0.12 && roll < 0.45) {
            setTimeout(() => {
              triggerLocalDemoCallback(campaignId, cust.id, 'opened');

              // Step D: CTR Clicked Link
              if (Math.random() < 0.6) {
                setTimeout(() => {
                  triggerLocalDemoCallback(campaignId, cust.id, 'clicked');

                  // Step E: Attributed Conversion Purchase
                  if (Math.random() < 0.45) {
                    setTimeout(() => {
                      triggerLocalDemoAttributedOrder(campaignId, cust.id);
                    }, Math.random() * 1500 + 1000);
                  }
                }, Math.random() * 2000 + 1000);
              }
            }, Math.random() * 2000 + 1500);
          }
        }
      }, Math.random() * 1500 + 1000);
    });
  } catch (e) {
    console.warn('[Failed executing local demo metrics simulation]', e);
  }
}

// Helper to determine if we have an active, authenticated Firestore user
function getUid(): string | null {
  if (isDemoMode()) {
    return 'demo-local-user';
  }
  return auth.currentUser ? auth.currentUser.uid : null;
}

// -------------------------------------------------------------
// 1. GET CUSTOMERS
// -------------------------------------------------------------
export async function fetchCustomers(search = '', tag = 'all'): Promise<Customer[]> {
  if (isDemoMode()) {
    initLocalDemoStorage();
    const localCustomers: Customer[] = JSON.parse(localStorage.getItem('xeno_demo_customers') || '[]');
    const enrichedList = localCustomers.map(c => ({
      ...c,
      ...calculateCustomerHealth(c)
    }));

    let filtered = [...enrichedList];

    if (tag && tag !== 'all') {
      filtered = filtered.filter(c => c.tags.includes(tag));
    }

    if (search) {
      const s = search.toLowerCase();
      filtered = filtered.filter(c => 
        c.name.toLowerCase().includes(s) || 
        c.email.toLowerCase().includes(s) || 
        c.phone.includes(s)
      );
    }

    return filtered;
  }

  const uid = getUid();
  if (uid) {
    try {
      const customersRef = collection(db, 'users', uid, 'customers');
      const snap = await getDocs(customersRef);
      const list: Customer[] = [];
      snap.forEach((docSnap) => {
        list.push(docSnap.data() as Customer);
      });

      const enrichedList = list.map(c => ({
        ...c,
        ...calculateCustomerHealth(c)
      }));

      let filtered = [...enrichedList];

      if (tag && tag !== 'all') {
        filtered = filtered.filter(c => c.tags.includes(tag));
      }

      if (search) {
        const s = search.toLowerCase();
        filtered = filtered.filter(c => 
          c.name.toLowerCase().includes(s) || 
          c.email.toLowerCase().includes(s) || 
          c.phone.includes(s)
        );
      }

      return filtered;
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, `users/${uid}/customers`);
    }
  }

  // Server Fallback
  const params = new URLSearchParams();
  if (search) params.append('search', search);
  if (tag) params.append('tag', tag);
  
  const res = await fetch(`${API_BASE}/customers?${params.toString()}`);
  if (!res.ok) throw new Error('Failed to fetch customers');
  const serverList: Customer[] = await res.json();
  return serverList.map(c => ({
    ...c,
    ...calculateCustomerHealth(c)
  }));
}

// -------------------------------------------------------------
// 2. GET SINGLE CUSTOMER DETAILS (AND ORDERS)
// -------------------------------------------------------------
export async function fetchCustomerDetails(id: string): Promise<{ customer: Customer; orders: Order[] }> {
  if (isDemoMode()) {
    initLocalDemoStorage();
    const localCustomers: Customer[] = JSON.parse(localStorage.getItem('xeno_demo_customers') || '[]');
    const customerRaw = localCustomers.find(c => c.id === id);
    if (!customerRaw) throw new Error('Customer template not found in Local Demo DB');
    const customer = { ...customerRaw, ...calculateCustomerHealth(customerRaw) };
    
    const localOrders: Order[] = JSON.parse(localStorage.getItem('xeno_demo_orders') || '[]');
    const customerOrders = localOrders.filter(o => o.customerId === id);
    return { customer, orders: customerOrders };
  }

  const uid = getUid();
  if (uid) {
    try {
      const custDocRef = doc(db, 'users', uid, 'customers', id);
      const custSnap = await getDoc(custDocRef);
      if (!custSnap.exists()) {
        throw new Error('Customer template not found in Cloud Database');
      }
      const customerRaw = custSnap.data() as Customer;
      const customer = { ...customerRaw, ...calculateCustomerHealth(customerRaw) };

      const ordersRef = collection(db, 'users', uid, 'orders');
      const ordersSnap = await getDocs(ordersRef);
      const allOrders: Order[] = [];
      ordersSnap.forEach((oSnap) => {
        allOrders.push(oSnap.data() as Order);
      });

      const customerOrders = allOrders.filter(o => o.customerId === id);
      return { customer, orders: customerOrders };
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, `users/${uid}/customers/${id}`);
    }
  }

  // Server Fallback
  const res = await fetch(`${API_BASE}/customers/${id}`);
  if (!res.ok) throw new Error('Failed to fetch customer details');
  const details = await res.json();
  if (details && details.customer) {
    details.customer = {
      ...details.customer,
      ...calculateCustomerHealth(details.customer)
    };
  }
  return details;
}

// -------------------------------------------------------------
// 3. GET CAMPAIGNS
// -------------------------------------------------------------
export async function fetchCampaigns(status = 'all'): Promise<Campaign[]> {
  if (isDemoMode()) {
    initLocalDemoStorage();
    const localCampaigns: Campaign[] = JSON.parse(localStorage.getItem('xeno_demo_campaigns') || '[]');
    let filtered = [...localCampaigns];
    if (status && status !== 'all') {
      filtered = filtered.filter(c => c.status === status);
    }
    // Sort reverse chronological
    filtered.sort((a, b) => new Date(b.createdAt || '').getTime() - new Date(a.createdAt || '').getTime());
    return filtered;
  }

  const uid = getUid();
  if (uid) {
    try {
      const snap = await getDocs(collection(db, 'users', uid, 'campaigns'));
      const list: Campaign[] = [];
      snap.forEach((d) => {
        list.push(d.data() as Campaign);
      });

      let filtered = [...list];
      if (status && status !== 'all') {
        filtered = filtered.filter(c => c.status === status);
      }

      return filtered;
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, `users/${uid}/campaigns`);
    }
  }

  // Server Fallback
  const res = await fetch(`${API_BASE}/campaigns?status=${status}`);
  if (!res.ok) throw new Error('Failed to fetch campaigns');
  return res.json();
}

// -------------------------------------------------------------
// 4. GET SINGLE CAMPAIGN
// -------------------------------------------------------------
export async function fetchCampaignById(id: string): Promise<Campaign> {
  if (isDemoMode()) {
    initLocalDemoStorage();
    const localCampaigns: Campaign[] = JSON.parse(localStorage.getItem('xeno_demo_campaigns') || '[]');
    const cmp = localCampaigns.find(c => c.campaignId === id);
    if (!cmp) throw new Error('Campaign not found in Local Demo DB');
    return cmp;
  }

  const uid = getUid();
  if (uid) {
    try {
      const dRef = doc(db, 'users', uid, 'campaigns', id);
      const snap = await getDoc(dRef);
      if (!snap.exists()) throw new Error('Campaign not found in Cloud Database');
      return snap.data() as Campaign;
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, `users/${uid}/campaigns/${id}`);
    }
  }

  // Server Fallback
  const res = await fetch(`${API_BASE}/campaigns/${id}`);
  if (!res.ok) throw new Error('Failed to fetch campaign');
  return res.json();
}

// -------------------------------------------------------------
// 5. CREATE DRAFT CAMPAIGN
// -------------------------------------------------------------
export async function createCampaign(campaignData: Partial<Campaign>): Promise<Campaign> {
  if (isDemoMode()) {
    initLocalDemoStorage();
    const localCampaigns: Campaign[] = JSON.parse(localStorage.getItem('xeno_demo_campaigns') || '[]');
    const cId = campaignData.campaignId || `cmp_${Date.now()}`;
    const newCampaign: Campaign = {
      campaignId: cId,
      name: campaignData.name || `Campaign — ${new Date().toLocaleDateString()}`,
      audiencePrompt: campaignData.audiencePrompt || 'Manual segment',
      matchedCount: campaignData.matchedCount || 0,
      message: campaignData.message || '',
      channel: campaignData.channel || 'whatsapp',
      status: campaignData.status || 'draft',
      createdAt: new Date().toISOString().split('T')[0],
      sent_count: 0,
      delivered_count: 0,
      opened_count: 0,
      clicked_count: 0,
      failed_count: 0,
      orders_attributed: 0,
      revenue_attributed: 0
    };
    localCampaigns.push(newCampaign);
    localStorage.setItem('xeno_demo_campaigns', JSON.stringify(localCampaigns));
    return newCampaign;
  }

  const uid = getUid();
  if (uid) {
    try {
      const cId = campaignData.campaignId || `cmp_${Date.now()}`;
      const newCampaign: Campaign = {
        campaignId: cId,
        name: campaignData.name || `Campaign — ${new Date().toLocaleDateString()}`,
        audiencePrompt: campaignData.audiencePrompt || 'Manual segment',
        matchedCount: campaignData.matchedCount || 0,
        message: campaignData.message || '',
        channel: campaignData.channel || 'whatsapp',
        status: campaignData.status || 'draft',
        createdAt: new Date().toISOString().split('T')[0],
        sent_count: 0,
        delivered_count: 0,
        opened_count: 0,
        clicked_count: 0,
        failed_count: 0,
        orders_attributed: 0,
        revenue_attributed: 0
      };

      await setDoc(doc(db, 'users', uid, 'campaigns', cId), newCampaign);
      return newCampaign;
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `users/${uid}/campaigns`);
    }
  }

  // Server Fallback
  const res = await fetch(`${API_BASE}/campaigns`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(campaignData)
  });
  if (!res.ok) throw new Error('Failed to create campaign');
  return res.json();
}

// Helper internally simulating callback webhooks directly inside Firestore
async function triggerFirestoreCallback(uid: string, campaignId: string, customerId: string, status: 'sent' | 'delivered' | 'opened' | 'clicked' | 'failed') {
  try {
    const eId = `evt_${campaignId}_${customerId}_${Date.now()}`;
    const evtRef = doc(db, 'users', uid, 'events', eId);
    
    await setDoc(evtRef, {
      eventId: eId,
      campaignId,
      customerId,
      status,
      timestamp: new Date().toISOString()
    });

    // Re-verify campaign metrics safely to sync stats
    const campaignRef = doc(db, 'users', uid, 'campaigns', campaignId);
    const campaignSnap = await getDoc(campaignRef);
    if (!campaignSnap.exists()) return;
    const campaign = campaignSnap.data() as Campaign;

    // Increment corresponding metrics
    if (status === 'sent') campaign.sent_count += 1;
    else if (status === 'failed') campaign.failed_count += 1;
    else if (status === 'delivered') campaign.delivered_count += 1;
    else if (status === 'opened') campaign.opened_count += 1;
    else if (status === 'clicked') campaign.clicked_count += 1;

    await setDoc(campaignRef, campaign);
  } catch (err) {
    console.warn('[Simulator Webhook Link Failed]', err);
  }
}

async function triggerFirestoreAttributedOrder(uid: string, campaignId: string, customerId: string) {
  try {
    const amount = Math.max(800, Math.floor(Math.random() * 4000) + 500);
    const oId = `ord_conv_${Date.now()}_${customerId}`;
    
    // Create new converted transaction document
    const orderRef = doc(db, 'users', uid, 'orders', oId);
    await setDoc(orderRef, {
      orderId: oId,
      customerId,
      amount,
      items: ['Single Origin Coffee Beans Selection', 'Glass Drip Brewer'],
      timestamp: new Date().toISOString().split('T')[0]
    });

    // Update customer spending profile
    const customerRef = doc(db, 'users', uid, 'customers', customerId);
    const customerSnap = await getDoc(customerRef);
    if (customerSnap.exists()) {
      const customer = customerSnap.data() as Customer;
      customer.orderCount += 1;
      customer.totalSpent += amount;
      customer.lastOrderDate = new Date().toISOString().split('T')[0];
      await setDoc(customerRef, customer);
    }

    // Attribute to Campaign
    const campaignRef = doc(db, 'users', uid, 'campaigns', campaignId);
    const campaignSnap = await getDoc(campaignRef);
    if (campaignSnap.exists()) {
      const campaign = campaignSnap.data() as Campaign;
      campaign.orders_attributed += 1;
      campaign.revenue_attributed += amount;
      await setDoc(campaignRef, campaign);
    }
  } catch (err) {
    console.warn('[Simulator Conversion Order Fail]', err);
  }
}

// -------------------------------------------------------------
// 6. LAUNCH CAMPAIGN
// -------------------------------------------------------------
export async function launchCampaign(id: string): Promise<{ success: boolean; campaign: Campaign }> {
  if (isDemoMode()) {
    initLocalDemoStorage();
    const localCampaigns: Campaign[] = JSON.parse(localStorage.getItem('xeno_demo_campaigns') || '[]');
    const targetIdx = localCampaigns.findIndex(c => c.campaignId === id);
    if (targetIdx !== -1) {
      localCampaigns[targetIdx].status = 'active';
      localStorage.setItem('xeno_demo_campaigns', JSON.stringify(localCampaigns));
    }
    // Asynchronously kick off local simulation events/orders to update localStorage
    setTimeout(() => { triggerLocalDemoMetricsSimulation(id); }, 100);
    return { success: true, campaign: localCampaigns[targetIdx] || ({} as Campaign) };
  }

  const uid = getUid();
  if (uid) {
    try {
      const campaignRef = doc(db, 'users', uid, 'campaigns', id);
      const campaignSnap = await getDoc(campaignRef);
      if (!campaignSnap.exists()) throw new Error('Campaign not found');
      
      const campaign = campaignSnap.data() as Campaign;
      campaign.status = 'active';
      await setDoc(campaignRef, campaign);

      // Execute decoupled async simulator steps directly modifying states in cloud Firestore
      const customersSnap = await getDocs(collection(db, 'users', uid, 'customers'));
      const customers: Customer[] = [];
      customersSnap.forEach(d => { customers.push(d.data() as Customer); });

      const targetCount = campaign.matchedCount > 0 ? campaign.matchedCount : 5;
      const targets = customers.slice(0, targetCount);

      // Simulate step delays representing asynchronous pipeline
      targets.forEach((cust) => {
        // Step A: Dispatched status
        setTimeout(() => {
          triggerFirestoreCallback(uid, id, cust.id, 'sent');
        }, Math.random() * 400 + 200);

        // Step B: Delivery Status
        const roll = Math.random();
        setTimeout(() => {
          if (roll < 0.12) {
            triggerFirestoreCallback(uid, id, cust.id, 'failed');
          } else {
            triggerFirestoreCallback(uid, id, cust.id, 'delivered');

            // Step C: Opened Engagement
            if (roll >= 0.12 && roll < 0.45) {
              setTimeout(() => {
                triggerFirestoreCallback(uid, id, cust.id, 'opened');

                // Step D: CTR Clicked Link
                if (Math.random() < 0.6) {
                  setTimeout(() => {
                    triggerFirestoreCallback(uid, id, cust.id, 'clicked');

                    // Step E: Attributed Conversion Purchase
                    if (Math.random() < 0.45) {
                      setTimeout(() => {
                        triggerFirestoreAttributedOrder(uid, id, cust.id);
                      }, Math.random() * 1500 + 1000);
                    }
                  }, Math.random() * 2000 + 1000);
                }
              }, Math.random() * 2000 + 1500);
            }
          }
        }, Math.random() * 1500 + 1000);
      });

      return { success: true, campaign };
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `users/${uid}/campaigns/${id}`);
    }
  }

  // Server Fallback
  const res = await fetch(`${API_BASE}/campaigns/${id}/launch`, { method: 'POST' });
  if (!res.ok) throw new Error('Failed to launch campaign');
  return res.json();
}

// -------------------------------------------------------------
// 7. GET OVERVIEW ANALYTICS (KPI PANEL ACCURATE RE-COMPUTATIONS)
// -------------------------------------------------------------
export async function fetchOverviewAnalytics(): Promise<AnalyticsOverview> {
  if (isDemoMode()) {
    initLocalDemoStorage();
    const customersList: Customer[] = JSON.parse(localStorage.getItem('xeno_demo_customers') || '[]');
    const campaignsList: Campaign[] = JSON.parse(localStorage.getItem('xeno_demo_campaigns') || '[]');

    const activeCount = campaignsList.filter(c => c.status === 'active').length;
    const completedCampaigns = campaignsList.filter(c => c.status === 'completed' || c.status === 'active');

    let totalSent = 0;
    let totalDelivered = 0;
    let totalOpened = 0;
    let totalClicked = 0;

    completedCampaigns.forEach((c) => {
      totalSent += (c.sent_count || 0);
      totalDelivered += (c.delivered_count || 0);
      totalOpened += (c.opened_count || 0);
      totalClicked += (c.clicked_count || 0);
    });

    const avgDeliveryRate = totalSent > 0 ? (totalDelivered / totalSent) * 100 : 96.5;
    const avgCtr = totalOpened > 0 ? (totalClicked / totalOpened) * 100 : 22.4;
    const messagesThisWeek = totalSent || 42;

    const topChannel = campaignsList.length > 0 ? campaignsList[0].channel : 'whatsapp';
    const highSpent = customersList.filter(c => c.tags.includes('high-value') || c.totalSpent > 5000).length;

    return {
      totalCustomers: customersList.length,
      activeCampaigns: activeCount,
      avgDeliveryRate: Math.round(avgDeliveryRate * 10) / 10,
      avgCtr: Math.round(avgCtr * 10) / 10,
      messagesThisWeek,
      topChannel,
      topChannelRate: 94.8,
      mostActiveSegment: 'High Value Shoppers',
      mostActiveSegmentCount: highSpent,
      messagesDeliveredPercent: Math.round(avgDeliveryRate)
    };
  }

  const uid = getUid();
  if (uid) {
    try {
      // Load current cloud tables
      const [custSnap, campSnap, eventSnap] = await Promise.all([
        getDocs(collection(db, 'users', uid, 'customers')),
        getDocs(collection(db, 'users', uid, 'campaigns')),
        getDocs(collection(db, 'users', uid, 'events'))
      ]);

      const customersList: Customer[] = [];
      custSnap.forEach(d => customersList.push(d.data() as Customer));

      const campaignsList: Campaign[] = [];
      campSnap.forEach(d => campaignsList.push(d.data() as Campaign));

      const activeCount = campaignsList.filter(c => c.status === 'active').length;
      const completedCampaigns = campaignsList.filter(c => c.status === 'completed' || c.status === 'active');

      let totalSent = 0;
      let totalDelivered = 0;
      let totalOpened = 0;
      let totalClicked = 0;

      completedCampaigns.forEach((c) => {
        totalSent += c.sent_count;
        totalDelivered += c.delivered_count;
        totalOpened += c.opened_count;
        totalClicked += c.clicked_count;
      });

      const avgDeliveryRate = totalSent > 0 ? (totalDelivered / totalSent) * 100 : 85;
      const avgCtr = totalOpened > 0 ? (totalClicked / totalOpened) * 100 : 18.5;
      const messagesThisWeek = totalSent || 15;

      const topChannel = campaignsList.length > 0 ? campaignsList[0].channel : 'whatsapp';
      const highSpent = customersList.filter(c => c.tags.includes('high-value')).length;

      const results: AnalyticsOverview = {
        totalCustomers: customersList.length,
        activeCampaigns: activeCount,
        avgDeliveryRate: Math.round(avgDeliveryRate * 10) / 10,
        avgCtr: Math.round(avgCtr * 10) / 10,
        messagesThisWeek,
        topChannel,
        topChannelRate: 92.4,
        mostActiveSegment: 'High Value Shoppers',
        mostActiveSegmentCount: highSpent,
        messagesDeliveredPercent: Math.round(avgDeliveryRate)
      };
      
      return results;
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, `users/${uid}/analytics`);
    }
  }

  // Server Fallback
  const res = await fetch(`${API_BASE}/analytics/overview`);
  if (!res.ok) throw new Error('Failed to fetch overview analytics');
  return res.json();
}

// -------------------------------------------------------------
// 8. AI DRIVEN CLOUD SEGMENT SUGGESTS
// -------------------------------------------------------------
export async function suggestSegment(prompt: string): Promise<AISuggestion> {
  if (isDemoMode()) {
    initLocalDemoStorage();
    const customersList: Customer[] = JSON.parse(localStorage.getItem('xeno_demo_customers') || '[]');
    const p = prompt.toLowerCase();

    let matchedCustomers = [...customersList];
    let exp = 'Default segment filters applied';
    let rls = ['All customers rostered'];

    if (p.includes('spent over 5') || p.includes('5000') || p.includes('spent > 5')) {
      matchedCustomers = customersList.filter(c => c.totalSpent > 5000);
      exp = 'Matched shoppers spending > ₹5,000';
      rls = ['totalSpent > 5000'];
    } else if (p.includes('high value') || p.includes('vip') || p.includes('loyal')) {
      matchedCustomers = customersList.filter(c => c.totalSpent > 8000);
      exp = 'Matched high loyalty segments';
      rls = ['totalSpent > 8000'];
    }

    return {
      explanation: exp,
      rules: rls,
      count: matchedCustomers.length,
      customers: matchedCustomers
    };
  }

  const uid = getUid();
  if (uid) {
    try {
      // We read latest cloud customers
      const custSnap = await getDocs(collection(db, 'users', uid, 'customers'));
      const customers: Customer[] = [];
      custSnap.forEach(d => customers.push(d.data() as Customer));

      // Proxy payload back-end to allow AI module access
      const res = await fetch(`${API_BASE}/segment/suggest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, customers }) // pass active list
      });
      if (!res.ok) throw new Error();
      
      return res.json();
    } catch (e) {
      // Direct in-memory heuristics fallback mapping for instant responsive sandbox
      const p = prompt.toLowerCase();
      const custSnap = await getDocs(collection(db, 'users', uid, 'customers'));
      const customersList: Customer[] = [];
      custSnap.forEach(d => customersList.push(d.data() as Customer));

      let matchedCustomers = [...customersList];
      let exp = 'Default segment filters applied';
      let rls = ['All customers rostered'];

      if (p.includes('spent over 5') || p.includes('5000') || p.includes('spent > 5')) {
        matchedCustomers = customersList.filter(c => c.totalSpent > 5000);
        exp = 'Matched shoppers spending > ₹5,000';
        rls = ['totalSpent > 5000'];
      } else if (p.includes('high value') || p.includes('vip') || p.includes('loyal')) {
        matchedCustomers = customersList.filter(c => c.totalSpent > 8000);
        exp = 'Matched high loyalty segments';
        rls = ['totalSpent > 8000'];
      }

      return {
        explanation: exp,
        rules: rls,
        count: matchedCustomers.length,
        customers: matchedCustomers
      };
    }
  }

  const res = await fetch(`${API_BASE}/segment/suggest`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt })
  });
  if (!res.ok) throw new Error('Failed to query AI segmentation engine');
  return res.json();
}

// -------------------------------------------------------------
// 9. AI GENERATIVE DRAFT MESSAGE TEXTS
// -------------------------------------------------------------
export async function generateAICopy(goal: string, audienceExplanation = ''): Promise<AIMessages> {
  const res = await fetch(`${API_BASE}/campaigns/generate-copy`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ goal, audienceExplanation })
  });
  if (!res.ok) throw new Error('Failed to generate AI personalization copy');
  return res.json();
}

// -------------------------------------------------------------
// 10. REAL-TIME DATA INGEST FOR DIRECT UPRUSH
// -------------------------------------------------------------
export async function ingestCustomerData(payload: { customers?: any[]; orders?: any[] }): Promise<any> {
  if (isDemoMode()) {
    initLocalDemoStorage();
    let customersAdded = 0;
    let ordersAdded = 0;
    
    const localCustomers: Customer[] = JSON.parse(localStorage.getItem('xeno_demo_customers') || '[]');
    const localOrders: Order[] = JSON.parse(localStorage.getItem('xeno_demo_orders') || '[]');

    if (payload.customers) {
      payload.customers.forEach((c) => {
        if (!c.name || !c.email) return;
        const cId = c.id || `c_ing_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
        localCustomers.push({
          id: cId,
          name: c.name,
          email: c.email,
          phone: c.phone || '+910000000000',
          memberSince: c.memberSince || new Date().toISOString().split('T')[0],
          totalSpent: c.totalSpent || 0,
          orderCount: c.orderCount || 0,
          lastOrderDate: c.lastOrderDate || new Date().toISOString().split('T')[0],
          tags: c.tags || ['new']
        });
        customersAdded++;
      });
      localStorage.setItem('xeno_demo_customers', JSON.stringify(localCustomers));
    }

    if (payload.orders) {
      payload.orders.forEach((o) => {
        if (!o.customerId || !o.amount) return;
        const oId = o.orderId || `ord_ing_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
        localOrders.push({
          orderId: oId,
          customerId: o.customerId,
          amount: Number(o.amount),
          items: o.items || ['Ingested Premium Beans Selection'],
          timestamp: o.timestamp || new Date().toISOString().split('T')[0]
        });
        ordersAdded++;
      });
      localStorage.setItem('xeno_demo_orders', JSON.stringify(localOrders));
    }

    return {
      success: true,
      message: `Local ingestion completed. Linked ${customersAdded} customers and ${ordersAdded} orders safely.`,
      stats: {
        addedCustomers: customersAdded,
        addedOrders: ordersAdded
      }
    };
  }

  const uid = getUid();
  if (uid) {
    try {
      const batch = writeBatch(db);
      let customersAdded = 0;
      let ordersAdded = 0;

      if (payload.customers) {
        payload.customers.forEach((c) => {
          if (!c.name || !c.email) return;
          const cId = c.id || `c_ing_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
          const cRef = doc(db, 'users', uid, 'customers', cId);
          batch.set(cRef, {
            id: cId,
            name: c.name,
            email: c.email,
            phone: c.phone || '+910000000000',
            memberSince: c.memberSince || new Date().toISOString().split('T')[0],
            totalSpent: c.totalSpent || 0,
            orderCount: c.orderCount || 0,
            lastOrderDate: c.lastOrderDate || new Date().toISOString().split('T')[0],
            tags: c.tags || ['new']
          });
          customersAdded++;
        });
      }

      if (payload.orders) {
        payload.orders.forEach((o) => {
          if (!o.customerId || !o.amount) return;
          const oId = o.orderId || `ord_ing_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
          const oRef = doc(db, 'users', uid, 'orders', oId);
          batch.set(oRef, {
            orderId: oId,
            customerId: o.customerId,
            amount: Number(o.amount),
            items: o.items || ['Ingested Premium Beans Selection'],
            timestamp: o.timestamp || new Date().toISOString().split('T')[0]
          });
          ordersAdded++;
        });
      }

      await batch.commit();
      return {
        success: true,
        message: `Cloud ingestion completed. Linked ${customersAdded} customers and ${ordersAdded} orders safely.`,
        stats: {
          addedCustomers: customersAdded,
          addedOrders: ordersAdded
        }
      };
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `users/${uid}`);
    }
  }

  const res = await fetch(`${API_BASE}/ingest`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!res.ok) throw new Error('Failed to ingest custom customer data');
  return res.json();
}

// -------------------------------------------------------------
// 11. HARD CLOUD RE-SEED RESET FOR AUTHENTICATED SANDBOX
// -------------------------------------------------------------
export async function resetDemoDb(): Promise<any> {
  if (isDemoMode()) {
    localStorage.removeItem('xeno_demo_customers');
    localStorage.removeItem('xeno_demo_campaigns');
    localStorage.removeItem('xeno_demo_orders');
    localStorage.removeItem('xeno_demo_events');
    initLocalDemoStorage();
    return { success: true, message: 'Local Demo Database index has been beautifully re-seeded!' };
  }

  const uid = getUid();
  if (uid) {
    try {
      // Seeding triggers automatically via auth state observer if customers is empty.
      // So to reset, we delete existing collections and let FirebaseProvider trigger new seed or perform a force set.
      const batch = writeBatch(db);
      
      const [custSnap, campSnap, eventSnap, ordSnap] = await Promise.all([
        getDocs(collection(db, 'users', uid, 'customers')),
        getDocs(collection(db, 'users', uid, 'campaigns')),
        getDocs(collection(db, 'users', uid, 'events')),
        getDocs(collection(db, 'users', uid, 'orders'))
      ]);

      custSnap.forEach(d => batch.delete(d.ref));
      campSnap.forEach(d => batch.delete(d.ref));
      eventSnap.forEach(d => batch.delete(d.ref));
      ordSnap.forEach(d => batch.delete(d.ref));

      await batch.commit();
      
      // Explicitly auto-inject to rebuild instantly instead of waiting for observer
      const seedBatch = writeBatch(db);
      SEED_CUSTOMERS.forEach(c => seedBatch.set(doc(db, 'users', uid, 'customers', c.id), c));
      SEED_CAMPAIGNS.forEach(cmp => seedBatch.set(doc(db, 'users', uid, 'campaigns', cmp.campaignId), cmp));
      await seedBatch.commit();

      return { success: true, message: 'Cloud Firestore database reset successfully!' };
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `users/${uid}`);
    }
  }

  const res = await fetch(`${API_BASE}/reset-demo`, { method: 'POST' });
  if (!res.ok) throw new Error('Failed to reset demo database');
  return res.json();
}

// -------------------------------------------------------------
// 12. GET RECENT ACTIVITY TIMELINE FEED
// -------------------------------------------------------------
export async function fetchRecentActivity(): Promise<RecentActivityItem[]> {
  if (isDemoMode()) {
    initLocalDemoStorage();
    const events: CommunicationEvent[] = JSON.parse(localStorage.getItem('xeno_demo_events') || '[]');
    const campaigns: Campaign[] = JSON.parse(localStorage.getItem('xeno_demo_campaigns') || '[]');
    const customers: Customer[] = JSON.parse(localStorage.getItem('xeno_demo_customers') || '[]');
    const orders: Order[] = JSON.parse(localStorage.getItem('xeno_demo_orders') || '[]');

    const activityList: RecentActivityItem[] = [];

    events.forEach((evt) => {
      const camp = campaigns.find(c => c.campaignId === evt.campaignId);
      const cust = customers.find(c => c.id === evt.customerId);
      
      let detail = `Dispatched successfully`;
      if (evt.status === 'delivered') detail = 'Delivered to handset successfully';
      if (evt.status === 'opened') detail = 'Opened and read communication payload';
      if (evt.status === 'clicked') detail = 'Clicked campaign CTA button links';
      if (evt.status === 'failed') detail = 'Delivery failed. Invalid destination pathway';

      activityList.push({
        id: evt.eventId,
        type: evt.status === 'sent' ? 'trigger' : evt.status === 'failed' ? 'failed' : 'interaction',
        campaignId: evt.campaignId,
        campaignName: camp ? camp.name : 'System Notification',
        customerId: evt.customerId,
        customerName: cust ? cust.name : 'Shopper Profile',
        channel: camp ? camp.channel : 'email',
        detail,
        status: evt.status,
        timestamp: evt.timestamp
      });
    });

    orders.forEach((or) => {
      const cust = customers.find(c => c.id === or.customerId);
      const hasCampaign = or.orderId.includes('conv');
      
      activityList.push({
        id: or.orderId,
        type: 'conversion',
        customerId: or.customerId,
        customerName: cust ? cust.name : 'Loyal Client',
        detail: `🛒 Customer purchased value ₹${or.amount.toLocaleString()}${hasCampaign ? ' (Attributed to coupon)' : ''}`,
        channel: hasCampaign ? 'conversion' : undefined,
        timestamp: or.timestamp.includes('T') ? or.timestamp : `${or.timestamp}T12:00:00.000Z`
      });
    });

    activityList.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    return activityList.slice(0, 30);
  }

  const uid = getUid();
  if (uid) {
    try {
      const [eventsSnap, campaignsSnap, customersSnap, ordersSnap] = await Promise.all([
        getDocs(collection(db, 'users', uid, 'events')),
        getDocs(collection(db, 'users', uid, 'campaigns')),
        getDocs(collection(db, 'users', uid, 'customers')),
        getDocs(collection(db, 'users', uid, 'orders'))
      ]);

      const events: CommunicationEvent[] = [];
      eventsSnap.forEach((d) => events.push(d.data() as CommunicationEvent));

      const campaigns: Campaign[] = [];
      campaignsSnap.forEach((d) => campaigns.push(d.data() as Campaign));

      const customers: Customer[] = [];
      customersSnap.forEach((d) => customers.push(d.data() as Customer));

      const orders: Order[] = [];
      ordersSnap.forEach((d) => orders.push(d.data() as Order));

      const activityList: RecentActivityItem[] = [];

      // Mapping Events
      events.forEach((evt) => {
        const camp = campaigns.find(c => c.campaignId === evt.campaignId);
        const cust = customers.find(c => c.id === evt.customerId);
        
        let detail = `Dispatched successfully`;
        if (evt.status === 'delivered') detail = 'Delivered to handset successfully';
        if (evt.status === 'opened') detail = 'Opened and read communication payload';
        if (evt.status === 'clicked') detail = 'Clicked campaign CTA button links';
        if (evt.status === 'failed') detail = 'Delivery failed. Invalid destination pathway';

        activityList.push({
          id: evt.eventId,
          type: evt.status === 'sent' ? 'trigger' : evt.status === 'failed' ? 'failed' : 'interaction',
          campaignId: evt.campaignId,
          campaignName: camp ? camp.name : 'System Notification',
          customerId: evt.customerId,
          customerName: cust ? cust.name : 'Shopper Profile',
          channel: camp ? camp.channel : 'email',
          detail,
          status: evt.status,
          timestamp: evt.timestamp
        });
      });

      // Mapping Orders
      orders.forEach((or) => {
        const cust = customers.find(c => c.id === or.customerId);
        const hasCampaign = or.orderId.includes('conv');
        
        activityList.push({
          id: or.orderId,
          type: 'conversion',
          customerId: or.customerId,
          customerName: cust ? cust.name : 'Loyal Client',
          detail: `🛒 Customer purchased value ₹${or.amount.toLocaleString()}${hasCampaign ? ' (Attributed to coupon)' : ''}`,
          channel: hasCampaign ? 'conversion' : undefined,
          timestamp: or.timestamp.includes('T') ? or.timestamp : `${or.timestamp}T12:00:00.000Z`
        });
      });

      activityList.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      return activityList.slice(0, 30);
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, `users/${uid}/timeline`);
    }
  }

  const res = await fetch(`${API_BASE}/analytics/activity`);
  if (!res.ok) throw new Error('Failed to fetch recent activity feed');
  return res.json();
}

// -------------------------------------------------------------
// 13. FETCH AI INSIGHTS
// -------------------------------------------------------------
export async function fetchAIInsights(customers?: Customer[], campaigns?: Campaign[]): Promise<AIInsightItem[]> {
  try {
    const res = await fetch(`${API_BASE}/analytics/insights`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ customers, campaigns })
    });
    if (!res.ok) throw new Error('Failed to fetch AI insights from engine');
    return res.json();
  } catch (err) {
    console.warn('AI Insights retrieval failed, reverting to heuristic payload', err);
    // Dynamic absolute client-side fallback
    return [
      {
        id: 'ins_churn',
        category: 'churn',
        title: 'At-Risk Customer Outreach Opportunity',
        description: 'Several customers who spent over ₹4000 are slipping. Direct targeting with coupons or special offers via WhatsApp can prevent churn.',
        impact: '3 VIP Customers At-Risk',
        trend: 'down',
        actionLabel: 'Launch Win-Back'
      },
      {
        id: 'ins_rev',
        category: 'revenue',
        title: 'Untapped Potential in High-Spent Segment',
        description: 'VIP Customers account for the majority of store value. Creating an exclusive, high-value single origin coffee drop can boost revenue.',
        impact: '+₹15,000 potential upsell',
        trend: 'up',
        actionLabel: 'Promote Specialty Beans'
      },
      {
        id: 'ins_channel',
        category: 'channel',
        title: 'WhatsApp Remains Highest CTR Channel',
        description: 'Averaging 15.2% click-through-rates, WhatsApp continues to outperform traditional SMS and Email loops for prompt checkouts.',
        impact: 'WhatsApp (15.2% CTR)',
        trend: 'up',
        actionLabel: 'View Channel Analytics'
      },
      {
        id: 'ins_open',
        category: 'open_rate',
        title: 'Open Rates Stabilizing Across SMS Pathways',
        description: 'Interactive RCS messages and standard SMS open rates have stabilized at high margins, maintaining 85%+ deliverability results.',
        impact: '85.2% Avg Open Rate',
        trend: 'neutral',
        actionLabel: 'Optimize Text Strings'
      },
      {
        id: 'ins_conv',
        category: 'conversion',
        title: 'Attributed Conversion Trajectory Strong',
        description: 'The roastery has secured excellent redemption performance, validating that personal discount coupon identifiers stimulate checkout loops.',
        impact: '+₹11,350 Campaign Revenue',
        trend: 'up',
        actionLabel: 'Analyze Sales Funnels'
      }
    ];
  }
}

// -------------------------------------------------------------
// 14. PREDICT CAMPAIGN METRICS
// -------------------------------------------------------------
export async function predictCampaign(params: {
  matchedCount: number;
  channel: string;
  message: string;
  audiencePrompt: string;
}): Promise<CampaignPrediction> {
  try {
    const res = await fetch(`${API_BASE}/campaigns/predict`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params)
    });
    if (!res.ok) throw new Error('Failed to generate predictive metrics');
    return res.json();
  } catch (err) {
    console.warn('Prediction engine failed, calculating client heuristic predictions', err);
    // Symmetrical client-side backup predictions
    const count = params.matchedCount || 5;
    const c = (params.channel || 'whatsapp').toLowerCase();
    
    const deliveryRate = c === 'email' ? 0.94 : 0.98;
    const predictedReach = Math.round(count * deliveryRate);

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
    return {
      predictedReach,
      openRate,
      conversionRate,
      predictedRevenue,
      explanation: `Calculated prediction. ${c === 'whatsapp' ? 'WhatsApp delivers incredible instant open indices.' : 'Email is ideal for rich newsletters but generates standard conversion rate bounds.'}`
    };
  }
}
