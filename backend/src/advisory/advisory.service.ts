import { Injectable } from '@nestjs/common';
import { v4 as uuid } from 'uuid';
import { Neo4jService } from '../neo4j/neo4j.service';
import { KnowledgeRepository } from '../repository/knowledge.repository';
import {
  AiClientService,
  toAiEnterprise,
  type AiEnterpriseType,
} from '../ai-client/ai-client.service';
import type { AskAdvisoryDto } from './dto/ask-advisory.dto';
import type { AuthenticatedAgent } from '../common/decorators/current-agent.decorator';
import { Role } from '../common/types/rbac.types';

const TOP_K = 5;

interface FarmerSubgraph {
  id: string;
  name: string;
  gps: string | null;
  phone: string;
  lastVisitedAt: string | null;
  enterprises: string[];
  recentNotes: Array<{ text: string; kind: string; date: unknown }>;
  issues: Array<{ category: string; severity: string; status: string }>;
}

/**
 * Neo4j temporal values (DateTime/Date) arrive as driver objects, not strings.
 * The AI service's FarmerContext expects ISO strings, so coerce via toString().
 */
function toIsoString(value: unknown): string | null {
  if (value == null) return null;
  if (typeof value === 'string') return value;
  return String(value);
}

@Injectable()
export class AdvisoryService {
  constructor(
    private readonly neo4j: Neo4jService,
    private readonly kb: KnowledgeRepository,
    private readonly ai: AiClientService,
  ) {}

  async ask(dto: AskAdvisoryDto, agent: AuthenticatedAgent) {
    const farmer = dto.farmerId
      ? await this.loadFarmerSubgraph(dto.farmerId, agent)
      : null;

    const enterpriseType: AiEnterpriseType = dto.enterprise
      ? toAiEnterprise(dto.enterprise)
      : farmer && farmer.enterprises.length === 1
        ? toAiEnterprise(farmer.enterprises[0])
        : 'BOTH';

    const queryEmbedding = await this.ai.embed(dto.question);
    const hits = await this.kb.vectorSearch(
      queryEmbedding,
      TOP_K,
      dto.enterprise ?? null,
    );

    const answer = await this.ai.advisory({
      question: dto.question,
      enterpriseType,
      contexts: hits.map((h) => ({
        id: h.id,
        text: h.text,
        source: h.source,
        title: h.title ?? undefined,
        score: h.score,
      })),
      farmerContext: farmer
        ? {
            farmerId: farmer.id,
            farmerName: farmer.name,
            enterpriseTypes: farmer.enterprises.map(toAiEnterprise),
            lastVisitDate: farmer.lastVisitedAt,
            recentIssues: farmer.issues,
            recentAdvice: farmer.recentNotes
              .filter((n) => n.kind === 'advice')
              .map((n) => String(n.text)),
          }
        : null,
    });

    // Citation trail (F6 acceptance criterion):
    // (:AdvisoryInquiry)-[:GROUNDED_IN]->(:ManualChunk)
    const inquiryId = uuid();
    await this.persistInquiry({
      inquiryId,
      agentId: agent.id,
      farmerId: dto.farmerId ?? null,
      question: dto.question,
      citationIds: answer.citations.map((c) => c.chunkId),
    });

    return {
      inquiryId,
      question: dto.question,
      answer: answer.answer,
      confidence: answer.confidence,
      deferred: answer.deferred,
      referralReason: answer.referralReason,
      actionItems: answer.actionItems,
      inputsNeeded: answer.inputsNeeded,
      rationale: answer.rationale,
      citations: hits
        .filter((h) => answer.citations.some((c) => c.chunkId === h.id))
        .map((h) => ({
          chunkId: h.id,
          source: h.source,
          title: h.title,
          snippet: h.text.slice(0, 240),
          score: h.score,
        })),
      farmer: farmer ? { id: farmer.id, name: farmer.name } : null,
    };
  }

  private async persistInquiry(input: {
    inquiryId: string;
    agentId: string;
    farmerId: string | null;
    question: string;
    citationIds: string[];
  }) {
    await this.neo4j.write(
      `MERGE (q:AdvisoryInquiry {id: $inquiryId})
       SET q.question = $question, q.askedAt = datetime()
       WITH q
       MATCH (a:Agent {id: $agentId})
       MERGE (a)-[:ASKED]->(q)
       WITH q
       FOREACH (fid IN CASE WHEN $farmerId IS NULL THEN [] ELSE [$farmerId] END |
         MERGE (f:Farmer {id: fid})
         MERGE (q)-[:ABOUT]->(f)
       )
       WITH q
       UNWIND $citationIds AS cid
       MATCH (m:ManualChunk {id: cid})
       MERGE (q)-[:GROUNDED_IN]->(m)`,
      input,
    );
  }

  private async loadFarmerSubgraph(
    farmerId: string,
    agent: AuthenticatedAgent,
  ): Promise<FarmerSubgraph | null> {
    const where: string[] = [];
    if (agent.role === Role.agent) {
      where.push(`EXISTS { MATCH (:Agent {id: $agentId})-[:MANAGES]->(f) }`);
    }
    // admin: unscoped (can query any farmer subgraph)
    const cypher =
      `MATCH (f:Farmer {id: $farmerId})
       ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
       OPTIONAL MATCH (f)-[:RUNS]->(e:Enterprise)
       OPTIONAL MATCH (f)-[:HAD_VISIT]->(v:Visit)-[:CAPTURED]->(o:Observation)
         WHERE v.date >= datetime() - duration({days: 90})
       OPTIONAL MATCH (o)-[:FLAGS]->(i:Issue)
       RETURN f.id AS id, f.name AS name, f.gps AS gps, f.phone AS phone,
              f.lastVisitedAt AS lastVisitedAt,
              collect(DISTINCT e.type) AS enterprises,
              collect(DISTINCT {text: o.text, kind: o.kind, date: v.date}) AS recentNotes,
              collect(DISTINCT {category: i.category, severity: i.severity, status: i.status}) AS issues`;
    const records = await this.neo4j.read(cypher, {
      farmerId,
      agentId: agent.id,
    });
    if (records.length === 0) return null;
    const r = records[0];
    return {
      id: r.get('id') as string,
      name: r.get('name') as string,
      gps: r.get('gps') as string | null,
      phone: r.get('phone') as string,
      // f.lastVisitedAt is a Neo4j DateTime; the AI FarmerContext wants an ISO
      // string (str | None), so coerce instead of leaking the temporal object.
      lastVisitedAt: toIsoString(r.get('lastVisitedAt')),
      enterprises: (r.get('enterprises') as (string | null)[]).filter(Boolean) as string[],
      recentNotes: ((r.get('recentNotes') as Array<{ text: string; kind: string; date: unknown } | null>) ?? [])
        .filter((x): x is { text: string; kind: string; date: unknown } => !!x && !!x.text)
        .slice(0, 10),
      issues: ((r.get('issues') as Array<{ category: string; severity: string; status: string } | null>) ?? [])
        .filter((x): x is { category: string; severity: string; status: string } => !!x && !!x.category),
    };
  }
}
