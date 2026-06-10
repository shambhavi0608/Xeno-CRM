import fs from 'fs';
import path from 'path';
import { Customer, Order, Campaign, CommunicationEvent, AnalyticsOverview } from '../types/index.js';

const DB_FILE = path.join(process.cwd(), 'crm_db.json');

interface DatabaseSchema {
  customers: Customer[];
  orders: Order[];
  campaigns: Campaign[];
  events: CommunicationEvent[];
}

let db: DatabaseSchema = {
  customers: [],
  orders: [],
  campaigns: [],
  events: []
};

// Generates some initial D2C retail brand data
function generateSeedData(): DatabaseSchema {
  const seedCustomers: Customer[] = [
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

  const seedOrders: Order[] = [];
  const startYear = 2025;

  // Let's create some orders mapped to these customers
  seedCustomers.forEach(customer => {
    let orderTotalAccumulated = 0;
    for (let i = 0; i < customer.orderCount; i++) {
      // spread order timestamps from memberSince to lastOrderDate
      const daysOffset = Math.floor(Math.random() * 30) + 1;
      const orderAmount = i === customer.orderCount - 1
        ? Math.max(100, customer.totalSpent - orderTotalAccumulated)
        : Math.max(100, Math.floor(customer.totalSpent / customer.orderCount) + (Math.floor(Math.random() * 400) - 200));

      orderTotalAccumulated += orderAmount;

      const orderDate = new Date(customer.lastOrderDate);
      orderDate.setDate(orderDate.getDate() - (customer.orderCount - 1 - i) * 15);

      seedOrders.push({
        orderId: `ord_${customer.id}_${i}`,
        customerId: customer.id,
        amount: orderAmount,
        items: i % 3 === 0 ? ['Espresso beans', 'Mug'] : i % 3 === 1 ? ['Single Origin Coffee Bag', 'Brewing Filter'] : ['Premium Tumbler'],
        timestamp: orderDate.toISOString().split('T')[0]
      });
    }
  });

  // Seed default campaigns
  const seedCampaigns: Campaign[] = [
    {
      campaignId: 'cmp_001',
      name: 'Summer Splash Coffee Launch',
      audiencePrompt: 'High spent customers in last 90 days',
      matchedCount: 5,
      message: 'Hey {name}! ☀️ Beat the heat with our new Cold Brew Single Origin beans. Order now and get a free Tumbler using code COOLBREW. Free delivery included! ☕',
      channel: 'whatsapp',
      status: 'completed',
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
      channel: 'email',
      status: 'completed',
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
      channel: 'rcs',
      status: 'active',
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

  // Seed default communications events for tracking
  const seedEvents: CommunicationEvent[] = [];
  seedCampaigns.forEach((campaign) => {
    // Generate events for each campaign's delivery metrics
    let custHandled = 0;
    seedCustomers.forEach((cust) => {
      if (custHandled >= campaign.sent_count) return;
      
      // We will match users deterministically for seeding
      const eventId = `evt_${campaign.campaignId}_${cust.id}`;
      let status: 'sent' | 'delivered' | 'opened' | 'clicked' | 'failed' = 'sent';
      
      if (campaign.campaignId === 'cmp_001') {
        const statuses: ('delivered' | 'opened' | 'clicked')[] = ['clicked', 'clicked', 'clicked', 'opened', 'delivered'];
        status = statuses[custHandled] || 'delivered';
      } else if (campaign.campaignId === 'cmp_002') {
        const statuses: ('delivered' | 'opened' | 'clicked')[] = ['clicked', 'opened', 'delivered'];
        status = statuses[custHandled] || 'delivered';
      } else if (campaign.campaignId === 'cmp_003') {
        const statuses: ('delivered' | 'opened' | 'clicked' | 'failed')[] = ['clicked', 'clicked', 'opened', 'opened', 'opened', 'delivered', 'delivered', 'failed'];
        status = statuses[custHandled] || 'delivered';
      }

      seedEvents.push({
        eventId,
        campaignId: campaign.campaignId,
        customerId: cust.id,
        status,
        timestamp: campaign.createdAt
      });
      
      custHandled++;
    });
  });

  return {
    customers: seedCustomers,
    orders: seedOrders,
    campaigns: seedCampaigns,
    events: seedEvents
  };
}

export function loadDatabase(): DatabaseSchema {
  try {
    if (fs.existsSync(DB_FILE)) {
      const raw = fs.readFileSync(DB_FILE, 'utf8');
      db = JSON.parse(raw);
      // fallback check
      if (!db.customers || db.customers.length === 0) {
        db = generateSeedData();
        saveDatabase();
      }
    } else {
      db = generateSeedData();
      saveDatabase();
    }
  } catch (error) {
    console.error('Error loading database, seeding fallback...', error);
    db = generateSeedData();
    saveDatabase();
  }
  return db;
}

export function saveDatabase(): void {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf8');
  } catch (e) {
    console.error('Error saving database', e);
  }
}

export function getCustomers() {
  loadDatabase();
  return db.customers;
}

export function getOrders() {
  loadDatabase();
  return db.orders;
}

export function getCampaigns() {
  loadDatabase();
  return db.campaigns;
}

export function getEvents() {
  loadDatabase();
  return db.events;
}

export function writeCustomers(customers: Customer[]) {
  db.customers = customers;
  saveDatabase();
}

export function writeOrders(orders: Order[]) {
  db.orders = orders;
  saveDatabase();
}

export function writeCampaigns(campaigns: Campaign[]) {
  db.campaigns = campaigns;
  saveDatabase();
}

export function writeEvents(events: CommunicationEvent[]) {
  db.events = events;
  saveDatabase();
}
