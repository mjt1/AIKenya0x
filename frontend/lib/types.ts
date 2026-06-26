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
  "risk_alert",
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

export type AdvisoryConfidence = "HIGH" | "MEDIUM" | "LOW" | (string & {});

/** A specific input the agent should carry on the next visit (US-11). */
export interface AdvisoryInput {
  name: string;
  quantity?: string | null;
  unit?: string | null;
  notes?: string | null;
}

export interface AdvisoryAnswer {
  inquiryId: string;
  question: string;
  answer: string;
  /** Model confidence in the grounded answer. */
  confidence: AdvisoryConfidence;
  /** True when the assistant defers to a vet/agronomist (low confidence / high risk). */
  deferred: boolean;
  /** Why a referral was advised (present when deferred). */
  referralReason: string | null;
  /** Ordered concrete steps for the agent (US-11). */
  actionItems: string[];
  /** Specific inputs to carry on the next visit (US-11). */
  inputsNeeded: AdvisoryInput[];
  rationale: string | null;
  citations: AdvisoryCitation[];
  farmer: { id: string; name: string } | null;
}

/* ----------------------------------- admin ----------------------------------- */

export interface CreateAgentInput {
  name: string;
  email: string;
  password: string;
  county: string;
  role?: Role;
}

export interface UpdateAgentRoleInput {
  id: string;
  role: Role;
}

/** GET /admin/analytics/overview (US-19). */
export interface AdminAnalyticsOverview {
  totalAgents: number;
  totalFarmers: number;
  totalVisits: number;
  visitsThisWeek: number;
  visitsThisMonth: number;
  totalRecommendations: number;
  recsDone: number;
  recsPartlyDone: number;
  /** (recsDone + recsPartlyDone) / totalRecommendations, 0..1. */
  adoptionRate: number;
  totalKbDocuments: number;
}

/** GET /admin/analytics/agents (US-19). */
export interface AdminAgentRollup {
  id: string;
  name: string;
  email: string;
  role: Role;
  caseloadSize: number;
  totalVisits: number;
  visitsLast30d: number;
}

/* ------------------------------ knowledge base (US-18) ------------------------------ */

export interface KbDocument {
  id: string;
  title: string;
  source: string;
  enterprise: string | null;
  chunkCount: number;
  createdAt: string | null;
}

export interface KbChunk {
  id: string;
  text: string;
  source: string;
  title: string | null;
  enterprise: string | null;
  ordinal: number;
}

export interface UploadDocumentInput {
  title: string;
  source: string;
  text: string;
  enterprise?: "dairy" | "sugarcane";
}

/** Multipart upload: the document body is the file itself (PDF or text). */
export interface UploadDocumentFileInput {
  file: File;
  title: string;
  source: string;
  enterprise?: "dairy" | "sugarcane";
}

export interface KbUploadResult {
  id: string;
  chunkCount: number;
}

export interface KbDeleteResult {
  id: string;
  deletedChunks: number;
}
