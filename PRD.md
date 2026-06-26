**DigiCow Africa · Kenya AI Challenge (Advisory track)**
**Product Requirements Document — “Suluhu”**

_Suluhu — a farmer-intelligence copilot for extension agents. Scope: mixed **sugarcane + dairy** smallholdings, Western Kenya. Prototype target: 27 June 2026._

---

## Table of Contents
1. Introduction — 1.1 Purpose · 1.2 Scope · 1.3 Definitions, Acronyms & Abbreviations
2. Functional Requirements — 2.1 Agent (User) Features · 2.2 Admin Features · 2.3 AI/ML Algorithms · 2.4 Pages
3. User Stories (master list)
4. Technical Requirements — 4.1 Front-End · 4.2 Back-End · 4.3 AI/ML Service · 4.4 Database (Neo4j graph model) · 4.5 Infrastructure · 4.6 Integration Strategy · 4.7 Data / Processing Flow
5. Non-Functional Requirements & Success Metrics

---

# 1. Introduction

## 1.1 Purpose
This document defines the product requirements for **Suluhu**, an AI-powered farmer-intelligence copilot for youth agricultural extension agents. Suluhu turns the scattered, unstructured field knowledge of an agent's caseload into a daily, ranked, explainable action plan. It is built for the DigiCow Africa brief and is **enterprise-agnostic by design**, with **sugarcane and dairy** as the first two supported enterprises (the deepest worked examples for the prototype).

## 1.2 Scope
**In scope (prototype):**
- A single agent's workflow across a caseload of ~50 mixed sugarcane/dairy smallholders.
- The core loop: **Capture → Prioritise → Tailor → Grounded Q&A → Follow-up.**
- A Neo4j graph backbone, a backend API (with Swagger/OpenAPI), an AI inference service, and a mobile-responsive agent web app with offline capture.

**Out of scope (prototype):**
- Live production integration with DigiCow's systems (simulated via synthetic data modelled on the real schema).
- Native mobile apps; farmer-facing SMS/USSD/IVR channels (stubbed).
- Real IoT sensor hardware and live telemetry (simulated via mock-data scripts).
- Trained ML models where deterministic rules suffice for the demo.

## 1.3 Definitions, Acronyms, and Abbreviations
- **Agent:** Youth extension agent — the primary user.
- **Enterprise:** A farming activity a farmer runs (e.g., Dairy, Sugarcane).
- **Caseload:** The set of farmers assigned to an agent (~50).
- **Capture:** A logged visit with observations, issues, advice and follow-up.
- **GraphRAG:** Retrieval-Augmented Generation that grounds an LLM in a knowledge graph + vector-indexed source text.
- **Cypher:** Neo4j's graph query language. **Bolt:** Neo4j's wire protocol.
- **OpenAPI / Swagger:** Machine-readable REST contract + its interactive docs.
- **AI:** Artificial Intelligence · **ML:** Machine Learning · **API:** Application Programming Interface · **UI/UX:** User Interface / Experience · **PWA:** Progressive Web App · **DTO:** Data Transfer Object · **KB:** Knowledge Base.

---

# 2. Functional Requirements

## 2.1 Agent (User) Features

### Feature 1 — Authentication & Agent Profile
- **Description:** Secure agent login; profile scoping the agent to their county and caseload.
- **User stories:** US-01, US-02
- **Acceptance criteria:**
  - Agent can log in with credentials and receive a session token; unauthenticated requests are rejected.
  - On login, the app loads only the farmers assigned to that agent.
  - Profile shows agent name, county (e.g., Kakamega), and caseload size.

### Feature 2 — Farmer & Enterprise Registry
- **Description:** Register a farmer and the enterprise(s) they run (sugarcane, dairy, or both), plus assets (animals, plots/fields).
- **User stories:** US-03, US-04
- **Acceptance criteria:**
  - Agent can create a farmer with name, location/GPS, phone, and one or more enterprises.
  - Each enterprise holds its assets: dairy → animals (with breed, lactation/breeding state); sugarcane → fields (with area, variety, ratoon cycle, planting/last-harvest date).
  - A single farmer can hold both enterprises simultaneously.

### Feature 3 — Visit Capture (Capture)
- **Description:** Fast, guided logging of a field visit: structured observations, free-text notes, and simulated handheld probe readings (soil moisture/pH, milk yield/quality).
- **User stories:** US-05, US-06
- **Acceptance criteria:**
  - Agent can record a visit against a farmer, selecting the relevant enterprise(s).
  - Free-text notes are auto-structured into typed fields (observation, issue, advice) via the AI service.
  - Capture works offline and queues for sync (see Feature 8).

