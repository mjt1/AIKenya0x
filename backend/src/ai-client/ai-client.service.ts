import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type {
  RankedRecommendation,
  RecommendationCandidate,
} from '../common/types/recommendations.types';

export type ObservationKind = 'observation' | 'issue' | 'advice';
export interface StructuredObservation {
  kind: ObservationKind;
  text: string;
}

export const EMBEDDING_DIM = 384;

export interface AdvisoryContextChunk {
  id: string;
  text: string;
  source: string;
  title?: string;
  score: number;
}

export interface AdvisoryRequest {
  question: string;
  contexts: AdvisoryContextChunk[];
  farmerSummary?: string | null;
}

export interface AdvisoryAnswer {
  answer: string;
  citations: { chunkId: string; source: string; title?: string }[];
  deferred: boolean;
  rationale?: string;
}

/**
 * Thin client for the FastAPI AI service. When AI_SERVICE_URL is unset, every
 * method falls back to a deterministic stub so the contract is in place
 * before the AI service exists.
 */
@Injectable()
export class AiClientService {
  private readonly logger = new Logger(AiClientService.name);
  constructor(private readonly config: ConfigService) {}

  async structureNote(rawNote: string): Promise<StructuredObservation[]> {
    const url = this.config.get<string>('AI_SERVICE_URL');
    if (!url) return [{ kind: 'observation', text: rawNote.trim() }];
    try {
      const res = await fetch(`${url}/structure-note`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ text: rawNote }),
      });
      if (!res.ok) throw new Error(`AI service returned ${res.status}`);
      const json = (await res.json()) as { observations: StructuredObservation[] };
      return json.observations;
    } catch (err) {
      this.logger.warn(
        `AI structuring failed, falling back to raw note: ${(err as Error).message}`,
      );
      return [{ kind: 'observation', text: rawNote.trim() }];
    }
  }

  async rankRecommendations(
    candidates: RecommendationCandidate[],
  ): Promise<RankedRecommendation[]> {
    if (candidates.length === 0) return [];
    const url = this.config.get<string>('AI_SERVICE_URL');
    if (!url) return candidates.map((c) => this.fallbackRank(c));
    try {
      const res = await fetch(`${url}/rank-recommendations`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ candidates }),
      });
      if (!res.ok) throw new Error(`AI service returned ${res.status}`);
      const json = (await res.json()) as { ranked: RankedRecommendation[] };
      const seen = new Set(json.ranked.map((r) => r.dedupeKey));
      const merged = [
        ...json.ranked,
        ...candidates.filter((c) => !seen.has(c.dedupeKey)).map((c) => this.fallbackRank(c)),
      ];
      return merged;
    } catch (err) {
      this.logger.warn(
        `AI ranking failed, falling back to rule-based order: ${(err as Error).message}`,
      );
      return candidates.map((c) => this.fallbackRank(c));
    }
  }

  /**
   * Embed a single text into a fixed-dim vector. Falls back to a deterministic
   * hashed embedding when AI_SERVICE_URL is unset — enough for the Neo4j
   * vector index to round-trip and for the demo to exercise the full pipe.
   */
  async embed(text: string): Promise<number[]> {
    const url = this.config.get<string>('AI_SERVICE_URL');
    if (!url) return this.fallbackEmbed(text);
    try {
      const res = await fetch(`${url}/embed`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      if (!res.ok) throw new Error(`AI service returned ${res.status}`);
      const json = (await res.json()) as { embedding: number[] };
      if (!Array.isArray(json.embedding) || json.embedding.length !== EMBEDDING_DIM) {
        this.logger.warn(
          `AI /embed returned dim=${json.embedding?.length}; expected ${EMBEDDING_DIM}. Using fallback.`,
        );
        return this.fallbackEmbed(text);
      }
      return json.embedding;
    } catch (err) {
      this.logger.warn(
        `AI embedding failed, falling back to hash embedding: ${(err as Error).message}`,
      );
      return this.fallbackEmbed(text);
    }
  }

  /**
   * GraphRAG generation. Composes a grounded, cited answer from retrieved
   * context chunks + a farmer-subgraph summary. Stub returns a templated
   * synthesis with citations when no AI service is configured.
   */
  async advisory(req: AdvisoryRequest): Promise<AdvisoryAnswer> {
    const url = this.config.get<string>('AI_SERVICE_URL');
    if (!url) return this.fallbackAdvisory(req);
    try {
      const res = await fetch(`${url}/advisory`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(req),
      });
      if (!res.ok) throw new Error(`AI service returned ${res.status}`);
      const json = (await res.json()) as AdvisoryAnswer;
      return json;
    } catch (err) {
      this.logger.warn(
        `AI advisory failed, falling back to stub: ${(err as Error).message}`,
      );
      return this.fallbackAdvisory(req);
    }
  }

  private fallbackRank(c: RecommendationCandidate): RankedRecommendation {
    const rationales: Record<RecommendationCandidate['kind'], string> = {
      overdue_visit: `${c.farmerName} is overdue — a check-in keeps the relationship warm and surfaces new issues early.`,
      first_visit: `${c.farmerName} was registered recently and still hasn't had a first visit.`,
      issue_followup: `Follow up on the open issue raised at the last visit with ${c.farmerName}.`,
      advice_followup: `Check whether ${c.farmerName} acted on the advice from the previous visit.`,
    };
    return { ...c, rationale: rationales[c.kind] };
  }

  /**
   * Deterministic, low-quality embedding: token-hash → bucket. Stable for the
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
    // L2-normalise so cosine in Neo4j is well-defined.
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
        deferred: true,
        rationale: 'No retrieved context — high-risk topics defer to a human expert.',
      };
    }
    const top = req.contexts.slice(0, 3);
    const farmerLine = req.farmerSummary
      ? `\n\nFarmer context: ${req.farmerSummary}`
      : '';
    const body = top
      .map(
        (c, i) =>
          `(${i + 1}) ${c.text.slice(0, 240).replace(/\s+/g, ' ').trim()} [${c.source}]`,
      )
      .join('\n');
    return {
      answer:
        `Based on the available knowledge base:\n${body}${farmerLine}\n\n` +
        `Question: ${req.question}\n` +
        `Suggested next step: review the cited material with the farmer and log the outcome. ` +
        `Defer to a vet/agronomist if the situation is high-risk.`,
      citations: top.map((c) => ({ chunkId: c.id, source: c.source, title: c.title })),
      deferred: false,
      rationale: 'Stub synthesis: top-k retrieved chunks concatenated with citations.',
    };
  }
}
