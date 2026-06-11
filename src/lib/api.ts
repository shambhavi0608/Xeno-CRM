import { 
  Customer, 
  Order, 
  Campaign, 
  CommunicationEvent, 
  AnalyticsOverview, 
  AISuggestion, 
  AIMessages,
  RecentActivityItem
} from '../types/index.js';
import { db, auth, handleFirestoreError, OperationType } from './firebase.js';
import { SEED_CUSTOMERS, SEED_CAMPAIGNS } from '../components/FirebaseProvider.js';
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

// Helper to determine if we have an active, authenticated Firestore user
function getUid(): string | null {
  return auth.currentUser ? auth.currentUser.uid : null;
}

// -------------------------------------------------------------
// 1. GET CUSTOMERS
// -------------------------------------------------------------
export async function fetchCustomers(search = '', tag = 'all'): Promise<Customer[]> {
  const uid = getUid();
  if (uid) {
    try {
      const customersRef = collection(db, 'users', uid, 'customers');
      const snap = await getDocs(customersRef);
      const list: Customer[] = [];
      snap.forEach((docSnap) => {
        list.push(docSnap.data() as Customer);
      });

      let filtered = [...list];

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
  return res.json();
}

// -------------------------------------------------------------
// 2. GET SINGLE CUSTOMER DETAILS (AND ORDERS)
// -------------------------------------------------------------
export async function fetchCustomerDetails(id: string): Promise<{ customer: Customer; orders: Order[] }> {
  const uid = getUid();
  if (uid) {
    try {
      const custDocRef = doc(db, 'users', uid, 'customers', id);
      const custSnap = await getDoc(custDocRef);
      if (!custSnap.exists()) {
        throw new Error('Customer template not found in Cloud Database');
      }
      const customer = custSnap.data() as Customer;

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
  return res.json();
}

// -------------------------------------------------------------
// 3. GET CAMPAIGNS
// -------------------------------------------------------------
export async function fetchCampaigns(status = 'all'): Promise<Campaign[]> {
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
