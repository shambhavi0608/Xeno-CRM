# AI-Native Mini CRM for Shoppers 🚀

An advanced, AI-native, event-driven Marketing CRM platform engineered tailored specifically for Direct-to-Consumer (D2C) and retail brands to intelligently manage customer databases, segment audiences via natural language processing, and execute hyper-personalized campaigns across automated messaging networks.

This system is engineered to satisfy the production baseline expectations of the **Xeno Engineering Take-Home Assignment (2026)**, modeling a robust backend state architecture paired with a premium, motion-rich frontend interface.

---

## 🎨 Immersive UX & Visual Design System

The visual framework transitions away from cookie-cutter, flat dashboard interfaces, implementing a highly cinematic and responsive interactive design:

* **Fluxora Dark Glow Aesthetic:** Built using a high-contrast charcoal and deep maroon canvas, accentuated with fluid, organic background radial glows shifting across fiery orange, amber, and sunburst yellow spectral tones.
* **Deep Multi-Layered Parallax Physics:** Modeled directly after elite fluid layout systems. The background neon gradients stay absolutely static ($0.1\times$), while semantic typography layers shift gracefully at standard speeds ($0.5\times$), and individual terminal execution interface cards float upwards at accelerated rates ($1.2\times$). This creates an elegant overlapping reveal effect as you scroll.
* **3D Spatial Elements:** Leverages floating, highly polished, translucent 3D glass geometric chairs within the primary hero viewport to introduce rich tactile layout boundaries.
* **Active Telemetry Media Container:** The right-hand dashboard wrapper features a glassmorphic viewport tracking an auto-playing, seamless HTML5 video canvas stream. This component continuously plays cybernetic pulse-waves, fingerprint sweep matrices, and data processing telemetry to mirror live cryptographic and analytical synchronization loops.

---

## ⚙️ Core System Architecture & Data Flow

The product is systematically architected as an **Event-Driven Pipeline + AI Decision Layer + Asynchronous Callback Loop**.
### End-to-End Execution Flow

1.  **Ingestion & Normalized Storage Engine:** Captures inbound raw demographic structures and purchase histories via high-throughput JSON data routes. It maps them efficiently inside two persistent, normalized relational tables:
    * `Customer Entity`: tracks unique identifiers, shopper metadata tags, contact details, behavioral aggregates, and transaction timestamps.
    * `Order Entity`: isolates incremental transactional purchase arrays, mapped natively to unique customers via relational foreign keys.
2.  **Hybrid Natural Language Segmentation:** Features an interactive "Prompt to Segment" input interface. When a marketer passes uncompiled expressions (e.g., *"Users who spent over 5000 in the last 30 days"*), the application acts as an AI decision interpreter, dynamically translating natural intent strings into backend analytical queries to filter accurate customer lists.
3.  **AI Personalization & Matrix Optimization:** Programmatically channels targeted customer data parameters into an LLM pipeline to synthesize unique message variations. The system evaluates previous attributes to dynamically recommend optimal transmission lines (WhatsApp, SMS, Email, RCS) and perfect delivery hours.
4.  **Decoupled Asynchronous Channel Service (Simulation Layer):** Strictly adheres to the requirement of not integrating real messaging APIs. All delivery logic is completely isolated inside a self-contained, stubbed channel simulator. When a campaign job executes, the CRM server posts a batch transmission request package to the service.
5.  **Probabilistic Event Webhook System:** The stubbed simulator processes requests asynchronously, mocking real-world network dependencies. Following a delayed operational window, it triggers realistic callback webhooks back into the CRM's ingestion routes based on specific mathematical weights:
    * **Delivered:** 70% probability configuration.
    * **Opened:** 15% probability configuration.
    * **Clicked:** 5% probability configuration.
    * **Failed:** 10% probability configuration.
6.  **Real-Time Analytics Processing:** Reconciles inbound webhook events instantly, refreshing tracking states without reloading the application. The monitoring page recalculates aggregate delivery trends, live open ratios, Click-Through Rates (CTR), and direct order conversions.

---

## 🛠️ Technology Stack Specifications

* **Frontend Engine:** React.js / Next.js (Tailwind CSS Framework, Framer Motion Scroll Timelines, HTML5 Canvas Video API).
* **Backend Server Infrastructure:** Python Framework (FastAPI / Flask) or Node.js Ecosystem (Express).
* **Storage & Caching Frameworks:** PostgreSQL / SQLite relational models mapped with SQLAlchemy/Prisma ORM tools, paired with Redis for low-latency operational state caching.
* **Generative AI Orchestration:** Google AI Studio API Layer / Gemini 1.5 Pro Prompt Management Pipelines.

---

## 🚀 Local Installation & Deployment Guide

### Prerequisites
* Node.js runtime environment (v18 or higher installed).
* Python environment compilation toolset (v3.10 or higher).
* Active Google AI Studio Workspace Developer API Key.

### 1. Backend API Configuration Setup
Navigate into your system server project directories:
```bash
cd backend
Install required framework packages and core dependencies:

Bash
pip install -r requirements.txt
# Alternatively, for Node environments: npm install
Configure a secure .env environment credential file in the root backend directory:

Code snippet
PORT=8000
GEMINI_API_KEY=your_secured_google_ai_studio_api_token
DATABASE_URL=sqlite:///./crm_storage.db
Fire up the responsive backend runtime pipeline server:

Bash
uvicorn app:app --reload --port 8000
2. Frontend Interface Build Setup
Open a separate, concurrent terminal instance pointing directly to your web application assets:

Bash
cd frontend
Fetch relevant visual libraries and utility modules:

Bash
npm install
Start up the localized development asset compiler interface:

Bash
npm run dev
Open your browser engine and navigate to http://localhost:3000 to interact with the full-stack system live.
Open your browser engine and navigate to http://localhost:3000 to interact with the full-stack system live.

📈 Enterprise Scalability Trade-offs & Assumptions
Message Queue Offloading: For the immediate scope of this evaluation product, asynchronous callback delayed responses utilize in-memory promise thread schedulers. In production enterprise scales handling massive volume, an industrial-grade message broker (such as Apache Kafka or RabbitMQ) would be deployed between the Campaign Service and the Channel Stub to guarantee data persistence and avoid message dropping during high traffic bursts.

Real-time Analytics Storage Optimization: Live aggregation indexes calculate telemetry updates directly via standard querying pools. At scale, this would be replaced with time-series hyper-tables (e.g., TimescaleDB) or Redis caching layers to provide instant dashboard reads while protecting the primary relational engine from lookup overhead.
