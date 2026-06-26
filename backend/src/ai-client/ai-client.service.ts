import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type {
  RankedRecommendation,
  RecommendationCandidate,
} from '../common/types/recommendations.types';

export const EMBEDDING_DIM = 384;

/**
 * Max points the AI re-ranker may move a deterministic base priority up or down.
 * The backend re-clamps to this band regardless of what the AI returns, so the
 * deterministic Cypher score stays the anchor (bounded re-rank, PRD 2.3).
 */
export const RANK_MAX_ADJUSTMENT = 15;

/**
 * AI service enterprise enum is UPPERCASE (DAIRY | SUGARCANE | BOTH). The
 * backend's own EnterpriseType is PascalCase ('Dairy' | 'Sugarcane'), so map
 * before sending anything to the AI service.
 */
export type AiEnterpriseType = 'DAIRY' | 'SUGARCANE' | 'BOTH';

export function toAiEnterprise(value?: string | null): AiEnterpriseType {
  const s = (value ?? '').toLowerCase();
  if (s.startsWith('dairy')) return 'DAIRY';
  if (s.startsWith('sugar')) return 'SUGARCANE';
  return 'BOTH';
}

export type Severity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type ObservationKind = 'observation' | 'issue' | 'advice';
export interface StructuredObservation {
  kind: ObservationKind;
  text: string;
}

export interface StructuredIssue {
  text: string;
  enterprise: AiEnterpriseType;
  severity: Severity;
  contagious: boolean;
}

export interface StructureNoteInput {
  rawNote: string;
  farmerId: string;
  /** Backend-cased enterprise values are accepted and mapped internally. */
  enterpriseTypes?: string[];
  languageHint?: string;
}

export interface StructureNoteResult {
  /** Flattened observation/issue/advice list for the visit's Observation nodes. */
  observations: StructuredObservation[];
  /** Structured issues (severity + contagion) for :Issue node creation. */
  issues: StructuredIssue[];
  enterpriseTags: AiEnterpriseType[];
  followUpRequired: boolean;
  language: string;
}

export interface AdvisoryContextChunk {
  id: string;
  text: string;
  source: string;
  title?: string;
  score: number;
}

export interface AdvisoryFarmerContext {
  farmerId: string;
  farmerName: string;
  county?: string | null;
  enterpriseTypes: AiEnterpriseType[];
  lastVisitDate?: string | null;
  recentIssues?: { category: string; severity: string; status: string }[];
  recentAdvice?: string[];
}

export interface AdvisoryRequest {
  question: string;
  enterpriseType: AiEnterpriseType;
  contexts: AdvisoryContextChunk[];
  farmerContext?: AdvisoryFarmerContext | null;
}

export interface AdvisoryCitation {
  chunkId: string;
  source: string;
  page?: string | null;
  relevance?: string;
}

export interface AdvisoryInput {
  name: string;
  quantity?: string | null;
  unit?: string | null;
  notes?: string | null;
}

export interface AdvisoryAnswer {
  answer: string;
  citations: AdvisoryCitation[];
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  /** Mapped from the AI service's referral_needed. */
  deferred: boolean;
  referralReason?: string | null;
  actionItems: string[];
  inputsNeeded: AdvisoryInput[];
  rationale?: string;
}

/**
 * Client for the FastAPI AI service. Contracts mirror ai/app/models exactly
 * (snake_case payloads, UPPERCASE enterprise enums). Every method degrades to a
 * deterministic fallback when AI_SERVICE_URL is unset or the call fails, so the
 * app keeps working without the AI service.
 */
@Injectable()
export class AiClientService {
  private readonly logger = new Logger(AiClientService.name);
  constructor(private readonly config: ConfigService) {}

  private baseUrl(): string | undefined {
    return this.config.get<string>('AI_SERVICE_URL');
  }

