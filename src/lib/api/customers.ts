import { 
  Customer, 
  Order, 
  Customer360Data,
  calculateCustomerHealth,
  CustomerAIProfile
} from '../../types/index.js';
import { db, handleFirestoreError, OperationType } from '../firebase.js';
import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  setDoc,
  writeBatch,
  deleteDoc,
  query,
  where
} from 'firebase/firestore';
import { isDemoMode, getUid } from './auth.js';
import { initLocalDemoStorage } from './demo.js';

const API_BASE = '/api';

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
        list.push({
          ...(docSnap.data() as Customer),
          id: docSnap.id
        });
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
      const q = query(ordersRef, where('customerId', '==', id));
      const ordersSnap = await getDocs(q);
      const customerOrders: Order[] = [];
      ordersSnap.forEach((oSnap) => {
        customerOrders.push(oSnap.data() as Order);
      });
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
// 2b. GET CUSTOMER 360 DETAILED INSIGHTS (Firestore & Gemini)
// -------------------------------------------------------------
export async function fetchCustomer360(id: string): Promise<Customer360Data> {
  const res = await fetch(`${API_BASE}/customers/${id}/customer360`);
  if (!res.ok) throw new Error('Failed to fetch Customer 360 compilation.');
  return res.json();
}

// -------------------------------------------------------------
// CUSTOMER CRUD ACTIONS
// -------------------------------------------------------------
export async function createCustomer(customerData: Partial<Customer>): Promise<Customer> {
  const cId = customerData.id || `c_${Date.now()}`;
  const newCustomer: Customer = {
    id: cId,
    name: customerData.name || 'Unnamed Customer',
    email: customerData.email || '',
    phone: customerData.phone || '',
    memberSince: customerData.memberSince || new Date().toISOString().split('T')[0],
    totalSpent: Number(customerData.totalSpent || 0),
    orderCount: Number(customerData.orderCount || 0),
    lastOrderDate: customerData.lastOrderDate || new Date().toISOString().split('T')[0],
    tags: customerData.tags || ['new'],
  };

  if (isDemoMode()) {
    initLocalDemoStorage();
    const localCustomers: Customer[] = JSON.parse(localStorage.getItem('xeno_demo_customers') || '[]');
    localCustomers.push(newCustomer);
    localStorage.setItem('xeno_demo_customers', JSON.stringify(localCustomers));
    return {
      ...newCustomer,
      ...calculateCustomerHealth(newCustomer)
    };
  }

  const uid = getUid();
  if (uid) {
    try {
      const custRef = doc(db, 'users', uid, 'customers', cId);
      await setDoc(custRef, {
        id: newCustomer.id,
        name: newCustomer.name,
        email: newCustomer.email,
        phone: newCustomer.phone,
        memberSince: newCustomer.memberSince,
        totalSpent: newCustomer.totalSpent,
        orderCount: newCustomer.orderCount,
        lastOrderDate: newCustomer.lastOrderDate,
        tags: newCustomer.tags
      });
      return {
        ...newCustomer,
        ...calculateCustomerHealth(newCustomer)
      };
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `users/${uid}/customers/${cId}`);
    }
  }

  // Server Fallback
  const res = await fetch(`${API_BASE}/customers`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(newCustomer)
  });
  if (!res.ok) throw new Error('Failed to create customer');
  const saved: Customer = await res.json();
  return {
    ...saved,
    ...calculateCustomerHealth(saved)
  };
}

