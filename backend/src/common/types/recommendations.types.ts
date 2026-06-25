export const RECOMMENDATION_KINDS = [
  'overdue_visit',
  'first_visit',
  'issue_followup',
  'advice_followup',
] as const;

export type RecommendationKind = (typeof RECOMMENDATION_KINDS)[number];

export const RECOMMENDATION_STATUSES = [
  'pending',
  'done',
  'dismissed',
  'snoozed',
] as const;

export type RecommendationStatus = (typeof RECOMMENDATION_STATUSES)[number];

export interface RecommendationCandidate {
  kind: RecommendationKind;
  farmerId: string;
  farmerName: string;
  reason: string;
  priority: number; // 0..100, higher = more urgent
  dedupeKey: string;
  context: Record<string, unknown>;
}

export interface RankedRecommendation extends RecommendationCandidate {
  rationale: string;
}

export interface Recommendation {
  id: string;
  kind: RecommendationKind;
  reason: string;
  rationale: string;
  priority: number;
  status: RecommendationStatus;
  dedupeKey: string;
  createdAt: string;
  updatedAt: string;
  farmer: { id: string; name: string; phone: string | null };
}
