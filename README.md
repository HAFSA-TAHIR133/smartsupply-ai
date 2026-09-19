# SmartSupply AI — Autonomous Supply Chain, Inventory & CRM OS

[![Next.js](https://img.shields.io/badge/Next.js-14.2-black?style=flat&logo=next.js)](https://nextjs.org/)
[![Node.js](https://img.shields.io/badge/Node.js-20+-green?style=flat&logo=node.js)](https://nodejs.org/)
[![Python](https://img.shields.io/badge/Python-3.11+-blue?style=flat&logo=python)](https://python.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15+-336791?style=flat&logo=postgresql)](https://postgresql.org/)
[![RabbitMQ](https://img.shields.io/badge/RabbitMQ-AMQP-orange?style=flat&logo=rabbitmq)](https://rabbitmq.com/)
[![Groq](https://img.shields.io/badge/Groq-Compound%20LLM-F55036?style=flat)](https://groq.com/)

**SmartSupply AI** is an enterprise-grade, multi-tenant autonomous supply chain, inventory management, CRM negotiation pipeline, RAG document knowledge base, and agent orchestration system.

---

## ⚡ Key Architectural Highlights

- **Multi-Tenant Isolation:** Guaranteed tenant isolation at the database model level (`Sequelize`), controller layer, and Python agent tools layer. Frontend `tenant_id` is never blindly trusted; authenticated JWT claims strictly inject the tenant context.
- **Controlled Python AI Agents (`agents/`):** 4 autonomous agents powered by Groq (`groq/compound` & fallback `qwen/qwen3.6-27b`) that invoke strictly controlled, parameterized Python tools without arbitrary SQL generation:
  1. 📦 **Inventory & Stock Agent:** Real-time stock audit, safety stock thresholds, automated restock purchase order triggers.
  2. 💼 **CRM Deals & Pipeline Specialist:** Pipeline stage velocity, deal risk scoring, SLA task deadlines.
  3. 📄 **Document RAG Specialist:** Grounded document chunk retrieval, SLA contract terms, and supplier warranty citations.
  4. 🌐 **Master Supply Chain Orchestrator:** End-to-end synthesis across inventory health, CRM pipeline demand, and contract compliance.
- **Asynchronous Event-Driven Messaging:** Node.js backend and Python Agent service communicate over RabbitMQ AMQP message broker with correlation ID matching and transparent direct HTTP fallback.
- **RAG Knowledge Base:** Multi-format document parser (PDF, DOCX, TXT) with automatic chunking, metadata extraction, and semantic chunk inspection.
- **Executive SaaS UI:** Built with Next.js 14, Tailwind CSS, Recharts, and Framer Motion with a dark violet theme (`#6D28D9`, `#7C3AED`, `#0B0512`), glassmorphism, and responsive data visualization.

---

## 🔐 Default Demo User & Credentials

For instant testing and evaluation, the database is pre-seeded with an active administrator user and a live tenant sandbox:

| Parameter | Value |
| :--- | :--- |
| **Email** | `admin@smartsupply.ai` |
| **Password** | `Admin@123456` |
| **Role** | `ADMIN` |
| **Tenant** | `Acme Logistics Global` (`3e6c5a8e-f131-4902-8d80-1c9056f858d4`) |
| **1-Click Demo** | Click the **⚡ 1-Click Demo** button on the Login page |

---

## 🚀 Quick Start — Local Development

### 1. Prerequisites
- **Node.js** 18+ or 20+
- **Python** 3.10+ or 3.11+
- **PostgreSQL** 14+ (or Docker)
- **RabbitMQ** (Local or CloudAMQP)

### 2. Configure Environment Variables
Copy `.env.example` or create `.env` in the root:
```env
# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=smartsupply
DB_USER=postgres
DB_PASSWORD=postgrespassword

# RabbitMQ & Messaging
RABBITMQ_URL=amqp://guest:guest@localhost:5672

# Groq LLM API
GROQ_API_KEY=your_groq_api_key_here
LLM_MODEL=groq/compound

# Auth
JWT_SECRET=smartsupply_secret_jwt_key_2026_super_secure
```

### 3. Run Database Migrations & Seeds
```bash
cd services/inventory-service
npm install
npm run migrate
npm run seed
```

### 4. Start the 3 Services

#### Terminal 1 — Python AI Agent Service:
```bash
# In agents/
python -m venv .venv
# Windows: .venv\Scripts\activate | Linux/macOS: source .venv/bin/activate
pip install -r agents/requirements.txt
python agents/main.py
# Runs FastAPI & RabbitMQ worker on http://localhost:8000
```

#### Terminal 2 — Node.js Backend API:
```bash
# In services/inventory-service/
npm run dev
# Express API listening on http://localhost:4001
```

#### Terminal 3 — Next.js Web Frontend:
```bash
# In apps/web/
npm install
npm run dev
# Open http://localhost:3000 in your browser
```

---

## 🐳 Docker Deployment

To spin up the entire cluster (PostgreSQL, RabbitMQ, Redis, Node.js Backend, Python Agents, and Next.js Web Frontend) with a single command:

```bash
cd infra
docker compose up --build -d
```

Services will be accessible at:
- **Web Frontend:** `http://localhost:3000`
- **Backend API:** `http://localhost:4001/api/v1`
- **Python Agents Service:** `http://localhost:8000`
- **RabbitMQ Management UI:** `http://localhost:15672` (User: `guest`, Pass: `guest`)

---

## 📡 REST API Reference

All endpoints require `Authorization: Bearer <token>` (except `/auth/login`, `/auth/signup`, `/auth/demo`).

### Authentication (`/api/v1/auth`)
- `POST /api/v1/auth/signup` — Register new tenant and admin user.
- `POST /api/v1/auth/login` — Authenticate and receive JWT token.
- `POST /api/v1/auth/demo` — Generate instant demo session token.
- `GET /api/v1/auth/me` — Current authenticated user profile and tenant details.
- `POST /api/v1/auth/forgot-password` — Generate 6-digit reset OTP.
- `POST /api/v1/auth/reset-password` — Set new password using OTP token.

### Inventory & Stock Control (`/api/v1/inventory`)
- `GET /api/v1/inventory` — List tenant SKUs with search, category, and stock filters.
- `POST /api/v1/inventory` — Create new inventory product SKU.
- `GET /api/v1/inventory/:id` — Retrieve product details.
- `POST /api/v1/inventory/:id/stock` — Adjust stock (`IN`, `OUT`, `ADJUSTMENT`), write audit log, and trigger low-stock alerts.
- `GET /api/v1/inventory/:id/history` — Fetch complete audit trail of stock adjustments.

### CRM & Negotiation Pipeline (`/api/v1/crm`)
- `GET /api/v1/crm/leads` — List all active deals grouped by Kanban stages.
- `POST /api/v1/crm/leads` — Create new opportunity in the pipeline.
- `PUT /api/v1/crm/leads/:id/stage` — Advance or move deal between stages (`New`, `Contacted`, `Qualified`, `Proposal`, `Won`).
- `GET /api/v1/crm/customers` — List tenant customer accounts.
- `GET /api/v1/crm/tasks` — List CRM follow-up action items.
- `POST /api/v1/crm/tasks` — Create task with deadline and priority.
- `PUT /api/v1/crm/tasks/:id` — Update task status (`PENDING` / `COMPLETED`).

### Document RAG Knowledge Base (`/api/v1/documents`)
- `GET /api/v1/documents` — List uploaded documents and chunk metrics.
- `POST /api/v1/documents/upload` — Ingest PDF, DOCX, or TXT file, parse text, and generate vector chunks.
- `GET /api/v1/documents/search?q=query` — Semantic chunk search with grounded snippet retrieval.
- `DELETE /api/v1/documents/:id` — Delete document and associated text chunks.

### Autonomous AI Agents (`/api/v1/agents`)
- `GET /api/v1/agents` — List available agent configurations and authorized tools.
- `PUT /api/v1/agents/:id/config` — Update agent system prompt directives or toggle active state.
- `GET /api/v1/agents/executions` — List historical agent tool executions and latency telemetry.
- `POST /api/v1/agents/:agentId/chat` — Dispatch query to Python Agent via RabbitMQ AMQP / HTTP fallback.

### Executive Dashboard (`/api/v1/dashboard`)
- `GET /api/v1/dashboard/stats` — Aggregated KPI metrics, historical valuation trends, stage distribution, low-stock warnings, and urgent tasks.

---

## 🛡️ Multi-Tenant Security & Isolation

1. Every database table includes a `tenant_id` foreign key.
2. The Node.js auth middleware verifies the JWT, sets `req.user.tenantId`, and all database queries enforce `{ where: { tenant_id: req.user.tenantId } }`.
3. Python agent tools accept `tenant_id` strictly from the authenticated message context passed by the backend queue consumer, preventing cross-tenant data leaks.
4. System prompt sanitization ensures tenant credentials, passwords, and sensitive API keys are stripped before generating answers.

---

## 📂 Repository Structure

```
smartsupply-ai/
├── agents/                       # Python AI Agent Service
│   ├── agents/                   # 4 Specialized Agents (Inventory, CRM, Document, Supply Chain)
│   ├── tools/                    # Parameterized Controlled Tools & DB Helpers
│   ├── memory/                   # Conversation & Sensitive Data Sanitization
│   ├── llm/                      # Groq Compound LLM Client
│   ├── config/                   # Settings & Environment Parser
│   ├── consumer.py               # RabbitMQ AMQP Consumer
│   ├── publisher.py              # RabbitMQ AMQP Publisher
│   ├── main.py                   # FastAPI Application & Background Worker
│   └── requirements.txt
├── apps/
│   └── web/                      # Next.js 14 Web Application
│       ├── app/                  # App Router (Dashboard, Inventory, CRM, Documents, Agents, Login)
│       ├── components/           # UI Primitives, Layout, and AI Assistant Drawer
│       ├── context/              # Auth & Global State Providers
│       ├── lib/                  # API Client & Utilities
│       └── next.config.js        # Rewrites & Monorepo Configuration
├── services/
│   └── inventory-service/        # Modular Node.js / Express Backend
│       ├── src/
│       │   ├── controllers/      # Auth, Inventory, CRM, Documents, Agents, Dashboard
│       │   ├── db/               # Sequelize Schema Migrations, Models, and Seeders
│       │   ├── middleware/       # JWT Authentication & Tenant Injection
│       │   ├── routes/           # REST API Route Declarations
│       │   ├── services/         # RabbitMQ RPC Queue Dispatcher
│       │   └── index.js          # Express Server Entry Point
│       └── package.json
├── infra/                        # Containerization & Orchestration
│   └── docker-compose.yml        # Multi-container Docker compose specification
└── README.md
```

---

## 🧪 Verification & Testing

- **Backend Endpoints:** Verified using `curl` and unit API calls against PostgreSQL 18.
- **AI Agent Tool Execution:** Live queries tested with Groq Compound LLM, executing SQL tools safely against `smartsupply` database and returning authoritative citations.
- **Frontend Build:** Verified with Next.js 14 static optimization (`npm run build` completed with 0 errors).
