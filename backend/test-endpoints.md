# Suluhu Backend — Test Endpoints

Base URL: `http://localhost:3000/api`
Swagger: `http://localhost:3000/api/docs`

All protected endpoints require `Authorization: Bearer <JWT>` obtained from `POST /api/auth/login` or `POST /api/auth/register`. Replace `$TOKEN`, `$FARMER_ID`, `$ENTERPRISE_ID`, `$VISIT_ID`, `$RECO_ID`, `$AGENT_ID`, `$COOP_ID`, `$DOC_ID` with real values from prior responses.

---

## Auth

### Endpoint: `POST /api/auth/register`
Description: Register a new extension agent (sprint-1 open registration). Creates the agent, links the cooperative/county, and immediately returns a JWT.
Curl:
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Asha Wanjiru",
    "email": "asha@digicow.co.ke",
    "password": "changeme123",
    "county": "Kakamega",
    "cooperative": "Mumias Sugar Cooperative"
  }'
```
Response: Returns a freshly issued bearer token plus the public agent profile (id, name, email, role=agent, cooperativeId, county). Use the token for every subsequent authenticated request. Fails with 409 if the email is already taken.

### Endpoint: `POST /api/auth/login`
Description: Exchange email + password for a JWT.
Curl:
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"asha@digicow.co.ke","password":"changeme123"}'
```
Response: Returns the bearer token and the agent profile on success. Returns 401 with no body on bad credentials.

### Endpoint: `GET /api/auth/me`
Description: Current agent profile + caseload size (used by the PWA on boot).
Curl:
```bash
curl http://localhost:3000/api/auth/me -H "Authorization: Bearer $TOKEN"
```
Response: Returns the authenticated agent (id, name, email, role, cooperativeId, county) and a `caseloadSize` count of farmers assigned to them.

---

## Agents (supervisor / admin scope)

### Endpoint: `GET /api/agents`
Description: List agents. Admin sees the platform; supervisor is scoped to their own cooperative.
Curl:
```bash
curl http://localhost:3000/api/agents -H "Authorization: Bearer $TOKEN"
```
Response: Returns an array of public agent profiles. Supervisors without a cooperative get 403.

### Endpoint: `GET /api/agents/:id`
Description: Fetch one agent's profile + caseload size.
Curl:
```bash
curl http://localhost:3000/api/agents/$AGENT_ID -H "Authorization: Bearer $TOKEN"
```
Response: Returns the agent profile plus caseload size. 403 if a supervisor asks about an agent outside their cooperative; 404 if the agent doesn't exist.

### Endpoint: `PATCH /api/agents/:id/role`
Description: Change an agent's role. Admin only.
Curl:
```bash
curl -X PATCH http://localhost:3000/api/agents/$AGENT_ID/role \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"role":"supervisor"}'
```
Response: Returns the updated public agent record reflecting the new role. 404 if the agent doesn't exist.

---

## Cooperatives

### Endpoint: `GET /api/cooperatives`
Description: List every cooperative (open to any authenticated user).
Curl:
```bash
curl http://localhost:3000/api/cooperatives -H "Authorization: Bearer $TOKEN"
```
Response: Returns an array of cooperative summaries (id, name, county, agent count).

### Endpoint: `POST /api/cooperatives`
Description: Create a cooperative. Admin only.
Curl:
```bash
curl -X POST http://localhost:3000/api/cooperatives \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Kakamega Dairy Hub","county":"Kakamega"}'
```
Response: Returns the newly created cooperative node (id, name, county).

### Endpoint: `GET /api/cooperatives/:id/agents`
Description: List the agents inside a cooperative. Admin = any, supervisor = own coop only.
Curl:
```bash
curl http://localhost:3000/api/cooperatives/$COOP_ID/agents -H "Authorization: Bearer $TOKEN"
```
Response: Returns the cooperative metadata and an array of member agents. 403 if a supervisor targets another cooperative; 404 if the coop doesn't exist.

---

## Farmers (caseload)

### Endpoint: `POST /api/farmers`
Description: Register a farmer with at least one enterprise (dairy or sugarcane) into the calling agent's caseload.
Curl:
```bash
curl -X POST http://localhost:3000/api/farmers \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Otieno",
    "phone": "+254700000000",
    "gps": "0.2827,34.7519",
    "enterprises": [
      {
        "type": "Dairy",
        "animals": [
          {"breed":"Friesian","lactationStage":"mid","lastBreedingDate":"2026-03-01"}
        ]
      },
      {
        "type": "Sugarcane",
        "fields": [
          {"areaHa":1.5,"variety":"CO421","ratoonCycle":2,"plantingDate":"2025-04-10","lastTopDressedAt":"2026-01-15"}
        ]
      }
    ]
  }'
```
Response: Returns the full farmer node with nested enterprises and any assets (animals/fields) created during the same call.

