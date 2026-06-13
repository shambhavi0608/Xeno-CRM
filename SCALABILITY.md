# Mochi CRM Production Scalability Blueprint
## Architectural Migration from Live Simulation to Enterprise Infrastructure

This blueprint document outlines the concrete technical migration strategy for transition from Mochi CRM’s simulated sandbox environments to a resilient, high-volume event-driven architecture capable of handling millions of real-time marketing micro-interactions without performance deterioration.

---

## 1. Executive Summary & Production Challenges
In the current developer environment, Mochi CRM operates with:
- Simulated mock event payloads triggered via asynchronous `setTimeout` threads.
- Shared `localStorage` states in fallback browser modes, or single Firestore instances for transaction persistence.
- Monolithic request pathways which, in live scales (>100,000 requests/sec), would suffer from concurrency contention, race conditions resulting in double-message delivery, and database write lock bottlenecks.

### Transition Target Metrics
- **Throughput Capability**: Up to **50,000 campaign dispatches per second**.
- **Delivery Reculation Latency**: `< 50ms` queue turnaround time.
- **Data Integrity**: Strictly enforced **Exactly-Once Delivery semantics**.

---

## 2. Scaled Systems Architecture

```
                    ┌─────────────────────────┐
                    │  React Admin Dashboard  │
                    └────────────┬────────────┘
                                 │ HTTPS (GraphQL/REST)
                    ┌────────────▼────────────┐
                    │  Mochi API Gateway      │
                    │  (Horizontal Scale K8s) │
                    └────┬────────────────┬───┘
                         │                │
            JSON Schema  │  Produce       │ Distributed Lock 
            Validation   │  Campaign      │ Rate Limiter
                         ▼  Job           ▼
    ┌────────────────────────┐      ┌────────────────────────┐
    │     Apache Kafka       │      │      Redis Cluster     │
    │ (Distributed Event Log)│◄─────┤ (Caching & Deduplication│
    └───────────┬────────────┘      │    Transactional Locks)│
                │                   └────────────────────────┘
                │ Consume Sent Jobs
   ┌────────────▼────────────┐
   │ Campaign Dispatch Pods  │
   │  (Kafka Consumers)      │
   └────────────┬────────────┘
                ├────────────────────────┬────────────────────────┐
                │ Send SMS               │ Send WhatsApp          │ Send RCS / Email
                ▼                        ▼                        ▼
     ┌──────────────────────┐ ┌──────────────────────┐ ┌──────────────────────┐
     │   Twilio Gateway     │ │  Meta Cloud API API  │ │   Infobip Gateway    │
     └──────────────────────┘ └──────────────────────┘ └──────────────────────┘
```

---

## 3. High-Performance Caching & Concurrency Control via Redis

To prevent double-message delivery (e.g., duplicate campaign runs triggered simultaneously by two marketers or automated triggers), a Redis-based consensus/lock mechanism must be deployed.

### A. Distributed Locking (`Redlock`)
Before executing any campaign execution batch, workers must acquire an exclusive distributed lock using Redis:
```typescript
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL);

async function acquireCampaignLock(campaignId: string, ttlMs: number = 30000): Promise<boolean> {
  const isAcquired = await redis.set(
    `lock:campaign:${campaignId}`,
    'locked_by_processor_node_01',
    'PX', ttlMs,
    'NX'
  );
  return isAcquired === 'OK';
}
```

### B. Dynamic Callback Rate Limiting
To ensure compliance with third-party carrier boundaries and prevent IP throttling:
- User-specific campaign copilot endpoints are restricted using Redis token buckets (`ratelimit:campaign:user_id`).
- Incoming status feedback webhooks are temporarily buffered into a high-speed Redis Sorted Set (`zset:webhook:queue`) to be drained sequentially rather than slamming primary databases directly.

---

## 4. Scaled Pipeline Decoupling via Apache Kafka

An enterprise-grade CRM requires robust asynchronous decoupling. Converting REST handlers to message brokers ensures the front-end remains interactive and lightweight.

### A. Topic Partitioning Strategy
- **`mochi.campaigns.dispatched`**: Initial queue carrying targeted recipient partitions.
  - *Partitions*: 32 to 64 partitions, co-indexed by `campaignId` to guarantee that all events targeting a specific campaign go to the same partition, assuring message order.
- **`mochi.telemetry.events`**: Status updates directly consumed from third-party webhook feedback loops (`sent`, `delivered`, `opened`, `clicked`).
  - *Partitions*: Sharded by `customerId` to balance ingestion loads across parallel consumer worker pools.

### B. Node.js Producer Setup
```typescript
import { Kafka } from 'kafkajs';

const kafka = new Kafka({ clientId: 'mochi-crm-api', brokers: [process.env.KAFKA_BROKER] });
const producer = kafka.producer();

export async function queueCampaignBatch(campaignId: string, targets: string[]) {
  await producer.connect();
  const payloads = targets.map(targetId => ({
    key: campaignId,
    value: JSON.stringify({ campaignId, targetId, timestamp: Date.now() })
  }));
  
  await producer.send({
    topic: 'mochi.campaigns.dispatched',
    messages: payloads,
  });
}
```

---

## 5. Database Horizontal Scaling & Distributed Sharding

To prevent writing degradation as transaction databases grow into billions of event registers, database sharding must be introduced.

### Sharding Key selection: `tenant_id` (Multi-Tenant Scale)
Database sharding divides the data horizontally, directing each client query to the specific database slice storing that tenant’s records.

| Attribute | Selection Detail & Architectural Advantage |
| :--- | :--- |
| **Primary Sharding Key** | `tenant_id` (representing the enterprise account or brand using Mochi CRM). |
| **Routing Algorithm** | Consistent Hashing based on `hash(tenant_id) % num_shards`. This minimizes migration operations when expanding the cluster with fresh host VMs. |
| **Secondary Indexing** | Inside each shard, table indices are sharded locally by `customerId` to guarantee instant lookup times on Customer profiles and Campaign attribution tracking records. |

### Schema Replication & High Availability
- **Primary-Replica Segregation**: Database writes go to the primary node of the tenant's shard, while heavy aggregation queries (e.g., generating campaign impact charts on the user dashboard) are proxied to Read Replicas.
- **Daily Strategic AI Syncing**: Segment metadata calculations are run asynchronously on isolated analysis nodes to ensure zero-impact background performance during live transactional traffic windows.
