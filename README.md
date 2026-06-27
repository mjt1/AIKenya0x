# Suluhu — Farmer-Intelligence Copilot

Suluhu turns an agricultural extension agent's scattered field knowledge into a
daily, **ranked, explainable action plan**. It's built for the DigiCow Africa /
Kenya AI Challenge brief, scoped to mixed **dairy + sugarcane** smallholdings in
Western Kenya, and is enterprise-agnostic by design.

Core loop: **Capture → Prioritise → Tailor → Grounded Q&A → Follow-up.**

---

## Features

- **Auth & profile** — secure agent login; each agent sees only their caseload (`agent` / `admin` roles).
- **Farmer & enterprise registry** — farmers with GPS, phone, and one or more enterprises (dairy → animals, sugarcane → fields).
- **Visit capture** — free-text notes auto-structured into observation / issue / advice by the AI service.
- **Prioritisation queue** — a deterministic Cypher score per farmer, **AI bounded re-rank** + rationale on top, with human-readable reasons.
- **Farmer detail + tailored recommendations** — dual-enterprise timeline; recommended action + the input to carry.
- **GraphRAG advisory** — grounded, **cited** Q&A over uploaded manuals + the farmer's subgraph; defers to a vet/agronomist when unsure.
- **Follow-up & outcome logging** — mark recommendations done / partly done / not done; feeds the next ranking cycle.
- **Caseload map & heatmap** — every farmer plotted by priority band; pins ⇆ heatmap toggle; enhanced per-pin tooltip.
- **Risk propagation** — contagious issues boost nearby farmers in the queue.
- **Offline-first PWA** — capture and read offline; idempotent sync on reconnect.
- **Admin** — manage agents, the knowledge base (upload/curate docs, incl. PDF), and analytics.
- **Sensors (foundation)** — register IoT sensors per farmer and stream readings via a token-authed webhook.

---

## Architecture

Three independent services. The backend is the **only** writer of Neo4j and the
**only** caller of the AI service.

```
            ┌─────────────┐     REST/HTTPS      ┌──────────────┐     Bolt      ┌─────────┐
 Browser ──▶│  Frontend   │────────────────────▶│   Backend    │──────────────▶│  Neo4j  │
   (PWA)    │  Next.js    │                      │   NestJS     │               │  graph  │
            └─────────────┘                      └──────┬───────┘               └─────────┘
                                                        │ JSON (fetch)
                                                        ▼
                                                 ┌──────────────┐
                                                 │  AI service  │  Featherless LLM
                                                 │   FastAPI    │  + bge-small embeddings
                                                 └──────────────┘
```

| Service  | Stack                         | Port  | Notes |
|----------|-------------------------------|-------|-------|
| frontend | Next.js (PWA), TypeScript, Tailwind, TanStack Query | 3000 | offline capture + sync |
| backend  | NestJS (TypeScript), Neo4j driver, JWT/RBAC | 8080 | owns Neo4j; Swagger at `/api/docs` |
| ai       | Python / FastAPI, Featherless (OpenAI-compatible), sentence-transformers `bge-small-en-v1.5` (384-d) | 8001 | stateless inference; docs at `/docs` |
| neo4j    | Neo4j 5.x (graph + native vector index) | 7474 / 7687 | browser + Bolt |

---

## Repository layout

```
.
├── frontend/                 # Next.js PWA   (Dockerfile, Dockerfile.prod)
├── backend/                  # NestJS API    (Dockerfile.dev, Dockerfile.prod)
├── ai/                       # FastAPI AI    (Dockerfile)
├── docker-compose.yml        # prod-ish stack (bundled neo4j + all services)
├── docker-compose.dev.yml    # dev stack (hot reload)
└── PRD.md                    # product requirements
```

---

## Prerequisites