  /** POST /structure-note — raw field note -> typed observation/issue/advice. */
  async structureNote(input: StructureNoteInput): Promise<StructureNoteResult> {
    const url = this.baseUrl();
    if (!url) return this.fallbackStructure(input);
    try {
      const enterpriseTypes =
        input.enterpriseTypes && input.enterpriseTypes.length
          ? input.enterpriseTypes.map(toAiEnterprise)
          : undefined;
      const res = await fetch(`${url}/structure-note`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          raw_note: input.rawNote,
          farmer_id: input.farmerId,
          ...(enterpriseTypes ? { enterprise_types: enterpriseTypes } : {}),
          agent_language_hint: input.languageHint ?? 'en',
        }),
      });
      if (!res.ok) throw new Error(`AI service returned ${res.status}`);
      const json = (await res.json()) as {
        observation: string;
        issues: {
          text: string;
          enterprise: AiEnterpriseType;
          severity: Severity;
          contagious_flag: boolean;
        }[];
        advice: { text: string; enterprise: AiEnterpriseType }[];
        enterprise_tags: AiEnterpriseType[];
        follow_up_required: boolean;
        raw_note_language: string;
      };
      const observations: StructuredObservation[] = [];
      if (json.observation?.trim()) {
        observations.push({
          kind: 'observation',
          text: json.observation.trim(),
        });
      }
      for (const i of json.issues ?? []) {
        observations.push({ kind: 'issue', text: i.text });
      }
      for (const a of json.advice ?? []) {
        observations.push({ kind: 'advice', text: a.text });
      }
      if (observations.length === 0) {
        // AI replied but with nothing usable — fall back so the visit still
        // shows structured notes rather than an empty result.
        return this.fallbackStructure(input);
      }
      return {
        observations,
        issues: (json.issues ?? []).map((i) => ({
          text: i.text,
          enterprise: i.enterprise,
          severity: i.severity,
          contagious: Boolean(i.contagious_flag),
        })),
        enterpriseTags: json.enterprise_tags ?? [],
        followUpRequired: Boolean(json.follow_up_required),
        language: json.raw_note_language ?? 'en',
      };
    } catch (err) {
      this.logger.warn(
        `AI structuring failed, using deterministic fallback: ${(err as Error).message}`,
      );
      return this.fallbackStructure(input);
    }
  }

  /**
   * Bounded re-rank (PRD 2.3 — the AI hosts the scorer behind the same
   * contract). POST /rank refines each deterministic candidate's priority
   * within RANK_MAX_ADJUSTMENT and returns a specific rationale. The
   * deterministic priority stays the anchor: every value is re-clamped here,
   * and any failure (or AI_SERVICE_URL unset) degrades to fallbackRank so the
   * queue never breaks.
   */
  async rankRecommendations(
    candidates: RecommendationCandidate[],
  ): Promise<RankedRecommendation[]> {
    const url = this.baseUrl();
    if (!url || candidates.length === 0) {
      return candidates.map((c) => this.fallbackRank(c));
    }
    try {
      const res = await fetch(`${url}/rank`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          candidates: candidates.map((c) => ({
            dedupe_key: c.dedupeKey,
            kind: c.kind,
            farmer_id: c.farmerId,
            farmer_name: c.farmerName,
            reason: c.reason,
            base_priority: c.priority,
            context: c.context ?? {},
          })),
          max_adjustment: RANK_MAX_ADJUSTMENT,
        }),
      });
      if (!res.ok) throw new Error(`AI service returned ${res.status}`);
      const json = (await res.json()) as {
        ranked?: {
          dedupe_key: string;
          priority: number;
          rationale?: string;
          confidence?: number | null;
        }[];
      };
      const byKey = new Map(
        (json.ranked ?? []).map((r) => [r.dedupe_key, r] as const),
      );
      return candidates.map((c) => {
        const r = byKey.get(c.dedupeKey);
        if (!r) return this.fallbackRank(c);
        const rationale = r.rationale?.trim();
        return {
          ...c,
          priority: this.boundPriority(c.priority, r.priority),
          rationale:
            rationale && rationale.length > 0
              ? rationale
              : this.fallbackRank(c).rationale,
        };
      });
    } catch (err) {
      this.logger.warn(
        `AI ranking failed, using deterministic fallback: ${(err as Error).message}`,
      );
      return candidates.map((c) => this.fallbackRank(c));
    }
  }

  /** Clamp an AI-proposed priority to base +/- RANK_MAX_ADJUSTMENT, within [0,100]. */
  private boundPriority(base: number, proposed: number): number {
    if (!Number.isFinite(proposed)) return base;
    const lo = Math.max(0, base - RANK_MAX_ADJUSTMENT);
    const hi = Math.min(100, base + RANK_MAX_ADJUSTMENT);
    return Math.round(Math.max(lo, Math.min(hi, proposed)));
  }

  /** POST /embed — single text -> one 384-d vector (batches a single item). */
  async embed(text: string): Promise<number[]> {
    const url = this.baseUrl();
    if (!url) return this.fallbackEmbed(text);
    try {
      const res = await fetch(`${url}/embed`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ texts: [text], normalise: true }),
      });
      if (!res.ok) throw new Error(`AI service returned ${res.status}`);
      const json = (await res.json()) as {
        embeddings: number[][];
        dim: number;
      };
      const vec = json.embeddings?.[0];
      if (!Array.isArray(vec) || vec.length !== EMBEDDING_DIM) {
        this.logger.warn(
          `AI /embed returned dim=${vec?.length}; expected ${EMBEDDING_DIM}. Using fallback.`,
        );
        return this.fallbackEmbed(text);
      }
      return vec;
    } catch (err) {
      this.logger.warn(
        `AI embedding failed, falling back to hash embedding: ${(err as Error).message}`,
      );
      return this.fallbackEmbed(text);
    }
  }

  /** POST /advisory/ask — grounded GraphRAG answer with citations + inputs. */
  async advisory(req: AdvisoryRequest): Promise<AdvisoryAnswer> {
    const url = this.baseUrl();
    if (!url) return this.fallbackAdvisory(req);
    const body = JSON.stringify({
      query: req.question,
      enterprise_type: req.enterpriseType,
      top_k_used: req.contexts.length,
      retrieved_chunks: req.contexts.map((c) => ({
        chunk_id: c.id,
        source: c.title ?? c.source,
        page: null,
        text: c.text,
        similarity_score: c.score,
      })),
      farmer_context: this.toFarmerContext(req),
    });
    try {
      const res = await fetch(`${url}/advisory/ask`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body,
      });
      if (!res.ok) throw new Error(`AI service returned ${res.status}`);
      const json = (await res.json()) as {
        answer: string;
        citations: {
          chunk_id: string;
          source: string;
          page?: string | null;
          relevance?: string;
        }[];
        confidence: 'HIGH' | 'MEDIUM' | 'LOW';
        referral_needed: boolean;
        referral_reason?: string | null;
        action_items?: string[];
        inputs_needed?: {
          name: string;
          quantity?: string | null;
          unit?: string | null;
          notes?: string | null;
        }[];
      };
      return {
        answer: json.answer,
        citations: (json.citations ?? []).map((c) => ({
          chunkId: c.chunk_id,
          source: c.source,
          page: c.page ?? null,
          relevance: c.relevance,
        })),
        confidence: json.confidence ?? 'MEDIUM',
        deferred: Boolean(json.referral_needed),
        referralReason: json.referral_reason ?? null,
        actionItems: json.action_items ?? [],
        inputsNeeded: json.inputs_needed ?? [],
        rationale: json.referral_reason ?? undefined,
      };
    } catch (err) {
      this.logger.warn(
        `AI advisory failed, falling back to stub: ${(err as Error).message}`,
      );
      return this.fallbackAdvisory(req);
    }
  }

  private toFarmerContext(req: AdvisoryRequest) {
    const fc = req.farmerContext;
    if (!fc) {
      return {
        farmer_id: '',
        farmer_name: 'General query',
        enterprise_types: [req.enterpriseType],
        animals: [],
        fields: [],
        recent_issues: [],
        recent_advice: [],
      };
    }
    return {
      farmer_id: fc.farmerId,
      farmer_name: fc.farmerName,
      county: fc.county ?? null,
      enterprise_types: fc.enterpriseTypes.length
        ? fc.enterpriseTypes
        : [req.enterpriseType],
      animals: [],
      fields: [],
      last_visit_date: fc.lastVisitDate ?? null,
      recent_issues: (fc.recentIssues ?? []).map((i) => ({
        category: i.category,
        severity: i.severity,
        status: i.status,
      })),
      recent_advice: fc.recentAdvice ?? [],
    };
  }

  /**
   * Deterministic note structuring used when the AI service is unavailable.
   * Splits the note into clauses and classifies each as advice / issue /
   * observation by keyword, seeding :Issue candidates with a severity + a
   * contagion guess. Lower quality than the LLM, but the capture flow always
   * returns usable structured notes instead of just echoing the raw text.
   */
  private fallbackStructure(input: StructureNoteInput): StructureNoteResult {
    const raw = input.rawNote.trim();
    const enterpriseTags = (input.enterpriseTypes ?? []).map(toAiEnterprise);
    const primary: AiEnterpriseType = enterpriseTags[0] ?? 'BOTH';

    const ADVICE = [
      'advis',
      'recommend',
      'should',
      'apply',
      'give',
      'administer',
      'top-dress',
      'topdress',
      'vaccinat',
      'deworm',
      'treat',
      'spray',
      'isolat',
      'separat',
      'refer',
      'monitor',
      'follow up',
      'schedule',
    ];
    const ISSUE = [
      'down',
      'drop',
      'low',
      'sick',
      'swollen',
      'lame',
      'limp',
      'cough',
      'fever',
      'dead',
      'dying',
      'positive',
      'mastitis',
      'infect',
      'disease',
      'pest',
      'borer',
      'smut',
      'wilt',
      'yellow',
      'deficien',
      'lesion',
      'wound',
      'bloat',
      'abort',
      'retained',
      'off feed',
      'not eating',
      'reduced',
      'loss',
    ];
    const CONTAGIOUS = [
      'mastitis',
      'foot rot',
      'smut',
      'brucell',
      'lumpy',
      'fmd',
      'notifiable',
      'contagious',
      'outbreak',
    ];

    const has = (text: string, words: string[]): boolean => {
      const lower = text.toLowerCase();
      return words.some((w) => lower.includes(w));
    };

    const parts = raw
      .split(/[\n.!?]+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    const observations: StructuredObservation[] = [];
    const issues: StructuredIssue[] = [];

    for (const s of parts) {
      if (has(s, ADVICE)) {
        observations.push({ kind: 'advice', text: s });
      } else if (has(s, ISSUE)) {
        observations.push({ kind: 'issue', text: s });
        const contagious = has(s, CONTAGIOUS);
        issues.push({
          text: s,
          enterprise: primary,
          severity: contagious ? 'HIGH' : 'MEDIUM',
          contagious,
        });
      } else {
        observations.push({ kind: 'observation', text: s });
      }
    }

    if (observations.length === 0) {
      observations.push({ kind: 'observation', text: raw });
    }

    return {
      observations,
      issues,
      enterpriseTags,
      followUpRequired: issues.length > 0,
      language: input.languageHint ?? 'en',
    };
  }

  private fallbackRank(c: RecommendationCandidate): RankedRecommendation {
    const rationales: Record<RecommendationCandidate['kind'], string> = {
      overdue_visit: `${c.farmerName} is overdue — a check-in keeps the relationship warm and surfaces new issues early.`,
      first_visit: `${c.farmerName} was registered recently and still hasn't had a first visit.`,
      issue_followup: `Follow up on the open issue raised at the last visit with ${c.farmerName}.`,
      advice_followup: `Check whether ${c.farmerName} acted on the advice from the previous visit.`,
      risk_alert: `A contagious issue was reported near ${c.farmerName} — a proactive visit can stop it spreading.`,
    };
    return { ...c, rationale: rationales[c.kind] };
  }

  /**
   * Deterministic, low-quality embedding: token-hash -> bucket. Stable for the
   * same input so vector search is reproducible during the demo.
   */
  private fallbackEmbed(text: string): number[] {
    const vec = new Array<number>(EMBEDDING_DIM).fill(0);
    const tokens = (text || '').toLowerCase().match(/[a-z0-9]+/g) ?? [];
    for (const tok of tokens) {
      let h = 2166136261;
      for (let i = 0; i < tok.length; i++) {
        h ^= tok.charCodeAt(i);
        h = Math.imul(h, 16777619);
      }
      const bucket = Math.abs(h) % EMBEDDING_DIM;
      vec[bucket] += 1;
    }
    let norm = 0;
    for (const v of vec) norm += v * v;
    norm = Math.sqrt(norm) || 1;
    return vec.map((v) => v / norm);
  }

  private fallbackAdvisory(req: AdvisoryRequest): AdvisoryAnswer {
    if (req.contexts.length === 0) {
      return {
        answer:
          'I could not find any supporting material in the knowledge base for this question. ' +
          'Please refer to a vet or agronomist before advising the farmer.',
        citations: [],
        confidence: 'LOW',
        deferred: true,
        referralReason:
          'No retrieved context — high-risk topics defer to a human expert.',
        actionItems: [],
        inputsNeeded: [],
        rationale:
          'No retrieved context — high-risk topics defer to a human expert.',
      };
    }
    const top = req.contexts.slice(0, 3);
    const body = top
      .map(
        (c, i) =>
          `(${i + 1}) ${c.text.slice(0, 240).replace(/\s+/g, ' ').trim()} [${c.source}]`,
      )
      .join('\n');
    return {
      answer:
        `Based on the available knowledge base:\n${body}\n\n` +
        `Question: ${req.question}\n` +
        `Suggested next step: review the cited material with the farmer and log the outcome. ` +
        `Defer to a vet/agronomist if the situation is high-risk.`,
      citations: top.map((c) => ({
        chunkId: c.id,
        source: c.source,
        page: null,
        relevance: 'Top vector-search match.',
      })),
      confidence: 'MEDIUM',
      deferred: false,
      referralReason: null,
      actionItems: [],
      inputsNeeded: [],
      rationale:
        'Stub synthesis: top-k retrieved chunks concatenated with citations.',
    };
  }
}