### Feature 4 — Prioritisation Queue (Triage)
- **Description:** A daily ranked queue of which farmers to visit, combining dairy and sugarcane risk signals into one score with human-readable reasons.
- **User stories:** US-07, US-08, US-09
- **Acceptance criteria:**
  - The queue ranks the full caseload and surfaces the top priorities (default top 5) for the day.
  - Each entry shows a rule-based reason (e.g., _\"Dairy: milk yield down 18% over 3 days\"_ or _\"Sugarcane: top-dressing window closing in 4 days\"_).
  - Signals include yield/milk drops, biological-window deadlines, weather-driven risk, and **record staleness** (farmers not visited recently are not forgotten).

### Feature 5 — Farmer Detail & Tailored Recommendations
- **Description:** A unified farmer view with combined sugarcane + dairy timelines, and a recommended next action plus the input to carry.
- **User stories:** US-10, US-11
- **Acceptance criteria:**
  - Detail view shows both enterprises side by side with recent events and trends.
  - For a flagged issue, the system suggests a specific action and the precise input (e.g., CAN/urea top-dressing rate, dairy concentrate, vaccine), routed by enterprise.
  - Recommendations reflect the farmer's history, local soil/weather, and the active issue.

### Feature 6 — GraphRAG Advisory Assistant
- **Description:** A grounded Q&A assistant for the agent's technical questions, scoped to the right knowledge base and the farmer's subgraph.
- **User stories:** US-12
- **Acceptance criteria:**
  - Agent can ask a free-text question in the context of a farmer.
  - The answer is grounded strictly in retrieved manual content (sugarcane agronomy or veterinary) plus that farmer's data, and **includes citations**.
  - When confidence is low or the issue is high-risk, the assistant defers to a vet/agronomist referral rather than guessing.

### Feature 7 — Follow-up & Outcome Logging
- **Description:** Log the outcome of a visit/advice to track adoption and update future priorities.
- **User stories:** US-13
- **Acceptance criteria:**
  - Agent can mark a recommendation as done/partly done/not done, with a note.
  - Logging an outcome updates the farmer's record and feeds the next prioritisation cycle.

### Feature 8 — Offline Capture & Sync
- **Description:** Full capture and read access offline, with delayed sync when connectivity returns.
- **User stories:** US-15
- **Acceptance criteria:**
  - Agent can register farmers, capture visits, and view cached caseload data with no network.
  - Queued changes sync automatically and resolve without data loss when back online.

### Feature 9 — Risk Propagation Alerts
- **Description:** Flag neighbouring farms when a contagious issue is recorded nearby (e.g., sugarcane smut, a notifiable dairy disease).
- **User stories:** US-16
- **Acceptance criteria:**
  - Recording a contagious issue raises an alert for farms within the defined proximity.
  - Affected farmers are boosted in the prioritisation queue with a clear reason.

### Feature 10 — Caseload Map &amp; Heatmap
- **Description:** A geographic view of the agent's caseload — every farmer plotted at their location and colour-coded by priority band, with a **Pins ⇆ Heatmap** toggle that reveals clusters of urgency and contagious-issue hotspots. It **reuses data the system already has** — the prioritisation score (Feature 4) and the farmer's GPS captured at registration (Feature 2) — so it adds visibility with **no new data collection**.
- **User stories:** US-20
- **Acceptance criteria:**
  - The map plots every farmer in the caseload at their registered location, coloured by priority band (urgent / window-closing / routine).
  - A **Pins ⇆ Heatmap** toggle switches between individual markers and a density layer weighted by score.
  - Tapping a marker opens that farmer's detail (Feature 5).
  - Contagious-issue clusters (e.g., the smut alert from Feature 9) are visually highlighted.
  - Farmers missing a GPS location are listed separately rather than dropped from the view.

## 2.2 Admin Features

### Feature 1 — Agent & Caseload Management
- **User stories:** US-17
- **Acceptance criteria:** Admin can create agents and assign/reassign farmers to an agent's caseload.

### Feature 2 — Knowledge-Base Management
- **User stories:** US-18
- **Acceptance criteria:** Admin can upload/curate reference documents (KALRO sugarcane, veterinary manuals); ingestion chunks and embeds them for GraphRAG; each chunk retains a source citation.

### Feature 3 — Analytics & Insights
- **User stories:** US-19
- **Acceptance criteria:** Admin can view visit volumes, adoption rates, and productivity trends across agents.

## 2.3 AI / Machine Learning Algorithms
The AI service provides **stateless inference** only (it does not own the database). Capabilities:
- **Visit-note structuring:** light NLP that converts free-text agent notes into structured fields (observation / issue / advice), tagged by enterprise.
- **Issue classification:** categorises a captured observation and routes it to sugarcane (agronomic) or dairy (veterinary) logic, returning a category, severity and confidence.
- **Embeddings:** turns manual text and queries into vectors for the Neo4j vector index.
- **GraphRAG generation:** composes a grounded, cited answer from retrieved context chunks + a farmer-subgraph summary.
- **Prioritisation scoring** is computed in the backend as a deterministic Cypher rule for the prototype (clear path to a learned model later); the AI service may later host the learned scorer behind the same contract.

## 2.4 Pages
**Agent pages:** Login · Daily Queue (home) · Caseload Map & Heatmap · Farmer Detail (dual-enterprise) · Visit Capture · Advisory Chat · Profile.
**Admin pages:** Agents & Caseloads · Knowledge Base · Analytics Dashboard.
**Additional pages:** Offline/sync status · Empty/error states · About.

---

# 3. User Stories (master list)

> IDs are stable and referenced by the role-split document. Format: _As a [role], I want [capability], so that [value]._

**Authentication & profile**
- **US-01** — As an agent, I want to log in securely, so my caseload and notes stay private.
- **US-02** — As an agent, I want a profile scoped to my county, so I only see my assigned farmers.

**Registry**
- **US-03** — As an agent, I want to register a farmer and the enterprises they run, so the system tracks the right things.
- **US-04** — As an agent, I want to record assets per enterprise (animals, fields), so advice can be asset-specific.

**Capture**
- **US-05** — As an agent, I want to log a visit with observations and (simulated) probe readings, so records stay current.
- **US-06** — As an agent, I want my free-text notes auto-structured, so capture is fast in the field.

**Triage**
- **US-07** — As an agent, I want a daily ranked list of who to visit with a reason, so I act on the most urgent first.
- **US-08** — As an agent, I want the ranking to combine dairy and sugarcane signals, so one queue covers my whole caseload.
- **US-09** — As an agent, I want farmers with stale records surfaced, so nobody is forgotten.

**Tailor**
- **US-10** — As an agent, I want a unified farmer view with both enterprise timelines, so I prep in seconds.
- **US-11** — As an agent, I want a recommended action and the exact input to carry, so the visit is productive.

**Grounded Q&A**
- **US-12** — As an agent, I want to ask a technical question and get a cited, grounded answer, so I can trust and explain it.

**Follow-up**
- **US-13** — As an agent, I want to log the outcome of advice, so adoption is tracked and priorities improve.

**Offline**
- **US-15** — As an agent, I want to capture and read data offline and sync later, because field connectivity is poor.

**Risk**
- **US-16** — As an agent, I want alerts when a contagious issue is logged nearby, so I can contain spread.

**Admin**
- **US-17** — As an admin, I want to manage agents and caseload assignments, so coverage is organised.
- **US-18** — As an admin, I want to manage the knowledge base, so advisory answers stay accurate and cited.
- **US-19** — As an admin, I want analytics across agents, so I can see adoption and productivity.

**Caseload map & visibility**
- **US-20** — As an agent, I want to see my caseload on a map/heatmap coloured by priority, so I can plan an efficient route and spot urgency and disease clusters at a glance.

---

# 4. Technical Requirements

## 4.1 Front-End
- **Framework:** **Next.js (React) as a PWA** — TypeScript, file-based routing, server/client rendering, and a service worker + IndexedDB for offline capture and sync.
- **Reasons:** mobile-responsive for field use; offline-first PWA avoids native app overhead; TypeScript types generated directly from the backend's OpenAPI spec (no hand-written API models).
- **Alternative:** plain React + Vite + Workbox (if SSR is unnecessary).

## 4.2 Back-End
- **Framework:** **NestJS (TypeScript).**
- **Reasons:** structured, modular, and ships first-class OpenAPI/Swagger generation (`@nestjs/swagger`) — so the **Frontend contract is auto-published**; clean dependency injection for the Neo4j driver and the AI-service client.
- **Responsibilities:** owns all Neo4j access (single writer), the prioritisation Cypher, retrieval for GraphRAG, auth, sync, and orchestration of calls to the AI service.
- **Alternative:** Fastify + `@fastify/swagger` (lighter, still typed).

## 4.3 AI/ML Service
- **Framework:** **Python + FastAPI** (auto-generated OpenAPI at `/docs`).
- **Reasons:** best ecosystem for embeddings/LLM/NLP; runs as an independent, stateless HTTP service the backend calls via fetch; can scale separately.
- **Responsibilities:** note structuring, issue classification, embeddings, and GraphRAG answer generation. **Does not access Neo4j directly** — it receives all needed context from the backend.

## 4.4 Database — Neo4j Graph Model
- **Database:** **Neo4j (AuraDB free tier for the prototype)**, accessed by the backend via the official driver over Bolt. A **native vector index** stores manual-chunk embeddings for retrieval.
- **Why a graph:** a single farmer's dual-enterprise relationships (crop + livestock + assets + visits + neighbours) are heterogeneous and highly connected — awkward in fixed relational tables, natural in a graph; the same Cypher query scores any enterprise type.

**Core node labels (key properties):**
- `Agent` (id, name, county, role)
- `Farmer` (id, name, gps, phone, lastVisitedAt)
- `Enterprise` (id, type: `Dairy|Sugarcane`)
- `Animal` (id, breed, lactationStage, lastBreedingDate) · `Field` (id, areaHa, variety, ratoonCycle, lastTopDressedAt)
- `Visit` (id, date, agentId) · `Observation` (id, text, capturedAt)
- `Issue` (id, category, severity, status) · `Action` (id, text) · `Input` (id, name, type, quantity)
- `Zone` (id, name) · `Weather` (date, metrics)
- `ManualChunk` (id, text, source, embedding) — knowledge base for GraphRAG

**Core relationships:**
```
(:Agent)-[:MANAGES]->(:Farmer)-[:RUNS]->(:Enterprise)-[:HAS_ASSET]->(:Animal|:Field)
(:Farmer)-[:HAD_VISIT]->(:Visit)-[:CAPTURED]->(:Observation)-[:FLAGS]->(:Issue)
(:Issue)-[:RECOMMENDS]->(:Action)-[:NEEDS]->(:Input)
(:Farmer)-[:IN]->(:Zone)<-[:FORECAST_FOR]-(:Weather)
(:Farmer)-[:NEAR]->(:Farmer)                 // risk propagation
(:Issue)-[:GROUNDED_IN]->(:ManualChunk)      // GraphRAG citation trail
```

> **Prototype implementation status (as of 27 Jun 2026).** Implemented nodes: `Agent, Farmer, Enterprise, Animal, Field, Visit, Observation, Issue, ManualChunk, KnowledgeDocument, AdvisoryInquiry, Recommendation`. Implemented relationships: `MANAGES, RUNS, HAS_ASSET, HAD_VISIT, CAPTURED, FLAGS, HAS_RECOMMENDATION, ABOUT, ASKED, GROUNDED_IN` (the citation trail runs from `AdvisoryInquiry`, not `Issue`). Modelled but **not yet implemented**: `Action, Input, Zone, Weather` nodes and the `RECOMMENDS, NEEDS, IN, FORECAST_FOR, NEAR` relationships. Notes: tailored action + input (US-11) is currently delivered in the advisory response (`action_items` + `inputs_needed`) rather than persisted `Action`/`Input` nodes; risk propagation (US-16) uses gps proximity rather than materialised `NEAR` edges. Cooperatives and the supervisor role have been removed from scope — agent roles are now `agent | admin`.

## 4.5 Infrastructure
- Neo4j AuraDB (managed). Backend and AI service each containerised and deployed to a simple host (e.g., Render/Railway/Fly) for the prototype. Frontend on Vercel. Secrets via environment variables; HTTPS throughout.

## 4.6 Integration Strategy (three independent services)
- **Front-End ↔ Back-End:** REST over HTTPS, fully described by the backend's **OpenAPI/Swagger** spec (served at `/api/docs`). The frontend generates a typed client from the spec and can develop against a **mock server** before the backend is finished.
- **Back-End ↔ AI Service:** the backend calls the AI service's HTTP endpoints (FastAPI, JSON in/out) via fetch. The backend is the **only** caller of the AI service.
- **Back-End ↔ Neo4j:** Cypher over Bolt; the backend is the single source of truth and the only writer.
- **Contract-first:** all three boundaries are frozen as contracts on day 1 (see the role-split document), so the three roles build in parallel against mocks and integrate at the end.

## 4.7 Data / Processing Flow (end-to-end)
1. **Capture:** agent submits a visit → Frontend → `POST /farmers/{id}/visits` (Backend).
2. **Structure:** Backend calls AI `POST /structure-note` → writes `Visit/Observation/Issue` nodes to Neo4j.
3. **Prioritise:** `POST /recommendations/generate` runs the Cypher scoring across the caseload → returns a ranked list with reasons (`GET /recommendations` reads the current queue).
4. **Tailor:** `POST /advisory/ask` composes the recommended action + inputs for the active issue (`action_items` + `inputs_needed`).
5. **Grounded Q&A:** `POST /advisory/ask` → Backend embeds the query (AI `/embed`), runs a Neo4j vector search for `ManualChunk`s + pulls the farmer subgraph → calls AI `/advisory/ask` with that context → returns a cited answer.
6. **Follow-up:** `PATCH /recommendations/{id}/status` (done / partly_done / not_done + note) updates the graph and the next score.

---

# 5. Non-Functional Requirements & Success Metrics

**Non-functional requirements**
- **Offline-first:** capture and read must work with no connectivity; sync is idempotent and loss-free.
- **Performance:** queue and farmer-detail views load in < 2 s on a mid-range Android browser.
- **Explainability:** every priority score and recommendation exposes its reason; every advisory answer shows citations.
- **Responsible AI:** GraphRAG is locked to retrieved chunks (no fabricated quantities); high-risk issues trigger human/vet referral; agent remains the decision-maker.
- **Privacy:** role-based access; agents see only their caseload; minimal personal-data exposure.
- **Portability:** enterprise-agnostic schema — adding a new enterprise (e.g., poultry) requires no schema rewrite.

**Prototype success metrics (for the 27 June demo)**
- A raw visit capture flows through to a re-ranked next-day queue.
- One queue ranks both sugarcane and dairy farmers with correct, readable reasons.
- GraphRAG answers a sugarcane question and a dairy question, each cited from the right manual.
- Capture works offline and syncs on reconnect.

---

# Appendix A — Feature Flow Diagrams (Eraser)

Each feature's cross-service interaction is maintained as an editable **sequence diagram** in Eraser, showing exactly how Frontend → Backend → AI Service → Neo4j collaborate (including the previously-implicit recommendation-engine flow).

**Eraser file (all diagrams, editable):** https://app.eraser.io/workspace/Hukb7RLy5KXlNMebJSP0

| Feature | Stories | Diagram |
|---|---|---|
| Tailored Recommendation Engine | US-11 | [open](https://app.eraser.io/workspace/Hukb7RLy5KXlNMebJSP0?diagram=gVwY8YJAnHFA3ndPoJ0f&layout=canvas) |
| Visit Capture | US-05, US-06 | [open](https://app.eraser.io/workspace/Hukb7RLy5KXlNMebJSP0?diagram=JLBmE8jN332jdLCAXBBd&layout=canvas) |
| Prioritisation Queue / Triage | US-07, US-08, US-09 | [open](https://app.eraser.io/workspace/Hukb7RLy5KXlNMebJSP0?diagram=XTWtqsQL3xuv01t9i4_D&layout=canvas) |
| GraphRAG Advisory | US-12 | [open](https://app.eraser.io/workspace/Hukb7RLy5KXlNMebJSP0?diagram=ZQgix39XJOubjZg9zXKP&layout=canvas) |
| Knowledge-Base Ingestion | US-18 | [open](https://app.eraser.io/workspace/Hukb7RLy5KXlNMebJSP0?diagram=2prLlfacPlHwNaG0r5ve&layout=canvas) |
| Follow-up & Re-prioritisation | US-13 | [open](https://app.eraser.io/workspace/Hukb7RLy5KXlNMebJSP0?diagram=CirmTSVK3fQ1gjbat2v6&layout=canvas) |
| Offline Capture & Sync | US-15 | [open](https://app.eraser.io/workspace/Hukb7RLy5KXlNMebJSP0?diagram=DvWCsei_wAnZ0wo03zTx&layout=canvas) |
| Risk Propagation Alerts | US-16 | [open](https://app.eraser.io/workspace/Hukb7RLy5KXlNMebJSP0?diagram=vaNZEr08e8k4jtTEUlxa&layout=canvas) |
| Caseload Map &amp; Heatmap | US-20 | [open](https://app.eraser.io/workspace/Hukb7RLy5KXlNMebJSP0?diagram=pfSFL_iygvEQs6nVq7Jd&layout=canvas) |

_Auth & Profile (US-01/02) and Farmer & Enterprise Registry (US-03/04) are standard CRUD flows and are omitted here; they can be added if reviewers want them._