- **Docker path:** Docker + Docker Compose, and a **Featherless API key**.
- **Manual path:** Node 20+, [Yarn] (backend), Python 3.11+, a **Neo4j 5.x** instance
  (local container or Neo4j AuraDB; 5.23+ recommended for the queue's scoped Cypher),
  and a **Featherless API key**.

> The AI service **requires** `FEATHERLESS_API_KEY` to boot. Without it, note
> structuring / advisory / ranking fail and the backend silently uses
> deterministic fallbacks.

---

## Configuration

Each service reads its own `.env`. Minimum vars:

**`ai/.env`**
```dotenv
FEATHERLESS_API_KEY=sk-...                 # required
FEATHERLESS_BASE_URL=https://api.featherless.ai/v1
FEATHERLESS_CHAT_MODEL=meta-llama/Meta-Llama-3.1-8B-Instruct
FEATHERLESS_ADVISORY_MODEL=meta-llama/Llama-3.3-70B-Instruct
# LLM_MAX_TOKENS=2048                       # raise for reasoning (<think>) models
```

**`backend/.env`**
```dotenv
# Local container (compose) OR AuraDB (neo4j+s://...)
NEO4J_URI=neo4j://localhost:7687
NEO4J_USERNAME=neo4j
NEO4J_PASSWORD=changeme
NEO4J_DATABASE=neo4j
AI_SERVICE_URL=http://localhost:8001
JWT_SECRET=change-me-in-prod
# PORT=8080
```

**`frontend/.env`**
```dotenv
NEXT_PUBLIC_API_URL=http://localhost:8080
```

> In Docker, the compose files set `NEO4J_*` and `AI_SERVICE_URL` for you
> (pointing at the bundled `neo4j` and `ai` containers), overriding `backend/.env`.

---

## Quick start — Docker (recommended)

```bash
# 1. Set your Featherless key (and any model overrides)
cp ai/.env.example ai/.env            # or create ai/.env
$EDITOR ai/.env                        # set FEATHERLESS_API_KEY

# 2. Bring up the whole stack (Neo4j + AI + backend + frontend)
docker compose up -d --build
```

Then open:

| URL | What |
|-----|------|
| http://localhost:3000 | the app |
| http://localhost:8080/api/docs | backend Swagger / OpenAPI |
| http://localhost:8001/docs | AI service docs |
| http://localhost:7474 | Neo4j Browser (`neo4j` / `changeme`) |

Notes:
- The **first AI build is slow** — it bakes the embedding model into the image.
- Data persists in the `neo4j_data` volume. Change `NEO4J_AUTH` + the backend
  `NEO4J_PASSWORD` together for anything real.
- **Dev (hot reload):** `docker compose -f docker-compose.dev.yml up --build`
- Tear down: `docker compose down` (add `-v` to wipe the database volume).

---

## Quick start — Manual (no Docker)

Run a **Neo4j 5.x** first (local install or AuraDB), then start the services in
this order. Use four terminals.

**1. AI service**
```bash
cd ai
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
# ai/.env must contain FEATHERLESS_API_KEY
uvicorn app.main:app --reload --host 0.0.0.0 --port 8001
```

**2. Backend** (point `NEO4J_*` at your DB, `AI_SERVICE_URL=http://localhost:8001`)
```bash
cd backend
yarn install
yarn start:dev          # watch mode on :8080
```

**3. Frontend** (`NEXT_PUBLIC_API_URL=http://localhost:8080`)
```bash
cd frontend
npm install             # or yarn / pnpm
npm run dev             # :3000
```

Production builds: backend `yarn build && yarn start:prod`; frontend
`npm run build && npm start`; AI `uvicorn app.main:app --host 0.0.0.0 --port 8001`.

---

## First run

1. Create the first **agent** account (admin) via the backend CLI:
   ```bash
   # Docker:
   docker compose exec backend node dist/cli   # see available commands
   # Manual:
   cd backend && yarn cli
   ```
2. Log in at `http://localhost:3000`.
3. As **admin**, upload a reference doc under **Knowledge base** (text or PDF) so
   advisory answers have something to cite. (Re-upload after the embedding model
   is live so chunks get real vectors.)
4. Register a farmer, capture a visit, then open **Daily Queue**.

---

## Deployment note (HTTPS)

The browser's geolocation ("use my location") and the PWA service worker need a
**secure context**. On a public IP with no domain, use a magic-DNS hostname
(`<ip>.sslip.io`) behind Caddy for an auto Let's Encrypt cert, or a Cloudflare
Tunnel — a bare-IP self-signed cert still trips the browser warning. Serve the
app + API under **one HTTPS origin** and set `NEXT_PUBLIC_API_URL` to it to avoid
mixed-content errors.

---

## Handy commands

| Task | Command |
|------|---------|
| Backend type-check | `cd backend && npx tsc --noEmit -p tsconfig.json` |
| Frontend type-check | `cd frontend && npx tsc --noEmit` |
| Rebuild one service | `docker compose build backend && docker compose up -d backend` |
| Tail logs | `docker compose logs -f backend` |

---

## Acknowledgements

Knowledge base grounded in public agronomy/veterinary material (e.g. KALRO
manuals, ILRI dairy guides). Built for the DigiCow Africa · Kenya AI Challenge.