export async function updateCustomer(id: string, customerData: Partial<Customer>): Promise<Customer> {
  if (isDemoMode()) {
    initLocalDemoStorage();
    const localCustomers: Customer[] = JSON.parse(localStorage.getItem('xeno_demo_customers') || '[]');
    const targetIdx = localCustomers.findIndex(c => c.id === id);
    if (targetIdx === -1) throw new Error('Customer not found');
    const existing = localCustomers[targetIdx];
    const updated: Customer = {
      ...existing,
      name: customerData.name !== undefined ? customerData.name : existing.name,
      email: customerData.email !== undefined ? customerData.email : existing.email,
      phone: customerData.phone !== undefined ? customerData.phone : existing.phone,
      memberSince: customerData.memberSince !== undefined ? customerData.memberSince : existing.memberSince,
      totalSpent: customerData.totalSpent !== undefined ? Number(customerData.totalSpent) : existing.totalSpent,
      orderCount: customerData.orderCount !== undefined ? Number(customerData.orderCount) : existing.orderCount,
      lastOrderDate: customerData.lastOrderDate !== undefined ? customerData.lastOrderDate : existing.lastOrderDate,
      tags: customerData.tags !== undefined ? customerData.tags : existing.tags,
    };
    localCustomers[targetIdx] = updated;
    localStorage.setItem('xeno_demo_customers', JSON.stringify(localCustomers));
    return {
      ...updated,
      ...calculateCustomerHealth(updated)
    };
  }

  const uid = getUid();
  if (uid) {
    try {
      const custDocRef = doc(db, 'users', uid, 'customers', id);
      const custSnap = await getDoc(custDocRef);
      if (!custSnap.exists()) throw new Error('Customer does not exist');
      const existing = custSnap.data() as Customer;

      const updatedRaw: Customer = {
        ...existing,
        name: customerData.name !== undefined ? customerData.name : existing.name,
        email: customerData.email !== undefined ? customerData.email : existing.email,
        phone: customerData.phone !== undefined ? customerData.phone : existing.phone,
        memberSince: customerData.memberSince !== undefined ? customerData.memberSince : existing.memberSince,
        totalSpent: customerData.totalSpent !== undefined ? Number(customerData.totalSpent) : existing.totalSpent,
        orderCount: customerData.orderCount !== undefined ? Number(customerData.orderCount) : existing.orderCount,
        lastOrderDate: customerData.lastOrderDate !== undefined ? customerData.lastOrderDate : existing.lastOrderDate,
        tags: customerData.tags !== undefined ? customerData.tags : existing.tags,
      };

      await setDoc(custDocRef, {
        id: updatedRaw.id,
        name: updatedRaw.name,
        email: updatedRaw.email,
        phone: updatedRaw.phone,
        memberSince: updatedRaw.memberSince,
        totalSpent: updatedRaw.totalSpent,
        orderCount: updatedRaw.orderCount,
        lastOrderDate: updatedRaw.lastOrderDate,
        tags: updatedRaw.tags
      });

      return {
        ...updatedRaw,
        ...calculateCustomerHealth(updatedRaw)
      };
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${uid}/customers/${id}`);
    }
  }

  // Server Fallback
  const res = await fetch(`${API_BASE}/customers/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(customerData)
  });
  if (!res.ok) throw new Error('Failed to update customer');
  const saved: Customer = await res.json();
  return {
    ...saved,
    ...calculateCustomerHealth(saved)
  };
}

export async function deleteCustomer(id: string): Promise<void> {
  if (isDemoMode()) {
    initLocalDemoStorage();
    const localCustomers: Customer[] = JSON.parse(localStorage.getItem('xeno_demo_customers') || '[]');
    const filtered = localCustomers.filter(c => c.id !== id);
    localStorage.setItem('xeno_demo_customers', JSON.stringify(filtered));
    return;
  }

  const uid = getUid();
  const path = uid ? `users/${uid}/customers/${id}` : null;
  console.log('[TRACE CUSTOMER DELETE] Start:', { uid, id, path });
  
  if (uid) {
    try {
      const custRef = doc(db, 'users', uid, 'customers', id);
      console.log('[TRACE CUSTOMER DELETE] Before deleteDoc()', { path });
      await deleteDoc(custRef);
      console.log('[TRACE CUSTOMER DELETE] After deleteDoc() SUCCESS');
      return;
    } catch (err: any) {
      console.error('[TRACE CUSTOMER DELETE] Caught error:', err);
      console.error('[TRACE CUSTOMER DELETE] Error code:', err?.code);
      console.error('[TRACE CUSTOMER DELETE] Error message:', err?.message);
      handleFirestoreError(err, OperationType.DELETE, `users/${uid}/customers/${id}`);
    }
  }

  // Server Fallback
  const res = await fetch(`${API_BASE}/customers/${id}`, {
    method: 'DELETE'
  });
  if (!res.ok) throw new Error('Failed to delete customer');
}

// -------------------------------------------------------------
// REAL-TIME DATA INGEST FOR DIRECT UPRUSH
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
// CUSTOMER AI PROFILE FUNCTIONS
// -------------------------------------------------------------
export async function fetchCustomerAIProfile(id: string): Promise<CustomerAIProfile> {
  if (isDemoMode()) {
    initLocalDemoStorage();
    const localProfiles: CustomerAIProfile[] = JSON.parse(localStorage.getItem('xeno_demo_customer_ai_profiles') || '[]');
    let profile = localProfiles.find(p => p.customerId === id);
    if (!profile) {
      profile = generateMockAIProfile(id);
      localProfiles.push(profile);
      localStorage.setItem('xeno_demo_customer_ai_profiles', JSON.stringify(localProfiles));
    }
    return profile;
  }

  const uid = getUid();
  if (uid) {
    try {
      const profileDocRef = doc(db, 'users', uid, 'customer_ai_profiles', id);
      const snap = await getDoc(profileDocRef);
      if (snap.exists()) {
        return snap.data() as CustomerAIProfile;
      }
    } catch (err) {
      console.warn('Failed to fetch AI Profile from firestore directly, placing server fallback', err);
    }
  }

  // Server Fallback
  const res = await fetch(`${API_BASE}/customers/${id}/ai-profile`);
  if (!res.ok) throw new Error('Failed to fetch customer AI profile');
  return res.json();
}

