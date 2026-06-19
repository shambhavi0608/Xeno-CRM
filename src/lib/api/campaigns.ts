import { Campaign, Customer, Order } from '../../types/index.js';
import { db, handleFirestoreError, OperationType } from '../firebase.js';
import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  setDoc,
  deleteDoc
} from 'firebase/firestore';
import { isDemoMode, getUid } from './auth.js';
import { initLocalDemoStorage, triggerLocalDemoMetricsSimulation } from './demo.js';

const API_BASE = '/api';

// -------------------------------------------------------------
// GET CAMPAIGNS
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
        list.push({
          ...(d.data() as Campaign),
          campaignId: d.id
        });
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
// GET SINGLE CAMPAIGN
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
// CREATE DRAFT CAMPAIGN
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
    if (status === 'sent') campaign.sent_count = (campaign.sent_count || 0) + 1;
    else if (status === 'failed') campaign.failed_count = (campaign.failed_count || 0) + 1;
    else if (status === 'delivered') campaign.delivered_count = (campaign.delivered_count || 0) + 1;
    else if (status === 'opened') campaign.opened_count = (campaign.opened_count || 0) + 1;
    else if (status === 'clicked') campaign.clicked_count = (campaign.clicked_count || 0) + 1;

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
      customer.orderCount = (customer.orderCount || 0) + 1;
      customer.totalSpent = (customer.totalSpent || 0) + amount;
      customer.lastOrderDate = new Date().toISOString().split('T')[0];
      await setDoc(customerRef, customer);
    }

    // Attribute to Campaign
    const campaignRef = doc(db, 'users', uid, 'campaigns', campaignId);
    const campaignSnap = await getDoc(campaignRef);
    if (campaignSnap.exists()) {
      const campaign = campaignSnap.data() as Campaign;
      campaign.orders_attributed = (campaign.orders_attributed || 0) + 1;
      campaign.revenue_attributed = (campaign.revenue_attributed || 0) + amount;
      await setDoc(campaignRef, campaign);
    }
  } catch (err) {
    console.warn('[Simulator Conversion Order Fail]', err);
  }
}

// -------------------------------------------------------------
// LAUNCH CAMPAIGN
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
          if (roll < 0.04) {
            triggerFirestoreCallback(uid, id, cust.id, 'failed');
          } else {
            triggerFirestoreCallback(uid, id, cust.id, 'delivered');

            // Step C: Opened Engagement
            if (roll >= 0.04 && roll < 0.45) {
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

export async function deleteCampaign(campaignId: string): Promise<void> {
  if (isDemoMode()) {
    initLocalDemoStorage();
    const localCampaigns: Campaign[] = JSON.parse(localStorage.getItem('xeno_demo_campaigns') || '[]');
    const filtered = localCampaigns.filter(c => c.campaignId !== campaignId);
    localStorage.setItem('xeno_demo_campaigns', JSON.stringify(filtered));
    return;
  }

  const uid = getUid();
  const path = uid ? `users/${uid}/campaigns/${campaignId}` : null;
  console.log('[TRACE CAMPAIGN DELETE] Start:', { uid, campaignId, path });

  if (uid) {
    try {
      const campaignRef = doc(db, 'users', uid, 'campaigns', campaignId);
      console.log('[TRACE CAMPAIGN DELETE] Before deleteDoc()', { path });
      await deleteDoc(campaignRef);
      console.log('[TRACE CAMPAIGN DELETE] After deleteDoc() SUCCESS');
      return;
    } catch (err: any) {
      console.error('[TRACE CAMPAIGN DELETE] Caught error:', err);
      console.error('[TRACE CAMPAIGN DELETE] Error code:', err?.code);
      console.error('[TRACE CAMPAIGN DELETE] Error message:', err?.message);
      handleFirestoreError(err, OperationType.DELETE, `users/${uid}/campaigns/${campaignId}`);
    }
  }

  // Server Fallback
  const res = await fetch(`${API_BASE}/campaigns/${campaignId}`, {
    method: 'DELETE'
  });
  if (!res.ok) throw new Error('Failed to delete campaign');
}
