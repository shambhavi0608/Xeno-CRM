import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  User as FirebaseUser,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  signInAnonymously
} from 'firebase/auth';
import { 
  collection, 
  doc, 
  getDocs, 
  writeBatch, 
  setDoc,
  serverTimestamp
} from 'firebase/firestore';
import { auth, db, testConnectionAfterAuth } from '../lib/firebase.js';

interface AuthContextType {
  user: any;
  loading: boolean;
  login: (email: string, pass: string) => Promise<any>;
  register: (email: string, pass: string, name: string) => Promise<any>;
  loginAnonymously: () => Promise<any>;
  loginAsDemo: () => void;
  logout: () => Promise<void>;
  isSeeding: boolean;
  isDemo: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used inside a FirebaseProvider');
  }
  return context;
}

// Initial roastery CRM seed helper so that every user starts with rich retention analytics!
export const SEED_CUSTOMERS = [
  { id: 'c1', name: 'Aarav Mehta', email: 'aarav.mehta@gmail.com', phone: '+919876543210', memberSince: '2025-01-15', totalSpent: 12500, orderCount: 6, lastOrderDate: '2026-06-08', tags: ['high-value', 'regular'] },
  { id: 'c2', name: 'Sofia Rodriguez', email: 'sofia.r@yahoo.com', phone: '+14155552671', memberSince: '2025-08-22', totalSpent: 8900, orderCount: 4, lastOrderDate: '2026-06-05', tags: ['high-value', 'regular'] },
  { id: 'c3', name: 'Kabir Singh', email: 'singh.kabir@outlook.com', phone: '+919911223344', memberSince: '2025-03-30', totalSpent: 4500, orderCount: 3, lastOrderDate: '2026-05-20', tags: ['regular'] },
  { id: 'c4', name: 'Ananya Iyer', email: 'ananya.iyer@gmail.com', phone: '+919812345678', memberSince: '2026-05-10', totalSpent: 1500, orderCount: 1, lastOrderDate: '2026-06-09', tags: ['new'] },
  { id: 'c5', name: 'Dev Bajpai', email: 'dev.bajpai@tech.co', phone: '+918887776665', memberSince: '2024-11-05', totalSpent: 28400, orderCount: 12, lastOrderDate: '2026-06-10', tags: ['high-value', 'regular'] },
  { id: 'c6', name: 'Zara Malik', email: 'zara.malik@fastfashion.in', phone: '+919000111222', memberSince: '2025-06-18', totalSpent: 3200, orderCount: 2, lastOrderDate: '2026-04-12', tags: ['at-risk'] },
  { id: 'c7', name: 'David Cole', email: 'david.cole@outlook.com', phone: '+12125557890', memberSince: '2025-10-12', totalSpent: 750, orderCount: 1, lastOrderDate: '2025-10-12', tags: ['inactive'] },
  { id: 'c8', name: 'Meera Nair', email: 'meera.nair@live.com', phone: '+919321456789', memberSince: '2025-12-01', totalSpent: 6200, orderCount: 5, lastOrderDate: '2026-05-28', tags: ['regular'] },
  { id: 'c9', name: 'Lucas Dubois', email: 'lucas.dubois@free.fr', phone: '+33612345678', memberSince: '2026-02-14', totalSpent: 11200, orderCount: 4, lastOrderDate: '2026-06-07', tags: ['high-value', 'regular'] },
  { id: 'c10', name: 'Priya Sen', email: 'priya.sen@gmail.com', phone: '+919777666555', memberSince: '2026-01-20', totalSpent: 1300, orderCount: 1, lastOrderDate: '2026-01-20', tags: ['inactive'] },
  { id: 'c11', name: 'Arjun Kapoor', email: 'arjun.kapoor@gmail.com', phone: '+918080909010', memberSince: '2025-04-05', totalSpent: 9800, orderCount: 5, lastOrderDate: '2026-06-01', tags: ['high-value'] },
  { id: 'c12', name: 'Isabella Taylor', email: 'isabella.t@me.com', phone: '+13105553344', memberSince: '2026-04-25', totalSpent: 2400, orderCount: 2, lastOrderDate: '2026-06-03', tags: ['regular'] },
  { id: 'c13', name: 'Rohan Sharma', email: 'rohan.sharma@nfs.in', phone: '+919988776655', memberSince: '2025-09-02', totalSpent: 4100, orderCount: 3, lastOrderDate: '2026-04-01', tags: ['at-risk'] },
  { id: 'c14', name: 'Emma Watson', email: 'emma@watsoninc.com', phone: '+447000100200', memberSince: '2025-02-28', totalSpent: 35000, orderCount: 15, lastOrderDate: '2026-06-08', tags: ['high-value', 'regular'] },
  { id: 'c15', name: 'Vikram Grover', email: 'vikram.g@gmail.com', phone: '+919123456780', memberSince: '2026-05-15', totalSpent: 850, orderCount: 1, lastOrderDate: '2026-05-15', tags: ['new'] }
];

