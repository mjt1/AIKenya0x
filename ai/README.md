# Suluhu AI Service

> Stateless AI inference microservice for the Suluhu farmer-intelligence copilot.  

---

## What it does

The AI service provides four stateless inference capabilities used by the backend:

| Endpoint | Method | Purpose |
| --- | --- | --- |
| `/structure-note` | POST | Convert free-text agent field notes → structured Observation / Issue / Advice |
| `/classify` | POST | Classify an observation into a precise dairy/sugarcane category with severity + contagion flag |
| `/embed` | POST | Generate dense embedding vectors for Neo4j vector index (KB ingestion + query embedding) |
| `/advisory/ask` | POST | GraphRAG grounded Q&A — cited answer from retrieved manual chunks + farmer subgraph |
| `/health` | GET | Service liveness check |

**This service owns no database.** All Neo4j access lives in the NestJS backend, which sends context payloads here.

---

## Architecture

```
NestJS Backend
    │
    ├─ POST /structure-note   →  NoteStructurerService  →  Featherless (chat model)
    ├─ POST /classify         →  ClassifierService       →  Featherless (chat model)
    ├─ POST /embed            →  EmbedderService         →  sentence-transformers (local)
    └─ POST /advisory/ask     →  AdvisoryService         →  Featherless (advisory model)
```

**Featherless AI** (OpenAI-compatible API) drives all LLM calls.  
**BAAI/bge-small-en-v1.5** runs locally via `sentence-transformers` for consistent, fast embeddings (384-dim).

---

## Project Structure

```
suluhu-ai/
├── app/
│   ├── main.py            # FastAPI app, middleware, lifespan
│   ├── config.py          # Settings (pydantic-settings, .env)
│   ├── dependencies.py    # Singleton service providers
│   ├── models/
│   │   ├── requests.py    # Pydantic v2 request DTOs
│   │   └── responses.py   # Pydantic v2 response DTOs
│   ├── services/
│   │   ├── llm_client.py      # Featherless API wrapper (retry logic)
│   │   ├── embedder.py        # sentence-transformers embedding service
│   │   ├── note_structurer.py # Visit note → structured fields
│   │   ├── classifier.py      # Observation → category / severity / contagion
│   │   └── advisory.py        # GraphRAG answer generation + safety layer
│   ├── routers/
│   │   ├── structure.py   # POST /structure-note
│   │   ├── classify.py    # POST /classify
│   │   ├── embed.py       # POST /embed
│   │   └── advisory.py    # POST /advisory/ask
│   └── prompts/
│       ├── structure_prompts.py   # Kenya dairy + sugarcane note structuring prompts
│       ├── classify_prompts.py    # Issue classification prompt (24 categories)
│       └── advisory_prompts.py    # GraphRAG system prompt + context builder
├── requirements.txt
├── .env.example
├── Dockerfile
└── README.md
```

---

## Quick Start

### 1. Clone and install

```bash
git clone <repo>
cd suluhu-ai

python -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

### 2. Configure environment

```bash
cp .env.example .env
# Edit .env and fill in FEATHERLESS_API_KEY
```

### 3. Run

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8001
```