### Endpoint: `GET /api/farmers`
Description: List the calling agent's caseload, ordered by oldest visit first (queue-friendly).
Curl:
```bash
curl http://localhost:3000/api/farmers -H "Authorization: Bearer $TOKEN"
```
Response: Returns an array of farmer summaries with last-visit timestamps so the PWA can highlight stale records.

### Endpoint: `GET /api/farmers/:id`
Description: Detailed farmer view with enterprises and assets.
Curl:
```bash
curl http://localhost:3000/api/farmers/$FARMER_ID -H "Authorization: Bearer $TOKEN"
```
Response: Returns the farmer plus their enterprises and assets. 404 if the farmer is not in the caller's caseload.

### Endpoint: `PATCH /api/farmers/:id`
Description: Update farmer profile fields with optimistic concurrency.
Curl:
```bash
curl -X PATCH http://localhost:3000/api/farmers/$FARMER_ID \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"John O. Otieno","phone":"+254711111111"}'
```
Response: Returns the updated farmer. 404 if not in caseload, 409 if a newer server version exists.

### Endpoint: `POST /api/farmers/:id/enterprises`
Description: Add a new enterprise to an existing farmer.
Curl:
```bash
curl -X POST http://localhost:3000/api/farmers/$FARMER_ID/enterprises \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "Dairy",
    "animals": [{"breed":"Ayrshire","lactationStage":"early"}]
  }'
```
Response: Returns the newly created enterprise plus the assets it was seeded with. 404 if the farmer isn't in caseload.

### Endpoint: `POST /api/farmers/:id/reassign`
Description: Move a farmer to another agent. Admin = anywhere, supervisor = within own coop.
Curl:
```bash
curl -X POST http://localhost:3000/api/farmers/$FARMER_ID/reassign \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"toAgentId":"'$AGENT_ID'"}'
```
Response: Returns the updated assignment metadata. 403 if a supervisor tries to reassign cross-cooperative; 404 if farmer or target agent missing.

---

## Visits

### Endpoint: `POST /api/farmers/:id/visits`
Description: Record a visit (idempotent when `visitId` is supplied — safe for offline replays).
Curl:
```bash
curl -X POST http://localhost:3000/api/farmers/$FARMER_ID/visits \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "visitId": "8e3e6e74-2f5a-4d3c-9a23-1234567890ab",
    "date": "2026-06-24T08:30:00Z",
    "enterpriseIds": ["'$ENTERPRISE_ID'"],
    "notes": "Cow off feed for 2 days; milk yield down ~20%.",
    "observations": [
      {"kind":"issue","text":"Suspected mastitis on rear-left quarter"},
      {"kind":"advice","text":"Strip-test and start broad-spectrum antibiotic if positive"}
    ]
  }'
```
Response: Returns the persisted visit with linked enterprises and structured observations. Re-sending the same `visitId` returns the original visit instead of creating a duplicate.

### Endpoint: `GET /api/farmers/:id/visits`
Description: List every visit recorded for a farmer.
Curl:
```bash
curl http://localhost:3000/api/farmers/$FARMER_ID/visits -H "Authorization: Bearer $TOKEN"
```
Response: Returns an array of visit records newest-first, each with notes, observations, and the enterprises it covered.

### Endpoint: `GET /api/visits/:id`
Description: Fetch a single visit by id.
Curl:
```bash
curl http://localhost:3000/api/visits/$VISIT_ID -H "Authorization: Bearer $TOKEN"
```
Response: Returns the visit record. 404 if the visit doesn't belong to the caller's caseload.

---

## Recommendations (smart queue)

### Endpoint: `GET /api/recommendations?status=pending`
Description: List the agent's recommendation queue. `status` can be `pending` (default), `done`, `dismissed`, `snoozed`, or `all`.
Curl:
```bash
curl "http://localhost:3000/api/recommendations?status=pending" \
  -H "Authorization: Bearer $TOKEN"
```
Response: Returns ranked recommendations with farmer reference, action text, human-readable reason, and rank score. 400 on an unknown status filter.