export const SEED_CAMPAIGNS = [
  {
    campaignId: 'cmp_001',
    name: 'Summer Splash Coffee Launch',
    audiencePrompt: 'High spent customers in last 90 days',
    matchedCount: 5,
    message: 'Hey {name}! ☀️ Beat the heat with our new Cold Brew Single Origin beans. Order now and get a free Tumbler using code COOLBREW. Free delivery included! ☕',
    channel: 'whatsapp' as const,
    status: 'completed' as const,
    createdAt: '2026-05-20',
    sent_count: 5,
    delivered_count: 5,
    opened_count: 4,
    clicked_count: 3,
    failed_count: 0,
    orders_attributed: 2,
    revenue_attributed: 9000
  },
  {
    campaignId: 'cmp_002',
    name: 'Win Back Inactive Shoppers',
    audiencePrompt: 'Customers inactive for over 60 days',
    matchedCount: 3,
    message: 'Hello {name}, we miss you! 💔 Here is a special 20% discount on your next order. Use code COMEBACK at checkout. Valid for 7 days only.',
    channel: 'email' as const,
    status: 'completed' as const,
    createdAt: '2026-06-01',
    sent_count: 3,
    delivered_count: 3,
    opened_count: 2,
    clicked_count: 1,
    failed_count: 0,
    orders_attributed: 1,
    revenue_attributed: 3200
  },
  {
    campaignId: 'cmp_003',
    name: 'RCS Flash Promo - Beans',
    audiencePrompt: 'All active users',
    matchedCount: 8,
    message: 'Flash Sale! Get 15% off on all espresso roasted beans today. Click here to check out right now: links.xeno.com/flash-sale',
    channel: 'rcs' as const,
    status: 'active' as const,
    createdAt: '2026-06-09',
    sent_count: 8,
    delivered_count: 7,
    opened_count: 5,
    clicked_count: 2,
    failed_count: 1,
    orders_attributed: 0,
    revenue_attributed: 0
  }
];

export const SEED_ORDERS_MAPPING: Record<string, { count: number; total: number; lastDate: string }> = {
  c1: { count: 6, total: 12500, lastDate: '2026-06-08' },
  c2: { count: 4, total: 8900, lastDate: '2026-06-05' },
  c3: { count: 3, total: 4500, lastDate: '2026-05-20' },
  c4: { count: 1, total: 1500, lastDate: '2026-06-09' },
  c5: { count: 12, total: 28400, lastDate: '2026-06-10' },
  c6: { count: 2, total: 3200, lastDate: '2026-04-12' },
  c7: { count: 1, total: 750, lastDate: '2025-10-12' },
  c8: { count: 5, total: 6200, lastDate: '2026-05-28' },
  c9: { count: 4, total: 11200, lastDate: '2026-06-07' },
  c10: { count: 1, total: 1300, lastDate: '2026-01-20' },
  c11: { count: 5, total: 9800, lastDate: '2026-06-01' },
  c12: { count: 2, total: 2400, lastDate: '2026-06-03' },
  c13: { count: 3, total: 4100, lastDate: '2026-04-01' },
  c14: { count: 15, total: 35000, lastDate: '2026-06-08' },
  c15: { count: 1, total: 850, lastDate: '2026-05-15' },
};