export async function generateCustomerAIProfile(id: string): Promise<CustomerAIProfile> {
  if (isDemoMode()) {
    initLocalDemoStorage();
    const localProfiles: CustomerAIProfile[] = JSON.parse(localStorage.getItem('xeno_demo_customer_ai_profiles') || '[]');
    const idx = localProfiles.findIndex(p => p.customerId === id);
    
    const profile = generateMockAIProfile(id);
    if (idx !== -1) {
      localProfiles[idx] = profile;
    } else {
      localProfiles.push(profile);
    }
    localStorage.setItem('xeno_demo_customer_ai_profiles', JSON.stringify(localProfiles));
    return profile;
  }

  const uid = getUid();
  let serverProfile: CustomerAIProfile;
  
  const res = await fetch(`${API_BASE}/customers/${id}/generate-ai-profile`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  });
  if (!res.ok) throw new Error('Failed to generate customer AI profile on server');
  serverProfile = await res.json();

  if (uid && serverProfile) {
    try {
      const profileDocRef = doc(db, 'users', uid, 'customer_ai_profiles', id);
      await setDoc(profileDocRef, serverProfile);
    } catch (err) {
      console.error('Failed to sync generated AI profile to Cloud Firestore:', err);
    }
  }

  return serverProfile;
}

// Private helper to create stunning, realistic customer AI Brain data
function generateMockAIProfile(customerId: string): CustomerAIProfile {
  const localCustomers: Customer[] = JSON.parse(localStorage.getItem('xeno_demo_customers') || '[]');
  const customer = localCustomers.find(c => c.id === customerId);
  const name = customer ? customer.name : 'Customer';
  const spent = customer ? customer.totalSpent : 5000;
  const count = customer ? customer.orderCount : 3;

  const recency = customer ? calculateCustomerHealth(customer) : { healthScore: 78, engagementScore: 82, churnRisk: 'Low' as const };
  const rfm = customer ? `R4-F${Math.min(5, count)}-M${spent > 15000 ? 5 : spent > 8000 ? 4 : 3}` : 'R4-F3-M3';

  const channels = ['whatsapp', 'email', 'sms', 'rcs'];
  const preferredChannel = channels[Math.floor(Math.random() * channels.length)];

  let recommendedActions = [
    `Trigger loyalty reward points drop for next purchase replenishment`,
    `Send direct WhatsApp invite for new winter single-origins roast launch`,
    `Offer flat trial discount coupon for Mochi Specialty steel brewing dripper`
  ];
  let sentiment = 'Positive';
  let churnRisk: 'LOW' | 'MEDIUM' | 'HIGH' = 'LOW';
  let aiSummary = `${name} is a highly engaged customer of Mochi CRM, exhibiting strong affinity for artisanal whole beans. Recommended high-frequency engagement via their preferred ${preferredChannel} channel.`;

  if (recency.churnRisk === 'High') {
    churnRisk = 'HIGH';
    sentiment = 'Slightly Dissatisfied';
    recommendedActions = [
      `Dispatch high-priority winback coupon of 25% within 48 hours`,
      `Deliver satisfaction survey post transaction checkout failures`,
      `Recommend Monsoon Malabar roast subscription setup for streamlined refills`
    ];
    aiSummary = `Active churn hazard detected for ${name}. Purchase gaps exceed standard replenishment models by 45+ days. Immediate high-incentive outreach recommended.`;
  } else if (recency.churnRisk === 'Medium') {
    churnRisk = 'MEDIUM';
    sentiment = 'Neutral';
    recommendedActions = [
      `Introduce to Subscribe & Save 10% options for daily standard roasts`,
      `Offer trial filters bag alongside next checkout order`,
      `Send personalized recipe guide for Cold Brew kits`
    ];
    aiSummary = `${name} shows minor engagement erosion. Strategic subscription offers should prevent lapse into complete dormancy.`;
  }

  return {
    customerId,
    healthScore: recency.healthScore,
    rfmScore: rfm,
    churnRisk,
    engagementScore: recency.engagementScore,
    sentiment,
    preferredChannel,
    lifetimeValue: spent,
    predictedRevenue: Math.round(spent * (churnRisk === 'HIGH' ? 0.05 : churnRisk === 'MEDIUM' ? 0.25 : 0.45)),
    nextPurchasePrediction: churnRisk === 'HIGH' ? 'Unlikely within 30 days' : 'Expected in 10-14 days (Espresso drip purchase)',
    aiSummary,
    recommendedActions
  };
}