### Endpoint: `POST /api/recommendations/generate`
Description: Regenerate the queue — runs rule-based candidates, AI-ranks them, and persists new ones.
Curl:
```bash
curl -X POST http://localhost:3000/api/recommendations/generate \
  -H "Authorization: Bearer $TOKEN"
```
Response: Returns counts of how many recommendations were created, refreshed, or skipped, plus the new pending queue.

### Endpoint: `PATCH /api/recommendations/:id/status`
Description: Mark a recommendation done / dismissed / snoozed / pending.
Curl:
```bash
curl -X PATCH http://localhost:3000/api/recommendations/$RECO_ID/status \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status":"done"}'
```
Response: Returns the updated recommendation. 404 if not found in the caller's queue.

---

## Analytics (agent-personal)

### Endpoint: `GET /api/analytics/overview`
Description: Caseload totals, visit cadence summary, observation counts.
Curl:
```bash
curl http://localhost:3000/api/analytics/overview -H "Authorization: Bearer $TOKEN"
```
Response: Returns aggregate numbers (farmers, visits this week/month, open issues, etc.) for the agent dashboard.

### Endpoint: `GET /api/analytics/visit-cadence?days=90`
Description: Daily visit counts across a sliding window (1–365 days, default 90).
Curl:
```bash
curl "http://localhost:3000/api/analytics/visit-cadence?days=30" \
  -H "Authorization: Bearer $TOKEN"
```
Response: Returns an array of `{date, count}` points to drive the cadence chart.

### Endpoint: `GET /api/analytics/observation-trends?days=90`
Description: Weekly observation counts grouped by kind (observation/issue/advice).
Curl:
```bash
curl "http://localhost:3000/api/analytics/observation-trends?days=90" \
  -H "Authorization: Bearer $TOKEN"
```
Response: Returns weekly buckets each carrying per-kind counts for stacked-bar visualisation.

### Endpoint: `GET /api/analytics/farmer-health`
Description: Per-farmer status: active (≤14d), stale (15–30d), overdue (>30d), never.
Curl:
```bash
curl http://localhost:3000/api/analytics/farmer-health -H "Authorization: Bearer $TOKEN"
```
Response: Returns one row per farmer with their bucket and last-visit timestamp so the agent can triage neglected accounts.

---

## Sync (offline PWA)

### Endpoint: `POST /api/sync/push`
Description: Push a batch (1–200) of queued offline operations. Each carries a `clientId` for idempotency.
Curl:
```bash
curl -X POST http://localhost:3000/api/sync/push \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "operations": [
      {
        "clientId": "11111111-1111-1111-1111-111111111111",
        "kind": "visit.create",
        "clientUpdatedAt": "2026-06-24T08:30:00Z",
        "farmerId": "'$FARMER_ID'",
        "payload": {
          "enterpriseIds": ["'$ENTERPRISE_ID'"],
          "notes": "Routine check; no issues.",
          "observations": [{"kind":"observation","text":"Body condition score 3"}]
        }
      }
    ]
  }'
```
Response: Returns per-operation results tagged `applied`, `duplicate`, `conflict`, or `rejected`, plus the server entity id when applicable.

### Endpoint: `GET /api/sync/pull?since=ISO8601`
Description: Pull every farmer/enterprise/visit/observation in the caseload modified since the cursor. Omit `since` for a full snapshot.
Curl:
```bash
curl "http://localhost:3000/api/sync/pull?since=2026-06-20T00:00:00.000Z" \
  -H "Authorization: Bearer $TOKEN"
```
Response: Returns nested collections of farmers, enterprises, visits, observations modified after the cursor, plus a new `cursor` to use on the next pull.

### Endpoint: `GET /api/sync/status`
Description: Lightweight server time + caseload counters used to bootstrap the mobile client.
Curl:
```bash
curl http://localhost:3000/api/sync/status -H "Authorization: Bearer $TOKEN"
```
Response: Returns server timestamp and caseload counters so the PWA can decide whether to trigger a full pull.

---

## Advisory (GraphRAG)

### Endpoint: `POST /api/advisory/ask`
Description: Ask a grounded, cited question. Optionally scope to a farmer subgraph and/or enterprise.
Curl:
```bash
curl -X POST http://localhost:3000/api/advisory/ask \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "question":"What should I do for a Friesian cow with low milk yield and signs of mastitis?",
    "farmerId":"'$FARMER_ID'",
    "enterprise":"dairy"
  }'
```
Response: Returns the synthesised answer text, a confidence score, and an array of citations referencing the manual chunks used. The inquiry is persisted server-side for audit.

---

## Admin — Agents

