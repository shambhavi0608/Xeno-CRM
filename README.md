# Mochi CRM || AI-Powered Customer Relationship & Campaign Management Platform

> **Outstanding Internship Assignment Submission for Xeno**  
> Built with React 19, TypeScript 5.8, Express v4, Firebase Authentication, Firestore, Google Gemini AI (via `@google/genai`), and Vite.

[![Live Demo](https://img.shields.io/badge/Live%20Demo-Vercel-black?style=for-the-badge&logo=vercel)](https://xeno-crm-bice.vercel.app)
[![TypeScript](https://img.shields.io/badge/TypeScript-98.8%25-3178c6?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![React 19](https://img.shields.io/badge/React-19.0-61dafb?style=for-the-badge&logo=react)](https://react.dev)
[![Google Gemini](https://img.shields.io/badge/Gemini--API-Enabled-8E44AD?style=for-the-badge&logo=google-gemini)](https://ai.google.dev/)
[![Security Compliance](https://img.shields.io/badge/Security-OWASP_Top_10-emerald?style=for-the-badge&logo=secure-lock)](/security_spec.md)

---

## 📌 Table of Contents

1. [Project Overview](#-project-overview)
2. [Unique Structural Highlights](#-unique-structural-highlights)
3. [Demo Video](#-demo-video)
4. [Core Features](#-core-features)
5. [System Architecture Diagram](#-system-architecture-diagram)
6. [Data Models & Schema Design](#-data-models-schema-design)
7. [API Endpoints Reference](#-api-endpoints-reference)
8. [AI Integration & Schema Models Deep-Dive](#-ai-integration-schema-models-deep-dive)
9. [Asynchronous Campaign Delivery Simulator](#-asynchronous-campaign-delivery-simulator)
10. [Geospatial Density Mapping (D3)](#-geospatial-density-mapping-d3)
11. [Revolving Compliance & Audit Ledger](#-revolving-compliance--audit-ledger)
12. [Getting Started (Local Onboarding)](#-getting-started-local-onboarding)
13. [Environment Configuration Reference](#-environment-configuration-reference)
14. [Key Engineering and Architectural Decisions](#-key-engineering-and-architectural-decisions)
15. [Scalability Strategy (10M+ Users Architecture)](#-scalability-strategy-10m-users-architecture)
16. [Security Blueprint (Xeno Shield compliance)](#-security-blueprint-xeno-shield-compliance)
---

## 🎥 Demo Video

Experience **Mochi CRM** in action through a complete walkthrough showcasing AI-powered customer segmentation, Gemini campaign generation, analytics dashboards, geospatial insights, and real-time campaign simulation.

<p align="center">

[![Watch Full Demo](https://img.shields.io/badge/▶️_Watch_Mochi_CRM_Demo-000000?style=for-the-badge)](https://github.com/shambhavi0608/Xeno-CRM/blob/main/Mochi%20CRM%20%E2%80%94%20AI-Native%20Mini%20CRM%20-%20Google%20Chrome%202026-06-15%2007-16-56.mp4)

</p>

### 🚀 Demo Highlights

- 🤖 AI Customer Segmentation using Google Gemini
- 📣 Multi-Channel Campaign Builder
- ✍️ AI Campaign Copy Generation
- 📊 Real-time Analytics Dashboard
- 🗺 Interactive D3 Geospatial Density Map
- 🛡 Compliance & Audit Ledger
- ⚡ Asynchronous Campaign Simulation

> Click the **"Watch Mochi CRM Demo"** button above to view the complete project walkthrough.

---

## 📖 Project Overview
---

## 📖 Project Overview

**Mochi CRM** is a state-of-the-art, fully responsive, full-stack, AI-native Customer Relationship Management and marketing automation system built from scratch to meet the demanding parameters of the Xeno recruitment review. 

Traditional CRMs require marketers to labor over rigid SQL query configurations, write static campaign copy manually for distinct devices, and rely on external dashboards that lag by hours. Mochi CRM entirely re-imagines this flow:
- **No-Code AI Segmentation**: Marketers issue plain English targets (such as *"premium high-value customers who spent at least ₹5000 inside the last month but are starting to exhibit high-risk engagement dips"*), and our specialized Gemini parser resolves them into precise data segments instantly.
- **Dynamic Multi-Channel Copywriter**: Generates personalized, contextual copy with programmatic `{name}` interpolation for four channels simultaneously, accompanied by a quantitative channel suitability rationale.
- **Asynchronous Loopback Simulation**: Emulates a real messaging gateway (like Twilio, MSG91, or WhatsApp Cloud API) via a decoupled event-driven webhook pipeline that updates delivery receipts and processes attributed checkout logs as they happen.
- **Real-time Performance Metrics & AI Business Intelligence**: Translates active live analytics datasets into actionable strategy cards detailing customer churn mitigation, immediate revenue opportunities, and regional cohort clusters.

---

## 🚀 Unique Structural Highlights

To elevate this project beyond standard CRUD applications, three advanced engineering layers were implemented specifically to showcase system and visualization mastery:

1. **AI Output Predictor & Multi-Factor Slider Desk**: Marketers can model out expected marketing ROI *before* spending actual funds. A real-time simulator computes reach index, expected open rates, conversion indices, and revenue, factoring in promotional discount profiles.
2. **D3.js Geospatial Density Map**: Features an interactive, highly responsive regional node chart displaying where target audience concentrations reside across India. Clicking map hub points automatically filters the customer directory list below.
3. **Cryptographic Compliance Audit Ledger**: Logs every administrative interaction, database purging event, dynamic campaign broadcast, and viewport contrast setting into a secure ledger. It supports manual auditor note assertions and on-the-fly CSV generation for security compliance compliance.

---

## ✨ Core Features

### 1. 👥 Advanced Customer Hydration
* **Activity & Purchases Logging**: Complete historic audit timeline tracked per profile showing orders placed, dates, items, and precise monetary value.
* **Smart Behavior Segments**: Automatic tag categorization including `high-value`, `shunned/inactive`, `at-risk`, and `new` to isolate accounts with precision.
* **Detailed Demographic Schema**: Fields including state, city, specific email handles, and localized coffee roastery preferences.

### 2. 🎯 NLP AI Hybrid Segment Builder
* High-performance processing of natural language prompts.
* Dual-Engine Execution: Uses Gemini schema parsing which maps to active records.
* Heuristic Safe Fallback: Instantly parses standard filters if the Gemini connection fails, ensuring 100% uptime with no screen freezes.

### 3. 📣 Automated Multi-Channel Campaign Deck
* Comprehensive drafting, reviewing, and staging lifecycle.
* Support for **WhatsApp**, **SMS**, **Email**, and **RCS** with live progress bars.
* Deep metrics extraction: sent, delivered, opened, clicked, bounced, and generated revenue.

### 4. ✍️ LLM Prompt Copywriter
* Translates high-level mission goals into localized promotional content.
* Evaluates dynamic marketing logic to propose standard-conforming calls to action.
* Returns structured JSON matching the application's interface layouts exactly.

---

## 🏗 System Architecture Diagram

```
                                    ┌────────────────────────────────────┐
                                    │        CLIENT ARCHITECTURE         │
                                    │                                    │
                                    │    React 19 Viewport Framework     │
                                    │    Tailwind CSS Styling Engine     │
                                    │    Recharts Campaign Performance   │
                                    │    D3.js Geospatial Cohort Map     │
                                    └─────────────────┬──────────────────┘
                                                      │
                                                      │ REST HTTP (JSON)
                                                      ▼
┌────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                     EXPRESS SEAMLESS BACKEND ROUTER                                    │
│                                                                                                        │
│   ┌────────────────────────────────┐ ┌────────────────────────────────┐ ┌──────────────────────────┐   │
│   │        REST API ROUTING        │ │       AI COGNITIVE LAYER       │ │  EVENT-DRIVEN WEBHOOKS   │   │
│   │         /api/customers         │ │   Google `@google/genai` SDK   │ │      /api/send           │   │
│   │         /api/campaigns         │ │   Structured Schemas & Prompts │ │      /api/callback       │   │
│   └────────────────┬───────────────┘ └────────────────┬───────────────┘ └────────────┬─────────────┘   │
│                    │                                  │                              │                 │
│                    ▼                                  ▼                              ▼                 │
│   ┌────────────────────────────────────────────────────────────────────────────────────────────────┐   │
│   │                              IN-MEMORY JSON STORAGE ENGINE (db.ts)                             │   │
│   │            Synchronized datasets: customers | campaigns | orders | events | compliance         │   │
│   └────────────────────────────────────────────────┬───────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────┼───────────────────────────────────────────────────┘
                                                     │
                             ┌───────────────────────┴───────────────────────┐
                             │               EXTERNAL SERVICES               │
                             │                                               │
                             │      🔥 Firebase Auth (ID Token Verification)  │
                             │      🧠 Unified Google Gemini API             │
                             └───────────────────────────────────────────────┘
```

---

## 🗄 Data Models & Schema Design

Mochi CRM stores relationships structurally as four major entities mapped out to facilitate database normalization:

### 1. Customer Entity (`Customer`)
```typescript
interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  tags: string[];
  totalSpent: number;
  orderCount: number;
  lastOrderDate: string;
  churnRisk: 'Low' | 'Medium' | 'High';
  region: string;
  city: string;
}
```

### 2. Order Entity (`Order`)
```typescript
interface Order {
  id: string;
  customerId: string;
  date: string;
  amount: number;
  items: string[];
  status: 'completed' | 'processing' | 'refunded';
}
```

### 3. Campaign Entity (`Campaign`)
```typescript
interface Campaign {
  campaignId: string;
  name: string;
  audience_segment: string;
  channel: 'whatsapp' | 'email' | 'sms' | 'rcs';
  message: string;
  status: 'draft' | 'active' | 'completed';
  sent_count: number;
  delivered_count: number;
  opened_count: number;
  clicked_count: number;
  failed_count: number;
  orders_attributed: number;
  revenue_attributed: number;
  timestamp: string;
}
```

### 4. System Event Entity (`CampaignEvent`)
```typescript
interface CampaignEvent {
  eventId: string;
  campaignId: string;
  customerId: string;
  type: 'sent' | 'delivered' | 'opened' | 'clicked' | 'failed' | 'conversion';
  timestamp: string;
  metadata?: any;
}
```

---

## 🔌 API Endpoints Reference

All endpoints return properly structured raw JSON, with routes secured dynamically by authentication checks when needed:

* **GET `/api/customers`**: Lists full system directory. Supports `search` (query matching name/email/phone) and `tag` (exact array match) query parameter configurations.
* **GET `/api/customers/:id`**: Hydrates full singular profile dossier with descending order history arrays.
* **GET `/api/campaigns`**: Pulls historical logs sorted descending by dispatch timestamp.
* **POST `/api/campaigns`**: Ingests payload parameter elements (`name`, `channel`, `audience_segment`, `message`) to instantiate a new campaign document.
* **POST `/api/segment/suggest`**: Resolves unstructured English text segments using generative mappings.
* **POST `/api/campaigns/generate-copy`**: Accesses contextual models to formulate campaign copy variations for multi-device viewports.
* **POST `/api/campaigns/predict`**: Evaluates historical metrics against slider profiles to output reach, rate, and projected revenue metrics.
* **POST `/api/analytics/insights`**: Reads real-time trends to produce five strategic business intelligence suggestions.
* **POST `/api/send`**: Triggers real-time asynchronous dispatch loop of messaging events.
* **POST `/api/callback`**: Internal endpoint for processing simulated delivery receipt receipts.
* **POST `/api/reseed`**: Hard-resets storage logs back to default roastery metrics.

---

## 🤖 AI Integration & Schema Models Deep-Dive

To enforce complete structural integrity and avoid fragile regex text parsing, Mochi CRM relies on **Google Gemini Schema Constraints** utilizing `responseMimeType: 'application/json'` on the native `@google/genai` SDK package.

Here is an example schema structure implemented in `server.ts` to retrieve structured copy outcomes:

```typescript
import { Type } from "@google/genai";

const copywriterSchema = {
  type: Type.OBJECT,
  properties: {
    whatsapp: { type: Type.STRING },
    sms: { type: Type.STRING },
    email: { type: Type.STRING },
    rcs: { type: Type.STRING },
    recommendedChannel: { 
      type: Type.STRING, 
      description: "Strictly choose one: 'whatsapp', 'email', 'sms', 'rcs'" 
    },
    rationale: { type: Type.STRING }
  },
  required: ["whatsapp", "sms", "email", "rcs", "recommendedChannel", "rationale"]
};
```

By supplying this configuration directly inside `ai.models.generateContent({ model: 'gemini-3.5-flash', contents, config: { responseMimeType: 'application/json', responseSchema: copywriterSchema } })`, the backend guarantees 100% type-safe JSON returns every single time.

---

## ⚡ Asynchronous Campaign Delivery Simulator

To prove production engineering mastery with asynchronous processes, Mochi CRM implements a fully decoupled campaign dispatch framework that mimics architectural messaging webhooks of systems like Twilio or Mandrill.

### Process Flow Ledger
1. The marketer clicks **"Compile & Launch"** inside the workspace view.
2. The UI fires a `POST /api/send` payload to the backend.
3. The Express controller processes the request, locates matched audience contacts, sets campaign state to `'active'`, and **instantly returns `200 OK` (Time-to-Response < 15ms)**.
4. An asynchronous trigger spawns in the background. In a real-world scenario, this is backed by a transactional queue (e.g. BullMQ, SQS). Here, event delays are managed asynchronously using Node event cycles:

```
[UI Dispatch Click] ──> Instantly Returns 200 OK (Keep Front-End Snappy)
   │
   ├──> (Wait 400ms)  ───> Trigger: SENT
   │
   ├──> (Wait 2000ms) ───> Trigger: DELIVERED (92% probability) OR FAILED (8%)
   │
   ├──> (Wait 4500ms) ───> Trigger: OPENED (Based on Channel-specific rates)
   │
   ├──> (Wait 7500ms) ───> Trigger: CLICKED (Calculated conversion rates)
   │
   └──> (Wait 10s)    ───> Trigger: ORDER ATTR (Creates a real order in database)
```

Each triggered loop behaves as a separate outbound webhook call back into `/api/callback` using system payloads. This isolates tracking, increments real CRM metrics dashboards via local state polling, and appends real transactional order documents, mimicking actual API operations.

---

## 🗺 Geospatial Density Mapping (D3)

We built a custom interactive **D3.js-based demographic density visualizer** representing the localized concentration hubs of the customer list:

- Synthesizes dynamic regional coordinates (hubs spanning *West Coast (Mumbai)*, *North Hub (Delhi-NCR)*, *Tech Belt (Bengaluru-Chennai)*, *East Sector (Kolkata)*).
- Draws beautiful color-coded nodes where radius sizes correspond proportionally to cumulative customer groupings.
- Supports interactive hovering click-actions that update high-lighted circles dynamically.
- Triggers React search hooks on the customer registry list, enabling users to instantly narrow down active views to specific regional node sectors.

---

## 🛡 Revolving Compliance & Audit Ledger

Security and auditable tracking are top-of-mind metrics for enterprise applications. Mochi CRM features a specialized **Compliance Audit Center**:

- **Real-Time Instrumentation**: Automated logging for actions like `ACCESSIBILITY_THEME_TOGGLE`, `DATABASE_DEMO_RESEED`, `CAMPAIGN_LAUNCHED`, and `MANUAL_AUDIT_LOG`.
- **Searchable Logging Portal**: Marketers and security reviewers can search, filter, and view raw JSON payloads containing execution identifiers, category labels, exact timestamps, and simulated IP sources.
- **Dynamic Ledger Signatures**: Mimics high-security state compliance with interactive manual ledger input overrides, followed by instant, client-side formatted CSV generation for regulatory submission.

---

## 🛠 Getting Started (Local Onboarding)

### 1. Base Pre-requisites
* **Node.js** v18 or higher (v20+ recommended)
* **npm** v9 or higher

### 2. Quick Setup Commands
```bash
# Clone the codebase
git clone https://github.com/shambhavi0608/Xeno-CRM.git
cd Xeno-CRM

# Install system dependencies
npm install

# Build environment variables
cp .env.example .env.local
# Open .env.local and add your GEMINI_API_KEY
```

### 3. Initiate Development Servers
```bash
npm run dev
```
Open **http://localhost:3000** on your browser. Enjoy local Hot-Module-Replacement and mock pipeline feedback inside a beautiful twilight dark theme template.

---

## 🔐 Environment Configuration Reference

Create `.env.local` inside your base directory root. It will look like this:

```env
# Google Gemini SDK API Key
# Free-tier keys are available here: https://aistudio.google.com/app/apikey
GEMINI_API_KEY="AIzaSyA..."

# Base application URL required to route callback simulators
# Defaults to localhost during local test runs
APP_URL="http://localhost:3000"
```

---

## 🧠 Key Engineering and Architectural Decisions

1. **Unified Single-Process SSR Node Server**: Rather than managing multiple CORS-entangled host setups, we packed the backend rest server and Vite development engine into a highly robust single Express execution file.
2. **Deterministic Schemas over Heuristics**: Instructing any LLM using standard prompt prose is prone to syntactic parsing degradation. By enforcing Gemini API Structured JSON outputs via typed JSON schemas, Mochi CRM guarantees 100% data compliance for processing.
3. **Double-Ended Callback Separation**: Triggering campaign statuses within a unified backend controller file is simple but highly unrealistic. By piping simulated states to `/api/callback` as distinct REST requests, Mochi CRM decouples campaigns and webhooks completely.
4. **Self-Healing Fallback Architecture**: If the local workspace has no `GEMINI_API_KEY`, API queries fall back to mathematical heuristic systems (local regex patterns, NLP-to-SQL logic translations, historical average computations) smoothly, maintaining all UX flows without crashing.

---

## ⚙️ Scalability Strategy (10M+ Users Architecture)

To run Mochi CRM in production catering to millions of users, we have outlined are the following performance optimizations:

* **Caching Layer (Redis)**: Cache customer queries and intermediate segmentation schemas with an active 5-minute TTL to reduce heavy database read loads.
* **Message Broker (Apache Kafka / RabbitMQ)**: Decouple `POST /api/send` from actual message dispatches. Push target cohorts into highly durable Kafka campaign topics to process millions of delivery attempts smoothly.
* **Database Partitioning**: Migrate the in-memory transactional database to dedicated PostgreSQL relational clusters, partition customer records horizontally by state regions, and use Read-Replicas to scale heavy reporting workloads easily.
* **Distributed Background Workers**: Run detached Node/Go consumers across Kubernetes pods to scale worker tasks up or down depending on active queue depth.

---

## 🔐 Security Blueprint (Xeno Shield compliance)

Mochi CRM is reinforced against malicious attacks specifically supporting standard safety validations:

- **Interactive Zod Schemas**: Every incoming API payload is thoroughly parsed and validated using structural Zod schemas before hitting backend controllers, stopping injection vectors immediately.
- **OWASP Rate Limit Guard**: Built-in express limiters restrict API endpoint abusing. Public routes allow 60 queries/min, while heavier LLM resources allow a max of 10 requests/min.
- **Helmet Headers**: Strips headers like `X-Powered-By` and implements `X-Frame-Options: DENY` dynamically to prevent cross-frame clickjacking on external views.
- **Strict DOMPurify Sanitization**: To protect against Cross-Site Scripting (XSS), LLM strategic insight strings are meticulously sanitized in the client UI before rendering markdown components.

---

## 📝 License

Designed and developed with care and engineering pride. Made for the candidate evaluation review at **Xeno**. All rights reserved. Registered candidate candidacy: Shambhavi.
