# Mochi CRM || AI-Powered Customer Relationship & Campaign Management Platform

> **Internship Assignment | Xeno**  
> Built with React 19, TypeScript, Express, Firebase, Google Gemini AI, and Vite

[![Live Demo](https://img.shields.io/badge/Live%20Demo-Vercel-black?style=for-the-badge&logo=vercel)](https://xeno-crm-bice.vercel.app)
[![TypeScript](https://img.shields.io/badge/TypeScript-98.8%25-3178c6?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)

---

## 📌 Table of Contents

1. [Project Overview](#-project-overview)
2. [Core Features](#-core-features)
3. [System Architecture](#-system-architecture)
4. [Tech Stack](#-tech-stack)
5. [Folder Structure](#-folder-structure)
6. [API Endpoints Reference](#-api-endpoints-reference)
7. [AI Integration Deep-Dive](#-ai-integration-deep-dive)
8. [Campaign Delivery Simulation](#-campaign-delivery-simulation)
9. [Getting Started (Local Setup)](#-getting-started-local-setup)
10. [Environment Variables](#-environment-variables)
11. [Deployment](#-deployment)
12. [Key Design Decisions](#-key-design-decisions)
13. [Future Improvements](#-future-improvements)

---

## 📖 Project Overview

**Mochi CRM** is a full-stack, AI-augmented Customer Relationship Management and marketing automation platform built as part of the Xeno internship assignment. It enables marketing teams to:

- **Manage and segment customers** using both rule-based filters and natural language AI prompts.
- **Create and launch multi-channel campaigns** targeting WhatsApp, SMS, Email, and RCS.
- **Generate personalized campaign copy** using Google Gemini AI, tailored to specific audience cohorts.
- **Simulate real-time campaign delivery** via an async decoupled webhook pipeline that mimics a real messaging vendor.
- **Analyze campaign performance** through a live analytics dashboard with AI-generated business insights and revenue predictions.

The platform is designed with a **progressive-enhancement philosophy**: all AI features gracefully degrade to intelligent rule-based heuristics when no Gemini API key is configured, ensuring the app is always fully functional.

---

## ✨ Core Features

### 1. 👥 Customer Management
- Full customer list with search and tag-based filtering
- Per-customer profile view with complete order history
- Customer tags: `high-value`, `inactive`, `at-risk`, `new`, and custom segments
- Customer metrics tracked: total spend, order count, last order date

### 2. 🎯 AI Hybrid Segmentation Engine
The most distinctive feature of the platform. Marketers describe their target audience in plain English (e.g., *"customers who spent over ₹5,000 but haven't ordered in 30 days"*), and the system:
- Sends the prompt + customer database to **Google Gemini** for intelligent matching
- Returns matched customer IDs, a human-readable explanation, and the filtering rules applied
- Falls back to a precision heuristic router if the AI is unavailable

### 3. 📣 Campaign Creation & Management
- Create draft campaigns with a name, audience segment, and channel
- Supported channels: **WhatsApp**, **SMS**, **Email**, **RCS**
- Campaign lifecycle: `draft` → `active` → `completed`
- Full stats tracked per campaign: sent, delivered, opened, clicked, failed, orders attributed, revenue attributed

### 4. ✍️ AI Campaign Copywriter
Given a marketing goal (e.g., *"win back inactive customers with a 20% discount"*) and the selected audience, Gemini generates:
- Optimized copy for all 4 channels simultaneously
- A recommended channel with a data-backed rationale
- Personalization token `{name}` embedded in every variant

### 5. 📊 Analytics Dashboard
- Overview KPIs: total customers, active campaigns, average delivery rate, CTR
- Campaign performance chart powered by **Recharts**
- Live chronological activity feed (sent → delivered → opened → clicked → converted)
- AI-generated business insights across 5 categories: churn risk, revenue opportunity, best channel, open rate trends, and conversion patterns

### 6. 🔮 AI Campaign Outcome Predictor
Before launching a campaign, the system predicts:
- Estimated reach (after delivery loss)
- Expected open rate and conversion rate (channel-specific)
- Projected revenue attribution in ₹
- A plain-language forecast rationale

### 7. ⚡ Real-Time Async Delivery Simulator
A full decoupled webhook pipeline simulates a real messaging vendor — no third-party service needed. See [Campaign Delivery Simulation](#-campaign-delivery-simulation) for details.

---

## 🏗 System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        CLIENT (Browser)                     │
│  React 19 + TypeScript + Tailwind CSS + TanStack Query      │
│  Pages: Dashboard | Customers | Campaigns | Analytics       │
└───────────────────────┬─────────────────────────────────────┘
                        │ HTTP / REST
┌───────────────────────▼─────────────────────────────────────┐
│                    EXPRESS SERVER (server.ts)               │
│                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────────┐  │
│  │  REST API    │  │  AI Layer    │  │  Async Simulator  │  │
│  │  /api/*      │  │  Gemini SDK  │  │  Webhook Pipeline │  │
│  └──────┬───────┘  └──────┬───────┘  └────────┬──────────┘  │
│         │                 │                    │            │
│  ┌──────▼─────────────────▼────────────────────▼─────────┐  │
│  │                  In-Memory JSON Database                 │  
│  │          customers | orders | campaigns | events         │  
│  └─────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
                        │
┌───────────────────────▼──────────┐
│         Firebase / Firestore     │
│    (Auth & Optional Persistence) │
└──────────────────────────────────┘
                        │
┌───────────────────────▼──────────┐
│       Google Gemini API          │
│  (Segmentation, Copywriting,     │
│   Insights, Prediction)          │
└──────────────────────────────────┘
```

The server is a **unified Express + Vite SSR** setup — in development, Vite middleware is loaded into the Express server for HMR. In production, the built React app is served as static files by the same Express process.

---

## 🛠 Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| Frontend | React 19 | UI component framework |
| Language | TypeScript 5.8 | Full-stack type safety |
| Styling | Tailwind CSS v4 | Utility-first styling |
| Routing | React Router v7 | Client-side navigation |
| Data Fetching | TanStack Query v5 | Server state, caching, polling |
| Charts | Recharts v3 | Campaign performance graphs |
| Animation | Motion (Framer Motion) | UI transitions |
| Icons | Lucide React | Icon library |
| Backend | Express v4 | REST API server |
| Bundler | Vite v6 | Frontend build + dev server |
| Runtime | Node.js + tsx | TypeScript server execution |
| AI | Google Gemini (`@google/genai`) | Segmentation, copy, insights |
| Auth/DB | Firebase v12 | Authentication & Firestore |
| Date Utils | date-fns v4 | Date formatting |
| Deployment | Vercel | Hosting |

---

## 📁 Folder Structure

```
Xeno-CRM/
├── src/
│   ├── components/         # Reusable UI components
│   ├── pages/              # Route-level page components
│   │   ├── Dashboard.tsx   # Analytics overview
│   │   ├── Customers.tsx   # Customer list & profiles
│   │   ├── Campaigns.tsx   # Campaign list & creation
│   │   └── Analytics.tsx   # Detailed analytics & insights
│   ├── server/
│   │   └── db.ts           # In-memory JSON database layer
│   ├── types/
│   │   └── index.ts        # Shared TypeScript type definitions
│   └── main.tsx            # React app entry point
├── assets/
│   └── .aistudio/          # Google AI Studio config
├── server.ts               # Express server + all API endpoints
├── index.html              # HTML entry point
├── vite.config.ts          # Vite configuration
├── tsconfig.json           # TypeScript configuration
├── firestore.rules         # Firebase security rules
├── firebase-blueprint.json # Firebase project structure
├── .env.example            # Environment variable template
├── package.json            # Dependencies & scripts
└── README.md               # This file
```

---

## 🔌 API Endpoints Reference

All endpoints are prefixed with `/api`.

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/health` | Server health check |
| `GET` | `/customers` | List all customers (supports `?tag=` and `?search=` filters) |
| `GET` | `/customers/:id` | Get a single customer with their full order history |
| `GET` | `/campaigns` | List all campaigns (supports `?status=` filter) |
| `GET` | `/campaigns/:id` | Get a single campaign by ID |
| `POST` | `/campaigns` | Create a new draft campaign |
| `GET` | `/analytics/overview` | Aggregated KPI metrics for the dashboard |
| `GET` | `/analytics/campaigns` | Campaign stats for chart rendering |
| `GET` | `/analytics/activity` | Live chronological activity feed (max 30 events) |
| `POST` | `/segment/suggest` | **AI Segmentation** — match customers to a natural language prompt |
| `POST` | `/campaigns/generate-copy` | **AI Copywriter** — generate multi-channel campaign messages |
| `POST` | `/campaigns/predict` | **AI Predictor** — forecast campaign reach, open rate, and revenue |
| `POST` | `/analytics/insights` | **AI Insights Engine** — generate 5 business intelligence insights |
| `POST` | `/send` | Trigger async campaign delivery simulation for a list of customers |
| `POST` | `/callback` | Receive delivery status webhook callbacks (internal use) |

---

## 🤖 AI Integration Deep-Dive

The AI layer is powered by **Google Gemini** via the `@google/genai` SDK. Four distinct AI capabilities are implemented:

### Segmentation (`POST /api/segment/suggest`)
The server sends the full (minified) customer list and the marketer's natural language prompt to Gemini. The model responds with structured JSON containing `matchedIds`, `rules`, and an `explanation`. Gemini effectively performs database-level filtering in natural language — no SQL needed.

### Campaign Copywriter (`POST /api/campaigns/generate-copy`)
Given a campaign goal and audience description, Gemini generates copy variants optimized for all 4 channels (WhatsApp, SMS, Email, RCS) simultaneously. It also recommends the single best channel with a marketing rationale. All copy embeds `{name}` for dynamic personalization at send time.

### Insights Engine (`POST /api/analytics/insights`)
The server computes a compressed data summary (customer counts, channel stats, at-risk examples) and passes it to Gemini with a structured schema. Gemini returns 5 typed insights covering churn risk, revenue opportunities, best channel, open rate trends, and conversion attribution — each with a title, description, impact metric, trend direction, and a call-to-action label.

### Outcome Predictor (`POST /api/campaigns/predict`)
Before launch, the system uses Gemini to forecast reach, open rate, conversion rate, and projected ₹ revenue for the planned campaign. This gives marketers a data-backed go/no-go decision point.

### Fallback Architecture
Every AI endpoint wraps its Gemini call in a `try/catch` with a robust **heuristic fallback** that activates instantly when:
- No API key is configured
- The model is unavailable or rate-limited (503)
- The API key is invalid (400/403) — fast-fails without retrying

The Gemini cascade tries models in order: `gemini-3.5-flash` → `gemini-3.1-flash-lite` → `gemini-flash-latest`, with 3 retry attempts per model and exponential backoff for transient errors.

---

## ⚡ Campaign Delivery Simulation

One of the most technically interesting parts of the project is the **decoupled async webhook simulator** in `server.ts`. When a campaign is launched:

1. `POST /api/send` is called with the campaign ID and target customer list
2. The server **immediately returns `200 OK`** (non-blocking)
3. For each customer, a series of `setTimeout` callbacks fire asynchronously:
   - **~400ms** → `sent` status
   - **~1500–3000ms** → `delivered` (90%) or `failed` (10%)
   - **~3500–6000ms** → `opened` (22% of delivered)
   - **~7000–10000ms** → `clicked` (25% of opened)
   - **~8000–12000ms** → **Attributed conversion order** (35% of clicked)

4. Each status event calls `POST /api/callback` internally, which updates the campaign stats in real time.
5. When a click converts to a purchase, a real `Order` record is created in the database, the customer's `totalSpent` and `orderCount` are updated, and the campaign's `orders_attributed` and `revenue_attributed` counters increment.

This architecture mirrors the real-world pattern used by messaging vendors (Twilio, MSG91, etc.) where delivery receipts arrive as asynchronous webhook callbacks after the initial send API call.

The frontend uses **TanStack Query's polling** to periodically re-fetch campaign stats, giving the user a live progress view without WebSockets.

---

## 🚀 Getting Started (Local Setup)

### Prerequisites

- **Node.js** v18 or higher
- A **Google Gemini API key** (free tier available at [aistudio.google.com](https://aistudio.google.com))

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/shambhavi0608/Xeno-CRM.git
cd Xeno-CRM

# 2. Install dependencies
npm install

# 3. Set up environment variables
cp .env.example .env.local
# Edit .env.local and add your GEMINI_API_KEY

# 4. Start the development server
npm run dev
```

The app will be available at **http://localhost:3000**

> **Note:** The app is fully functional without a Gemini API key. All AI features will use intelligent rule-based fallbacks. To unlock AI capabilities, add a valid `GEMINI_API_KEY` to `.env.local`.

### Available Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start development server with HMR at port 3000 |
| `npm run build` | Build React frontend + bundle Express server to `dist/` |
| `npm run start` | Run the production build |
| `npm run lint` | Type-check TypeScript (no emit) |
| `npm run preview` | Preview the Vite production build |
| `npm run clean` | Remove the `dist/` directory |

---

## 🔐 Environment Variables

Create a `.env.local` file in the project root (copy from `.env.example`):

```env
# Required for AI features (segmentation, copywriting, insights, prediction)
# Get yours free at: https://aistudio.google.com/app/apikey
GEMINI_API_KEY="your_gemini_api_key_here"

# The URL where this app is hosted (used for internal webhook callbacks)
# In development, this is automatically http://localhost:3000
APP_URL="http://localhost:3000"
```

> ⚠️ **Never commit `.env.local` to version control.** It is already listed in `.gitignore`.

---

## 🌐 Deployment

The project is deployed on **Vercel** and can be viewed at:  
👉 **https://xeno-crm-bice.vercel.app**

It is also hosted on **Google AI Studio** at:  
👉 https://ai.studio/apps/a5f94a47-52dc-4953-b766-54e57880e643

### Deploying to Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Set environment variables in Vercel dashboard:
# GEMINI_API_KEY → your key
# APP_URL        → your Vercel deployment URL
```

### Build Output

Running `npm run build` produces:
- `dist/` — compiled React frontend (served as static files)
- `dist/server.cjs` — bundled Express server (CommonJS, Node-compatible)

---

## 🧠 Key Design Decisions

### 1. Unified Express + Vite Server
Rather than running separate dev and API servers, a single Express instance loads Vite as middleware in development. This simplifies proxying, eliminates CORS issues, and mirrors the production setup where the same Express server serves both the static React build and the REST API.

### 2. In-Memory JSON Database with File Persistence
The database layer (`src/server/db.ts`) uses an in-memory store seeded with realistic data on startup. This keeps the project zero-dependency for storage (no PostgreSQL or MongoDB setup required) while still demonstrating proper data modeling across four entities: `customers`, `orders`, `campaigns`, and `events`.

### 3. Structured JSON Responses from Gemini
Every Gemini call uses `responseMimeType: 'application/json'` along with a `responseSchema` to enforce typed output. This eliminates the need for fragile regex parsing of LLM text and guarantees the response shape matches the TypeScript interfaces defined in `src/types/index.ts`.

### 4. Dual-Layer Fallback Strategy
Every AI endpoint has a **mathematically-grounded heuristic fallback** — not just an error message. This means the demo works flawlessly during evaluation even if the API key quota is exhausted or the model is unavailable, which is critical for a production internship submission.

### 5. Decoupled Async Delivery Pipeline
The `/api/send` → `/api/callback` architecture intentionally mirrors how real messaging vendors work. This demonstrates an understanding of asynchronous system design and webhook-based architecture patterns beyond simple CRUD operations.

---

## 🔭 Future Improvements

Given more time, the following enhancements would meaningfully elevate the platform:

- **Persistent Database**: Migrate from the in-memory store to a proper Firestore or PostgreSQL database for true multi-session persistence.
- **Real Messaging Integration**: Connect to actual messaging APIs (MSG91 for WhatsApp/SMS, SendGrid for Email) to deliver real messages.
- **Authentication**: Implement Google OAuth via Firebase Auth so multiple team members can log in with isolated data.
- **Campaign Scheduling**: Allow campaigns to be scheduled for future delivery with cron-based triggering.
- **A/B Testing**: Support two message variants per campaign with automatic winner selection based on open rate.
- **CSV Customer Import**: Allow bulk customer upload via CSV for real-world onboarding.
- **Webhook Verification**: Add HMAC signature verification to the `/api/callback` endpoint to prevent spoofed delivery receipts.
- **Rate Limiting**: Add `express-rate-limit` to all public-facing API routes.
- **Unit & Integration Tests**: Add Vitest for server-side logic and React Testing Library for component tests.

---

## 👩‍💻 Author

**Shambhavi**  
Internship Candidate — Xeno  
GitHub: [@shambhavi0608](https://github.com/shambhavi0608)

---

## 📄 License

This project was built as part of the Xeno internship assignment. All rights reserved.