### Endpoint: `GET /api/admin/agents`
Description: List every agent on the platform (admin only).
Curl:
```bash
curl http://localhost:3000/api/admin/agents -H "Authorization: Bearer $TOKEN"
```
Response: Returns the full agent roster as public agent records.

### Endpoint: `POST /api/admin/agents`
Description: Create an agent with an explicit role.
Curl:
```bash
curl -X POST http://localhost:3000/api/admin/agents \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name":"Peter Mwangi",
    "email":"peter@digicow.co.ke",
    "password":"changeme123",
    "county":"Kakamega",
    "cooperative":"Mumias Sugar Cooperative",
    "role":"supervisor"
  }'
```
Response: Returns the newly created public agent record. 409 if the email is taken.

### Endpoint: `GET /api/admin/agents/:id`
Description: Get any agent's profile + caseload size.
Curl:
```bash
curl http://localhost:3000/api/admin/agents/$AGENT_ID -H "Authorization: Bearer $TOKEN"
```
Response: Returns the agent profile plus caseload size. 404 if missing.

### Endpoint: `PATCH /api/admin/agents/:id/role`
Description: Change any agent's role.
Curl:
```bash
curl -X PATCH http://localhost:3000/api/admin/agents/$AGENT_ID/role \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"role":"agent"}'
```
Response: Returns the updated public agent record.

### Endpoint: `PATCH /api/admin/agents/:id/cooperative`
Description: Reassign an agent to another cooperative.
Curl:
```bash
curl -X PATCH http://localhost:3000/api/admin/agents/$AGENT_ID/cooperative \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"cooperative":"Kakamega Dairy Hub","county":"Kakamega"}'
```
Response: Returns the updated public agent record reflecting the new cooperative + county.

---

## Admin — Knowledge Base (GraphRAG ingestion)

### Endpoint: `POST /api/admin/kb/documents`
Description: Upload a reference document; server chunks (~800 chars w/ 120 overlap), embeds, and indexes it.
Curl:
```bash
curl -X POST http://localhost:3000/api/admin/kb/documents \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title":"KALRO Sugarcane Manual — Chapter 4 Fertilisation",
    "source":"KALRO Sugarcane Manual, 2019",
    "enterprise":"sugarcane",
    "text":"Top-dressing with CAN should occur 8 to 12 weeks after planting once weed control is complete. Apply 200 kg/ha split into two doses..."
  }'
```
Response: Returns the persisted document id, chunk count, and a citation-ready summary.

### Endpoint: `GET /api/admin/kb/documents`
Description: List uploaded KB documents with chunk counts.
Curl:
```bash
curl http://localhost:3000/api/admin/kb/documents -H "Authorization: Bearer $TOKEN"
```
Response: Returns an array of document summaries (id, title, source, enterprise, chunkCount, createdAt).

### Endpoint: `GET /api/admin/kb/documents/:id/chunks`
Description: List the chunks created for a document.
Curl:
```bash
curl http://localhost:3000/api/admin/kb/documents/$DOC_ID/chunks \
  -H "Authorization: Bearer $TOKEN"
```
Response: Returns the ordered chunks (id, text, index) for inspection.

### Endpoint: `DELETE /api/admin/kb/documents/:id`
Description: Delete a document and its chunks.
Curl:
```bash
curl -X DELETE http://localhost:3000/api/admin/kb/documents/$DOC_ID \
  -H "Authorization: Bearer $TOKEN"
```
Response: Returns a confirmation payload with the deleted document id and chunk count. 404 if missing.

---

## Admin — Platform Analytics

### Endpoint: `GET /api/admin/analytics/overview`
Description: Platform totals — agents, farmers, visits, KB docs, adoption metrics.
Curl:
```bash
curl http://localhost:3000/api/admin/analytics/overview -H "Authorization: Bearer $TOKEN"
```
Response: Returns aggregate platform counters used on the admin dashboard.

### Endpoint: `GET /api/admin/analytics/agents`
Description: Per-agent caseload + visit volumes for ranking.
Curl:
```bash
curl http://localhost:3000/api/admin/analytics/agents -H "Authorization: Bearer $TOKEN"
```
Response: Returns one row per agent with caseload size, visits this week/month, and ranking score.

### Endpoint: `GET /api/admin/analytics/demand`
Description: Aggregated input demand across all agents (e.g. requested fertiliser, feed, veterinary inputs).
Curl:
```bash
curl http://localhost:3000/api/admin/analytics/demand -H "Authorization: Bearer $TOKEN"
```
Response: Returns one row per input type with the total demand quantity to drive procurement planning.
