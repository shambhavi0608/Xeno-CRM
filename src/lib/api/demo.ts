import { Customer, Order, Campaign, CommunicationEvent } from '../../types/index.js';
import { db, auth, handleFirestoreError, OperationType } from '../firebase.js';
import { SEED_CUSTOMERS, SEED_CAMPAIGNS, SEED_ORDERS_MAPPING } from '../../components/FirebaseProvider.js';
import { 
  collection, 
  doc, 
  getDocs, 
  setDoc,
  writeBatch
} from 'firebase/firestore';
import { isDemoMode, getUid } from './auth.js';

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
        if (roll < 0.04) {
          triggerLocalDemoCallback(campaignId, cust.id, 'failed');
        } else {
          triggerLocalDemoCallback(campaignId, cust.id, 'delivered');

          // Step C: Opened Engagement
          if (roll >= 0.04 && roll < 0.45) {
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

// -------------------------------------------------------------
// HARD CLOUD RE-SEED RESET FOR AUTHENTICATED SANDBOX
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

  const API_BASE = '/api';
  const res = await fetch(`${API_BASE}/reset-demo`, { method: 'POST' });
  if (!res.ok) throw new Error('Failed to reset demo database');
  return res.json();
}
