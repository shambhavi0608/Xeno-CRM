# AI-Native Mini CRM for Shoppers 🚀

**Xeno Engineering Internship Assignment (2026)**  
An intelligent, event-driven, full-stack **AI-Native Mini CRM** built specifically for Direct-to-Consumer (D2C) and consumer brands.

This platform helps brands intelligently segment customers using natural language, generate hyper-personalized messages, run simulated multi-channel campaigns, and track real-time performance through an asynchronous callback system.

---

## 🎨 Visual Design & Immersive Experience

- **Theme**: Premium Fluxora-inspired dark aesthetic with deep charcoal/maroon base and vibrant organic gradients (fiery orange `#FF4500`, amber `#FF8C00`, sunburst gold `#FFD700`).
- **Typography**: Modern sans-serif with bold headlines and elegant italic accents.
- **3D Elements**: Three floating translucent glass chairs in the hero section for premium depth.
- **Parallax Scrolling**: Multi-layered smooth parallax effect (background slow, text medium, foreground cards fast) — inspired by premium Dribbble designs.
- **Cybernetic Video**: Right-side glassmorphic container with auto-playing cyber/biometric scanner video loop (pulse waves, telemetry, data sweeps) using `mix-blend-mode` for seamless integration.
- **Fully Responsive** with glassmorphism and smooth interactions.

---

## ✨ Key Features

1. **Data Ingestion**  
   Manage customers and order history.

2. **Smart AI Segmentation**  
   Natural language prompt input (e.g., "Find users who spent over 5000 in the last 30 days") that filters customers dynamically.

3. **Personalized Messaging**  
   Tailored message generation based on customer behavior and channel recommendations (WhatsApp, SMS, Email, RCS).

4. **Async Channel Stub Service** *(Assignment Critical Requirement)*  
   Fully simulated messaging system (no real APIs like Twilio).  
   Probabilistic outcomes on callbacks:
   - Delivered: **70%**
   - Opened: **15%**
   - Clicked: **5%**
   - Failed: **10%**

5. **Real-Time Analytics Dashboard**  
   Live metrics: Delivery Rate, Open Rate, CTR, and campaign performance.

---

## ⚙️ System Architecture
Data Ingestion → Database
↓
Natural Language Segmentation (AI)
↓
Personalization Layer
↓
Campaign Execution
↓
Async Channel Simulator (Background Task)
↓
Webhook Callbacks → Real-time Analytics
text- **Backend**: FastAPI with Background Tasks for non-blocking async simulation.
- **Frontend**: React with Tailwind + Parallax + Video integration.
- **Database**: In-memory (easily extensible to SQLite/PostgreSQL).

---

## 🛠️ Tech Stack

- **Frontend**: React.js + Tailwind CSS + Framer Motion (Parallax)
- **Backend**: Python + FastAPI
- **Database**: SQLite / PostgreSQL
- **AI Layer**: Google Gemini API (via AI Studio)
- **Others**: Asyncio, CORS, Pydantic

---

## 🚀 Quick Start (Local Setup)

### Backend
bash
cd backend
pip install fastapi uvicorn pydantic
uvicorn app:app --reload --port 8000
Frontend
Bashcd frontend
npm install
npm run dev
Open: http://localhost:3000
Backend API runs on: http://localhost:8000

📁 Project Structure
textxeno-crm/
├── backend/
│   └── app.py
├── frontend/
│   ├── src/
│   │   └── App.jsx (or LandingPage.jsx)
│   └── package.json
├── README.md
└── .env.example

🎯 Demo Flow

Open the website → Enjoy parallax, floating chairs & cyber video.
Enter segmentation prompt → Click "Execute Campaign".
Watch real-time logs and analytics update automatically as simulated events fire.


✅ Xeno Assignment Compliance

All minimum required features implemented.
Fully working Async Channel Stub Service with probabilistic callbacks.
Premium UI/UX with 3D + Parallax for strong visual impact.
Ready for: Hosted Link + GitHub Repo + Walkthrough Video.
Submission Deadline: 15 June 2026


📈 Future Improvements

Full Gemini API integration for dynamic message generation.
PostgreSQL + Redis.
Docker support.
Production deployment (Vercel + Render).


Built with ❤️ for Xeno Engineering
Last Updated: June 2026
