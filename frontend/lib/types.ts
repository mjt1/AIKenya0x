// Mirrors the backend public DTOs. Keep in sync with the NestJS contract
// until we generate a client from OpenAPI.

export type Role = "agent" | "admin" | (string & {});

export interface PublicAgent {
  id: string;
  name: string;
  email: string;
  county: string;
  role: Role;
}

export interface AgentProfile {
  agent: PublicAgent;
  caseloadSize: number;
}

export interface AuthTokenResponse {
  access_token: string;
  agent: PublicAgent;
}

export interface LoginInput {
  email: string;
  password: string;
}

/* --------------------------- recommendations / queue --------------------------- */

export const RECOMMENDATION_KINDS = [
  "overdue_visit",
  "first_visit",
  "issue_followup",
  "advice_followup",
] as const;
export type RecommendationKind =
  | (typeof RECOMMENDATION_KINDS)[number]
  | (string & {});

export const RECOMMENDATION_STATUSES = [
  "pending",
  "done",
  "partly_done",
  "not_done",
  "dismissed",
  "snoozed",
] as const;
export type RecommendationStatus = (typeof RECOMMENDATION_STATUSES)[number];

export interface RecommendationFarmer {
  id: string;
  name: string;
  phone: string | null;
}

export interface Recommendation {
  id: string;
  kind: RecommendationKind;
  /** Rule-based human-readable reason, e.g. "Last visit was 42 days ago". */
  reason: string;
  /** One-line AI rationale enriching the reason. */
  rationale: string;
  /** 0-100, higher = more urgent. */
  priority: number;
  status: RecommendationStatus;
  /** Free-text outcome note recorded when the rec is resolved (US-13). */
  note: string | null;
  dedupeKey: string;
  createdAt: string;
  updatedAt: string;
  farmer: RecommendationFarmer;
}

export interface GenerateQueueResult {
  generated: number;
  created: number;
  skipped: number;
  queue: Recommendation[];
}

/* ------------------------------ farmers / visits ------------------------------ */

export type EnterpriseType = "Dairy" | "Sugarcane" | (string & {});

export interface FarmerListItem {
  id: string;
  name: string;
  gps: string | null;
  phone: string;
  lastVisitedAt: string | null;
}

export interface Enterprise {
  id: string;
  type: EnterpriseType;
  animals?: Record<string, unknown>[];
  fields?: Record<string, unknown>[];
}

export interface FarmerDetail {
  id: string;
  name: string;
  gps: string | null;
  phone: string;
  lastVisitedAt: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  enterprises: Enterprise[];
}

export type ObservationKind = "observation" | "issue" | "advice";

export interface Observation {
  id: string;
  kind: ObservationKind | (string & {});
  text: string;
  capturedAt?: string;
}

export interface VisitEnterprise {
  id: string;
  type: EnterpriseType;
}

export interface Visit {
  id: string;
  date: string;
  agentId: string;
  notes?: string | null;
  createdAt?: string;
  updatedAt?: string;
  farmer?: { id: string; name: string };
  observations: Observation[];
  enterprises: VisitEnterprise[];
}

export interface CreateVisitInput {
  enterpriseIds: string[];
  notes: string;
  date?: string;
  visitId?: string;
  observations?: { kind: ObservationKind; text: string }[];
}

/* --------------------------- farmer registry (create) -------------------------- */

export interface AnimalInput {
  breed: string;
  lactationStage?: string;
  lastBreedingDate?: string;
}

export interface FieldInput {
  areaHa: number;
  variety: string;
  ratoonCycle?: number;
  plantingDate?: string;
  lastTopDressedAt?: string;
}

export interface EnterpriseInput {
  type: "Dairy" | "Sugarcane";
  animals?: AnimalInput[];
  fields?: FieldInput[];
}

export interface CreateFarmerInput {
  name: string;
  phone: string;
  gps?: string;
  enterprises: EnterpriseInput[];
}

/* ---------------------------------- advisory ---------------------------------- */

export interface AskAdvisoryInput {
  question: string;
  farmerId?: string;
  enterprise?: "dairy" | "sugarcane";
}

export interface AdvisoryCitation {
  chunkId: string;
  source: string;
  title: string | null;
  snippet: string;
  /** Cosine similarity from the vector search (higher = closer). */
  score: number;
}

export interface AdvisoryAnswer {
  inquiryId: string;
  question: string;
  answer: string;
  /** True when the assistant defers to a vet/agronomist (low confidence / high risk). */
  deferred: boolean;
  rationale: string | null;
  citations: AdvisoryCitation[];
  farmer: { id: string; name: string } | null;
}