Interactive docs: [http://localhost:8001/docs](http://localhost:8001/docs)

### 4. Docker

```bash
docker build -t suluhu-ai .
docker run -p 8001:8001 --env-file .env suluhu-ai
```

---

## Endpoints

### `POST /structure-note`

Converts a raw agent field note into structured Observation / Issue / Advice nodes.

**Request:**
```json
{
  "raw_note": "Ng'ombe 3 ana maziwa kidogo, 4L badala ya 8L. Udder ya quarter ya kulia ina joto. CMT test positive. Nilimshauri mkulima kuanza intramammary.",
  "farmer_id": "farmer_abc123",
  "enterprise_types": ["DAIRY"],
  "agent_language_hint": "sw"
}
```

**Response:**
```json
{
  "observation": "Cow 3 producing 4L instead of usual 8L. Right quarter warm. CMT positive.",
  "issues": [
    {
      "text": "Mastitis suspected in right quarter of cow 3",
      "enterprise": "DAIRY",
      "severity": "HIGH",
      "contagious_flag": true
    }
  ],
  "advice": [
    {
      "text": "Start intramammary antibiotic treatment; separate cow from herd",
      "enterprise": "DAIRY"
    }
  ],
  "enterprise_tags": ["DAIRY"],
  "follow_up_required": true,
  "raw_note_language": "sw",
  "model_used": "meta-llama/Meta-Llama-3.1-8B-Instruct"
}
```

---

### `POST /classify`

Classifies an observation into a precise category for prioritisation and routing.

**Request:**
```json
{
  "observation_text": "Sugarcane field shows whip-like black structures emerging from the growing point on about 30% of stalks.",
  "enterprise_type": "SUGARCANE",
  "farmer_id": "farmer_xyz789",
  "recent_issues": []
}
```

**Response:**
```json
{
  "category": "SMUT_SUSPECTED",
  "severity": "CRITICAL",
  "confidence": 0.94,
  "enterprise_route": "SUGARCANE",
  "contagious": true,
  "tags": ["smut", "sporisorium-scitamineum", "notifiable", "KALRO"],
  "reasoning": "Whip-shaped black spore mass from growing point is the classic sign of sugarcane smut (Sporisorium scitamineum). Affects 30% of stand — CRITICAL. Notifiable to Kenya Plant Health Inspectorate Service (KEPHIS).",
  "model_used": "meta-llama/Meta-Llama-3.1-8B-Instruct"
}
```

---

### `POST /embed`

Generates embedding vectors for Neo4j vector index storage or query embedding.

**Request:**
```json
{
  "texts": [
    "Top-dress sugarcane with CAN at 5 bags per acre at 3 months after planting.",
    "Treat mastitis with intramammary antibiotic for 3 consecutive milkings."
  ],
  "normalise": true
}
```

**Response:**
```json
{
  "embeddings": [[0.021, -0.043, ...], [0.018, 0.092, ...]],
  "dim": 384,
  "model_used": "BAAI/bge-small-en-v1.5",
  "normalised": true
}
```

---

### `POST /advisory/ask`

GraphRAG grounded Q&A. The backend embeds the query, runs Neo4j vector search,
assembles the context, and sends it here for answer generation.

**Request (abbreviated):**
```json
{
  "query": "My sugarcane is yellowing at 4 months, what should I do?",
  "farmer_context": {
    "farmer_id": "farmer_xyz789",
    "farmer_name": "John Wafula",
    "location": "Malava",
    "county": "Kakamega",
    "enterprise_types": ["SUGARCANE"],
    "fields": [
      {
        "field_id": "field_001",
        "area_ha": 1.5,
        "variety": "N14",
        "ratoon_cycle": 1,
        "months_since_planting": 4,
        "last_top_dressed_at": null
      }
    ],
    "recent_issues": []
  },
  "retrieved_chunks": [
    {
      "chunk_id": "chunk_042",
      "source": "KALRO Sugarcane Production Manual 2021",
      "page": "p.34",
      "text": "Top-dress with CAN (26% N) at a rate of 5 bags (50 kg each) per acre between 3 and 5 months after planting...",
      "similarity_score": 0.91
    }
  ],
  "enterprise_type": "SUGARCANE",
  "top_k_used": 5
}
```

**Response:**
```json
{
  "answer": "The yellowing in John's N14 field at 4 months most likely indicates nitrogen deficiency — the crop is in its active growth phase and hasn't been top-dressed yet. According to KALRO guidance, CAN should be applied between months 3–5. Apply 5 bags of CAN (50 kg each) per acre as soon as possible to prevent further yield loss.",
  "citations": [
    {
      "chunk_id": "chunk_042",
      "source": "KALRO Sugarcane Production Manual 2021",
      "page": "p.34",
      "relevance": "Provides top-dressing rate and timing for CAN application"
    }
  ],
  "confidence": "HIGH",
  "referral_needed": false,
  "referral_reason": null,
  "action_items": [
    "Purchase 7.5 bags of CAN (50 kg) — sufficient for 1.5 ha",
    "Apply CAN evenly in the inter-row furrow and cover lightly with soil",
    "Record top-dressing date in Suluhu",
    "Return in 2 weeks to assess leaf colour recovery"
  ],
  "inputs_needed": [
    {
      "name": "CAN Fertiliser (26% N)",
      "quantity": "7.5",
      "unit": "bags (50 kg)",
      "notes": "Apply at 5 bags/acre in inter-row furrows at 4 months"
    }
  ],
  "model_used": "meta-llama/Llama-3.3-70B-Instruct"
}
```

---

## Supported Issue Categories

### Dairy (18 categories)
`MASTITIS` · `FOOT_ROT` · `MILK_DROP` · `REPRODUCTIVE_ISSUE` · `FEED_DEFICIENCY` · `TICK_INFESTATION` · `RESPIRATORY_DISEASE` · `SKIN_CONDITION` · `BLOAT` · `CALVING_COMPLICATION` · `BRUCELLOSIS_SUSPECTED`* · `OTHER_DAIRY`

### Sugarcane (13 categories)
`TOP_DRESSING_NEEDED` · `SMUT_SUSPECTED`* · `RATOON_STUNTING_DISEASE`* · `LODGING` · `WATERLOGGING` · `STALK_BORER` · `YELLOW_LEAF_SYNDROME`* · `WEED_PRESSURE` · `HARVEST_WINDOW` · `TRASH_MANAGEMENT` · `NITROGEN_DEFICIENCY` · `PHOSPHORUS_DEFICIENCY` · `POTASSIUM_DEFICIENCY` · `OTHER_SUGARCANE`

*Notifiable disease — always triggers `contagious: true` and `referral_needed: true`.

---

## Safety Architecture

| Rule | Implementation |
|---|---|
| No fabricated quantities | System prompt explicitly forbids invention; only retrieved chunk content used |
| All claims cited | Each advisory answer maps to chunk IDs from retrieved_chunks |
| Notifiable disease referral | Hard-coded override in `advisory.py` — no LLM output can suppress it |
| Low confidence referral | `confidence: LOW` always sets `referral_needed: true` |
| No chunk → forced LOW | If `retrieved_chunks` is empty, confidence is forced to LOW before LLM call |
| Contagion flag | Certain categories always set `contagious: true` regardless of LLM output |

---

## Configuration Reference

See `.env.example` for all settings. Key ones:

| Variable | Default | Notes |
|---|---|---|
| `FEATHERLESS_API_KEY` | required | Get from featherless.ai dashboard |
| `FEATHERLESS_CHAT_MODEL` | `meta-llama/Meta-Llama-3.1-8B-Instruct` | For structuring + classification |
| `FEATHERLESS_ADVISORY_MODEL` | `meta-llama/Llama-3.3-70B-Instruct` | For advisory answers |
| `EMBEDDING_MODEL` | `BAAI/bge-small-en-v1.5` | Must match Neo4j vector index dim |
| `EMBEDDING_DIM` | `384` | Must match model output dim |
| `REFERRAL_CONFIDENCE_THRESHOLD` | `0.55` | Below this → referral triggered |
| `RATE_LIMIT_PER_MINUTE` | `60` | Per-IP rate limit |

---

## Adding a New Enterprise

1. Add categories to `classify_prompts.py` under the new enterprise heading.
2. Add vocabulary to `structure_prompts.py` ENTERPRISE KNOWLEDGE BASE section.
3. Add a new `EnterpriseType` enum value in `models/requests.py`.
4. No schema changes needed in Neo4j — the graph model is enterprise-agnostic by design.

---

## Production Notes

- Use `--workers 2` in Uvicorn only if the embedding model is loaded from a shared volume (avoid loading it twice in memory per worker). Default is 1 worker.
- Mount `/app/.cache/huggingface` as a persistent volume to avoid re-downloading the model on every deployment.
- Restrict `CORS allow_origins` to the backend's IP/domain in production.
- The `/docs` and `/redoc` endpoints can be disabled by setting `docs_url=None` in `main.py` for production.
=======

