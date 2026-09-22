# SmartSupply AI — Autonomous Supply Chain, Inventory & CRM OS

[![Next.js](https://img.shields.io/badge/Next.js-14.2-black?style=flat&logo=next.js)](https://nextjs.org/)
[![Node.js](https://img.shields.io/badge/Node.js-20+-green?style=flat&logo=node.js)](https://nodejs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Neon%20DB-336791?style=flat&logo=postgresql)](https://neon.tech/)
[![RabbitMQ](https://img.shields.io/badge/RabbitMQ-AMQP-orange?style=flat&logo=rabbitmq)](https://rabbitmq.com/)
[![Tests](https://img.shields.io/badge/Tests-68%20Passing-brightgreen?style=flat)](https://github.com/)

**SmartSupply AI** is an enterprise-grade, multi-tenant autonomous supply chain, inventory management, CRM sales pipeline, and AI agent orchestration platform. It features a Human-in-the-Loop (HITL) safety architecture, multi-turn conversational workflows, tenant and demo data isolation, Mem0 long-term memory, and idempotent background event handling.

---

## ⚡ Architectural Highlights

- **Human-in-the-Loop (HITL) Mutation Guarantees:** Destructive or state-altering actions (e.g., restocking inventory, deleting leads/tasks, updating deal stages) are never executed immediately. The agent stages a `PENDING_CONFIRMATION` action with full payload auditing. Mutations only commit upon explicit user approval, leaving the database completely untouched before confirmation or after rejection.
- **Multi-Turn Context & Clarification Engine:** When user commands omit required parameters (e.g., "restock product" without specifying SKU or quantity, or "delete lead" without specifying identity), the agent enters structured sub-states (`AWAITING_LEAD_IDENTIFIER`, `AWAITING_PRODUCT`, `AWAITING_QUANTITY`), retains conversational context across turns, and preserves pending actions even when interrupted by read-only inquiries.
- **Intent Routing & Disambiguation:** Differentiates task creation from lead creation (e.g., `"Add a follow up task of meeting with the lead schedule on 30 sep 2026"` routes to `crm_task_creator`, extracting canonical due dates and cleaning the title). Parses deal shorthand formats (`$75k` -> `75000`), customer account numbers, and prevents mutations on read-only questions.
- **Tenant & Demo Data Isolation:** Complete data separation by `tenantId`. A dedicated `WriteGate` ensures demo users operate within a safe sandbox where database transactions are automatically rolled back, while authenticated live accounts commit directly to Neon PostgreSQL or isolated local storage.
- **Mem0 Long-Term Memory Integration:** Tenant-scoped semantic memory service (`memoryService.remember` and `memoryService.recall`). Recalls relevant user preferences and supplier context without token bloating by limiting snippets to compact relevant results rather than dumping the full conversation history.
- **Event-Driven Messaging & Idempotency:** RabbitMQ worker pipeline with deterministic idempotency keys (`idempotencyKey`). Duplicate redeliveries are acknowledged and deduplicated without executing side effects twice; failing deliveries route to dead-letter exchanges (DLX) with New Relic telemetry instrumentation.
- **Session Security & Inactivity Protection:** Stateless JWT authentication with strict route protection, generic 401 error messaging preventing credential enumeration, and an enforced 15-minute inactivity session expiration.

---

## 🔐 Credentials & Demo Access

For rapid evaluation, the application provides an instant sandboxed demo environment as well as live multi-tenant accounts:

| Access Mode | Identifier | Credentials / Action | Persistence Mode |
| :--- | :--- | :--- | :--- |
| **Instant Demo** | `demo@smartsupply.ai` | Click **1-Click Demo** on the login page | Sandboxed / WriteGate rollback |
| **Live Multi-Tenant** | Custom user signup | Email + Password via `/auth/signup` | Durable Neon PostgreSQL / Store |
| **Pre-Seeded Admin** | `admin@smartsupply.ai` | `Admin@123456` | Live Account |

---

## 🚀 Quick Start — Local Development

### 1. Prerequisites
- **Node.js** 20+
- **npm** 9+

### 2. Install Dependencies
```bash
# Install root & web workspace dependencies
npm install

# Install inventory service dependencies
npm install --prefix services/inventory-service
```

### 3. Environment Variables
Copy `.env.example` to `.env` in `apps/web/` or the root:
```env
# Auth
JWT_SECRET=super-secret-change-me-later-smartsupply

# Database (Optional - falls back to local JSON store if unconfigured)
DATABASE_URL=postgresql://...
NEON_DATABASE_URL=postgresql://...

# Messaging (Optional for inventory service worker)
RABBITMQ_URL=amqp://guest:guest@localhost:5672
```

### 4. Running the Development Server
```bash
# Starts Next.js app on port 3000
npm run dev
```

---

## 🧪 Comprehensive Test Suite

The project includes an end-to-end and integration test suite covering **68 automated tests** across 11 distinct test suites with zero failures.

### Running Tests

```bash
# Run all test suites across the monorepo (Next.js/Agent tests + Backend Jest tests)
npm test

# Run only Next.js API, Agent Intent, and HITL tests (Node.js test runner)
npm run test:web

# Run only Inventory Service & RabbitMQ tests (Jest)
npm run test:services
```

### Test Suite Structure

```
smartsupply-ai/
├── tests/                                                     # Web & AI Agent Test Suites (Node.js Test Runner)
│   ├── auth_and_session.test.mjs                              # Suite 1: Authentication, Inactivity & Security
│   ├── intent_understanding.test.mjs                          # Suite 2: AI Intent Routing & Entity Extraction
│   ├── lead_operations.test.mjs                              # Suite 3: CRM Lead CRUD & Stage State Machine
│   ├── hitl_confirmation.test.mjs                            # Suite 4: Human-in-the-Loop Confirmation Rigor
│   ├── multi_turn_conversations.test.mjs                      # Suite 5: Multi-Turn Context & History Workflows
│   ├── inventory_and_memory.test.mjs                          # Suite 6: Inventory CRUD, Tenant Isolation & Mem0
│   └── test_helpers.mjs                                       # HTTP client, token mocks & test utilities
└── services/inventory-service/src/__tests__/                  # Backend Service Suites (Jest)
    ├── rabbitmq_idempotency.test.js                           # RabbitMQ deduplication, DLX & New Relic telemetry
    ├── demo_write_gate.test.js                                # WriteGate transaction rollback for demo accounts
    ├── product.test.js                                        # Stock logic, reorder points & controller tests
    ├── tenant_isolation.test.js                               # Multi-tenant cross-tenant protection tests
    └── memory_isolation.test.js                               # Mem0 memory service scoping & telemetry tests
```

### Coverage Matrix

| Area | Suite | Key Tested Invariants |
| :--- | :--- | :--- |
| **Authentication & Inactivity** | `Suite 1` | Demo login sandbox creation, live signup/login, generic 401s preventing user enumeration, malformed token rejection, 15-minute inactivity session expiration. |
| **AI Intent Routing** | `Suite 2` | Disambiguation of task creation vs. lead creation, due date parsing (`"30 sep 2026"`, `"tomorrow"`, `"next week"`), deal shorthand (`$75k` -> 75000), read-only inquiry non-mutation. |
| **CRM Lead State Machine** | `Suite 3` | Stage progression (`New` -> `Contacted` -> `Qualified` -> `Proposal` -> `Won`), rejection of non-canonical stages (`Completed`), deletion by exact ID and title. |
| **HITL Confirmation Rigor** | `Suite 4` | Pre-confirmation invariant (DB unchanged prior to confirmation), affirmative execution (`Yes`), rejection cancellation (`No`), post-rejection idempotency, pending action retention across intermediate inquiries, and reporting failure on unsuccessful actions. |
| **Multi-Turn Workflows** | `Suite 5` | Step-by-step clarification for delete lead, follow-up task creation, lead stage transitions, restock workflows (product -> quantity), and chronological conversation history persistence. |
| **Inventory & Mem0 Memory** | `Suite 6` | Full product lifecycle (create, adjust stock, verify logs, update, delete), tenant isolation between distinct accounts, Mem0 memory scoping & token-efficient recall, and regression context retention for `#L-2357`. |
| **RabbitMQ Idempotency** | Jest | Message deduplication by `idempotencyKey`, dead-letter routing on dispatch failures, retry reprocessing, and New Relic background transaction metrics. |
| **WriteGate Demo Isolation** | Jest | Automatic transaction rollback for demo users, simulation flag injection, and cross-user result isolation. |

---

## 📡 REST API Reference

All protected endpoints require `Authorization: Bearer <token>`.

### Authentication (`/api/v1/auth`)
- `POST /api/v1/auth/demo` — Activate sandboxed demo session (`isDemo: true`).
- `POST /api/v1/auth/login` — Authenticate live user and receive JWT.
- `POST /api/v1/auth/signup` — Register a new tenant and administrative user.
- `GET /api/v1/auth/me` — Retrieve current authenticated user profile and `tenantId`.

### AI Assistant & HITL (`/api/v1/agents` & `/api/v1/actions`)
- `POST /api/v1/agents/:agentId/chat` — Send query to supply chain AI agent with conversation state and tool dispatch.
- `GET /api/v1/actions/pending` — List pending actions awaiting human confirmation.
- `GET /api/v1/actions/pending/:id` — Retrieve details of a specific staged action.
- `POST /api/v1/actions/pending/:id/approve` — Approve and execute a staged action.
- `POST /api/v1/actions/pending/:id/reject` — Cancel and discard a staged action.
- `GET /api/v1/conversations/:id/messages` — Fetch message history for a conversation thread.

### Inventory & Stock (`/api/v1/inventory`)
- `GET /api/v1/inventory` (or `/inventory/products`) — List tenant products with search, category, and status filters.
- `POST /api/v1/inventory` — Create a new inventory SKU.
- `GET /api/v1/inventory/:id` — Retrieve product details.
- `PUT /api/v1/inventory/:id` — Update product details.
- `DELETE /api/v1/inventory/:id` — Delete a product.
- `POST /api/v1/inventory/:id/stock` — Adjust stock quantity (`IN`, `OUT`, `ADJUSTMENT`) and record audit trail.
- `GET /api/v1/inventory/:id/history` — Retrieve stock movement audit logs.

### CRM & Sales Pipeline (`/api/v1/crm`)
- `GET /api/v1/crm/leads` — List active deals with stage breakdowns.
- `POST /api/v1/crm/leads` — Create a new CRM lead.
- `GET /api/v1/crm/leads/:id` — Retrieve lead details.
- `PUT /api/v1/crm/leads/:id` — Update lead details or stage.
- `DELETE /api/v1/crm/leads/:id` — Remove a lead from the pipeline.
- `GET /api/v1/crm/tasks` — List tasks and follow-up items.
- `POST /api/v1/crm/tasks` — Create a task with due date, priority, and lead association.
- `GET /api/v1/crm/customers` — List tenant customer accounts.
- `POST /api/v1/crm/customers` — Create a customer account.

---

## 🛡️ Multi-Tenant Security & Reliability Guarantees

1. **Strict Tenant Scoping:** Every business object (`products`, `leads`, `tasks`, `customers`, `stockHistory`) enforces row-level `tenantId` isolation in both relational database queries and the fallback local persistence layer.
2. **WriteGate Sandbox:** Demo user interactions are wrapped in simulated database transactions that automatically roll back on completion, ensuring the demo sandbox cannot corrupt production data.
3. **Fail-Closed Execution:** The AI assistant strictly requires real tool execution success before reporting positive completion to the user. Staged actions that fail or are canceled emit clear failure diagnostics without falsely claiming state changes.
4. **Credential Privacy:** 401 Unauthorized responses use generic messaging (`"Invalid email or password"`) for non-existent users and bad passwords alike, preventing account enumeration.

---

## 📂 Repository Structure

```
smartsupply-ai/
├── apps/
│   └── web/                           # Next.js 14 Web Application & AI Agent Engine
│       ├── app/                       # App Router (dashboard, inventory, crm, charts, agents, login)
│       │   ├── api/v1/[...slug]/      # Consolidated REST API endpoints
│       │   ├── api/agent/[...slug]/   # AI Assistant chat dispatch endpoints
│       │   └── ...                    # Page routes & layout
│       ├── components/                # UI components, layout, and AI Assistant drawer
│       ├── context/                   # AuthContext with 15-minute inactivity timer
│       └── lib/server/                # Server-side business logic
│           ├── agent.js               # Autonomous AI agent engine & HITL state machine
│           ├── store.js               # Multi-tenant data store & Neon DB adapter
│           ├── memory.js              # Mem0 memory service & context retrieval
│           └── neonDb.js              # Neon PostgreSQL schema & query layer
├── services/
│   └── inventory-service/             # Express / Sequelize Backend Microservice
│       ├── src/
│       │   ├── __tests__/             # Backend Jest test suites
│       │   ├── controllers/           # Product and inventory controllers
│       │   ├── db/                    # Sequelize models, migrations, and seeders
│       │   ├── services/              # RabbitMQ consumer & memoryService
│       │   └── utils/                 # WriteGate demo isolation & telemetry helpers
│       └── package.json
├── tests/                             # Next.js & AI Agent test suites (Node.js test runner)
├── package.json                       # Monorepo scripts & dependencies
└── README.md
```