async function seedFirestoreCollections(uid: string) {
  try {
    const batch = writeBatch(db);

    // 1. Seed user profile
    const userRef = doc(db, 'users', uid);
    batch.set(userRef, {
      userId: uid,
      email: auth.currentUser?.email || 'demo-shopper@xeno.com',
      name: auth.currentUser?.displayName || 'CRM Admin',
      createdAt: new Date().toISOString()
    });

    // 2. Customers
    SEED_CUSTOMERS.forEach((c) => {
      const cRef = doc(db, 'users', uid, 'customers', c.id);
      batch.set(cRef, c);
    });

    // 3. Campaigns
    SEED_CAMPAIGNS.forEach((cmp) => {
      const cmpRef = doc(db, 'users', uid, 'campaigns', cmp.campaignId);
      batch.set(cmpRef, cmp);
    });

    // 4. Seeding Orders
    SEED_CUSTOMERS.forEach((customer) => {
      const { count, total, lastDate } = SEED_ORDERS_MAPPING[customer.id] || { count: 1, total: 1000, lastDate: '2026-06-01' };
      let accumulated = 0;
      for (let i = 0; i < count; i++) {
        const amt = i === count - 1 ? Math.max(100, total - accumulated) : Math.floor(total / count);
        accumulated += amt;
        const oId = `ord_${customer.id}_${i}`;
        const ordRef = doc(db, 'users', uid, 'orders', oId);
        batch.set(ordRef, {
          orderId: oId,
          customerId: customer.id,
          amount: amt,
          items: i % 2 === 0 ? ['Single Origin Coffee Bag'] : ['Glass Drip Brewer'],
          timestamp: lastDate
        });
      }
    });

    // 5. Seeding Events
    const eventsToSeed = [
      { eventId: 'evt_cmp_001_c1', campaignId: 'cmp_001', customerId: 'c1', status: 'clicked', timestamp: '2026-05-20' },
      { eventId: 'evt_cmp_001_c2', campaignId: 'cmp_001', customerId: 'c2', status: 'opened', timestamp: '2026-05-21' },
      { eventId: 'evt_cmp_002_c1', campaignId: 'cmp_002', customerId: 'c1', status: 'opened', timestamp: '2026-06-01' }
    ];
    eventsToSeed.forEach((evt) => {
      const evtRef = doc(db, 'users', uid, 'events', evt.eventId);
      batch.set(evtRef, evt);
    });

    await batch.commit();
    console.log('[Firestore] Seeding completed successfully for user:', uid);
  } catch (err) {
    console.error('[Firestore] Seeding failed:', err);
  }
}

export function FirebaseProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [demoUser, setDemoUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isSeeding, setIsSeeding] = useState(false);

  useEffect(() => {
    // 1. Recover/Check localStorage Demo Mode status at session bootstrap
    const isLocalDemoActive = localStorage.getItem('xeno_demo_mode') === 'true';
    if (isLocalDemoActive) {
      setDemoUser({
        uid: 'demo-local-user',
        email: 'demo@xeno.com',
        displayName: 'Demo Roaster Admin',
        emailVerified: true,
        isAnonymous: false
      });
      setLoading(false);
    }

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        // Real authenticated firebase user session detected - bypass any local demo
        setUser(currentUser);
        setDemoUser(null);
        localStorage.removeItem('xeno_demo_mode');
        setLoading(true);
        try {
          // Safe background connectivity probe to users/{uid} to avoid unprotected path rules issues
          await testConnectionAfterAuth(currentUser.uid);

          const customersRef = collection(db, 'users', currentUser.uid, 'customers');
          const snap = await getDocs(customersRef);
          if (snap.empty) {
            setIsSeeding(true);
            await seedFirestoreCollections(currentUser.uid);
            setIsSeeding(false);
          }
        } catch (e) {
          console.error('[FirebaseProvider] Checking seed failed: ', e);
        }
      } else {
        setUser(null);
      }
      // Only set loading to false if we are not still processing local demo
      if (!localStorage.getItem('xeno_demo_mode')) {
        setLoading(false);
      }
    });

    return unsubscribe;
  }, []);

  const login = async (email: string, pass: string) => {
    localStorage.removeItem('xeno_demo_mode');
    setDemoUser(null);
    return signInWithEmailAndPassword(auth, email, pass);
  };

  const register = async (email: string, pass: string, name: string) => {
    localStorage.removeItem('xeno_demo_mode');
    setDemoUser(null);
    const cred = await createUserWithEmailAndPassword(auth, email, pass);
    return cred;
  };

  const loginAnonymously = () => {
    localStorage.removeItem('xeno_demo_mode');
    setDemoUser(null);
    return signInAnonymously(auth);
  };

  const loginAsDemo = () => {
    localStorage.setItem('xeno_demo_mode', 'true');
    setDemoUser({
      uid: 'demo-local-user',
      email: 'demo@xeno.com',
      displayName: 'Demo Roaster Admin',
      emailVerified: true,
      isAnonymous: false
    });
    setUser(null);
  };

  const logout = async () => {
    localStorage.removeItem('xeno_demo_mode');
    setDemoUser(null);
    setUser(null);
    await firebaseSignOut(auth);
  };

  const activeUser = demoUser || user;
  const isDemo = !!demoUser;

  return (
    <AuthContext.Provider
      value={{
        user: activeUser,
        loading,
        login,
        register,
        loginAnonymously,
        loginAsDemo,
        logout,
        isSeeding,
        isDemo
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
