import { Injectable } from '@nestjs/common';
import { v4 as uuid } from 'uuid';
import { Neo4jService } from '../neo4j/neo4j.service';
import { KnowledgeRepository } from '../repository/knowledge.repository';
import { AiClientService } from '../ai-client/ai-client.service';
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

    const queryEmbedding = await this.ai.embed(dto.question);
    const hits = await this.kb.vectorSearch(
      queryEmbedding,
      TOP_K,
      dto.enterprise ?? null,
    );

    const answer = await this.ai.advisory({
      question: dto.question,
      contexts: hits.map((h) => ({
        id: h.id,
        text: h.text,
        source: h.source,
        title: h.title ?? undefined,
        score: h.score,
      })),
      farmerSummary: farmer ? this.summariseFarmer(farmer) : null,
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
      deferred: answer.deferred,
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
    } else if (agent.role === Role.supervisor && agent.cooperativeId) {
      where.push(
        `EXISTS { MATCH (c:Cooperative {id: $cooperativeId})<-[:BELONGS_TO]-(:Agent)-[:MANAGES]->(f) }`,
      );
    }
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
      cooperativeId: agent.cooperativeId,
    });
    if (records.length === 0) return null;
    const r = records[0];
    return {
      id: r.get('id') as string,
      name: r.get('name') as string,
      gps: r.get('gps') as string | null,
      phone: r.get('phone') as string,
      lastVisitedAt: r.get('lastVisitedAt') as string | null,
      enterprises: (r.get('enterprises') as (string | null)[]).filter(Boolean) as string[],
      recentNotes: ((r.get('recentNotes') as Array<{ text: string; kind: string; date: unknown } | null>) ?? [])
        .filter((x): x is { text: string; kind: string; date: unknown } => !!x && !!x.text)
        .slice(0, 10),
      issues: ((r.get('issues') as Array<{ category: string; severity: string; status: string } | null>) ?? [])
        .filter((x): x is { category: string; severity: string; status: string } => !!x && !!x.category),
    };
  }

  private summariseFarmer(f: FarmerSubgraph): string {
    const parts: string[] = [];
    parts.push(`Farmer ${f.name} runs ${f.enterprises.join(' + ') || 'no recorded enterprises'}.`);
    if (f.lastVisitedAt) parts.push(`Last visited ${f.lastVisitedAt}.`);
    if (f.issues.length) {
      parts.push(
        `Open issues: ${f.issues
          .slice(0, 3)
          .map((i) => `${i.category} (${i.severity}, ${i.status})`)
          .join('; ')}.`,
      );
    }
    if (f.recentNotes.length) {
      parts.push(
        `Recent notes: ${f.recentNotes
          .slice(0, 3)
          .map((n) => `[${n.kind}] ${String(n.text).slice(0, 80)}`)
          .join(' | ')}.`,
      );
    }
    return parts.join(' ');
  }
}
