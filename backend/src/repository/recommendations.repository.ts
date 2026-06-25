import { Injectable } from '@nestjs/common';
import { Neo4jService } from '../neo4j/neo4j.service';
import type {
  Recommendation,
  RecommendationCandidate,
  RecommendationStatus,
  RankedRecommendation,
} from '../common/types/recommendations.types';

const toNum = (v: unknown): number =>
  typeof v === 'number'
    ? v
    : v && typeof (v as { toNumber?: () => number }).toNumber === 'function'
      ? (v as { toNumber: () => number }).toNumber()
      : Number(v ?? 0);

@Injectable()
export class RecommendationsRepository {
  constructor(private readonly neo4j: Neo4jService) {}

  /**
   * Deterministic candidate generation. Each branch returns the SAME shape so
   * the AI ranker only has to add a one-line rationale.
   */
  async generateCandidates(agentId: string): Promise<RecommendationCandidate[]> {
    const records = await this.neo4j.read(
      `MATCH (a:Agent {id: $agentId})-[:MANAGES]->(f:Farmer)
       WITH a, f,
            CASE WHEN f.lastVisitedAt IS NULL THEN NULL
                 ELSE duration.between(f.lastVisitedAt, datetime()).days END AS daysSinceVisit,
            CASE WHEN f.createdAt IS NULL THEN NULL
                 ELSE duration.between(f.createdAt, datetime()).days END AS daysSinceCreated

       // Latest visit + its open observations (issue/advice)
       OPTIONAL MATCH (f)-[:HAD_VISIT]->(lv:Visit)
       WITH a, f, daysSinceVisit, daysSinceCreated, lv
       ORDER BY lv.date DESC
       WITH a, f, daysSinceVisit, daysSinceCreated, collect(lv)[0] AS lastVisit

       OPTIONAL MATCH (lastVisit)-[:CAPTURED]->(o:Observation)
         WHERE o.kind IN ['issue','advice']
       WITH a, f, daysSinceVisit, daysSinceCreated, lastVisit,
            [x IN collect(o) WHERE x.kind = 'issue']  AS issues,
            [x IN collect(o) WHERE x.kind = 'advice'] AS advices

       // Build candidates
       WITH a, f, daysSinceVisit, daysSinceCreated, lastVisit, issues, advices,
            // overdue_visit
            CASE
              WHEN daysSinceVisit IS NOT NULL AND daysSinceVisit > 30 THEN {
                kind: 'overdue_visit',
                reason: 'Last visit was ' + toString(daysSinceVisit) + ' days ago',
                priority: CASE WHEN daysSinceVisit > 60 THEN 90 ELSE 70 END,
                context: { daysSinceVisit: daysSinceVisit }
              }
              ELSE NULL
            END AS overdue,
            // first_visit
            CASE
              WHEN daysSinceVisit IS NULL AND daysSinceCreated IS NOT NULL AND daysSinceCreated > 7 THEN {
                kind: 'first_visit',
                reason: 'Registered ' + toString(daysSinceCreated) + ' days ago, never visited',
                priority: 80,
                context: { daysSinceCreated: daysSinceCreated }
              }
              ELSE NULL
            END AS firstVisit,
            // issue_followup (issue noted but no later visit)
            CASE
              WHEN size(issues) > 0 AND lastVisit IS NOT NULL
                   AND duration.between(lastVisit.date, datetime()).days <= 14 THEN {
                kind: 'issue_followup',
                reason: 'Open issue from last visit: ' + issues[0].text,
                priority: 85,
                context: { observationId: issues[0].id, observation: issues[0].text }
              }
              ELSE NULL
            END AS issueFollowup,
            // advice_followup
            CASE
              WHEN size(advices) > 0 AND lastVisit IS NOT NULL
                   AND duration.between(lastVisit.date, datetime()).days >= 14
                   AND duration.between(lastVisit.date, datetime()).days <= 30 THEN {
                kind: 'advice_followup',
                reason: 'Check on advice from last visit: ' + advices[0].text,
                priority: 60,
                context: { observationId: advices[0].id, observation: advices[0].text }
              }
              ELSE NULL
            END AS adviceFollowup

       WITH f, [c IN [overdue, firstVisit, issueFollowup, adviceFollowup] WHERE c IS NOT NULL] AS candidates
       UNWIND candidates AS c
       RETURN f.id AS farmerId, f.name AS farmerName,
              c.kind AS kind, c.reason AS reason, c.priority AS priority,
              c.context AS context`,
      { agentId },
    );
    return records.map((r) => {
      const kind = r.get('kind') as RecommendationCandidate['kind'];
      const farmerId = r.get('farmerId') as string;
      return {
        kind,
        farmerId,
        farmerName: r.get('farmerName') as string,
        reason: r.get('reason') as string,
        priority: toNum(r.get('priority')),
        dedupeKey: `${kind}:${farmerId}`,
        context: (r.get('context') as Record<string, unknown>) ?? {},
      };
    });
  }

  /**
   * Persist ranked candidates as :Recommendation nodes, scoped to the agent.
   * Skips any candidate whose dedupeKey already has a pending/snoozed record.
   */
  async upsert(
    agentId: string,
    items: RankedRecommendation[],
  ): Promise<{ created: number; skipped: number }> {
    if (items.length === 0) return { created: 0, skipped: 0 };
    const records = await this.neo4j.write(
      `UNWIND $items AS item
       MATCH (a:Agent {id: $agentId})-[:MANAGES]->(f:Farmer {id: item.farmerId})
       OPTIONAL MATCH (a)-[:HAS_RECOMMENDATION]->(open:Recommendation {dedupeKey: item.dedupeKey})
         WHERE open.status IN ['pending','snoozed']
       WITH a, f, item, open
       CALL (a, f, item, open) {
         WITH a, f, item, open
         WITH a, f, item WHERE open IS NULL
         CREATE (r:Recommendation {
           id: randomUUID(),
           kind: item.kind,
           reason: item.reason,
           rationale: item.rationale,
           priority: item.priority,
           status: 'pending',
           dedupeKey: item.dedupeKey,
           context: item.context,
           createdAt: datetime(),
           updatedAt: datetime()
         })
         MERGE (a)-[:HAS_RECOMMENDATION]->(r)
         MERGE (r)-[:ABOUT]->(f)
         RETURN 1 AS created
       }
       RETURN sum(created) AS created, count(*) AS total`,
      { agentId, items },
    );
    const created = records.length === 0 ? 0 : toNum(records[0].get('created'));
    const total = records.length === 0 ? 0 : toNum(records[0].get('total'));
    return { created, skipped: total - created };
  }

  async listForAgent(
    agentId: string,
    status?: RecommendationStatus,
  ): Promise<Recommendation[]> {
    const records = await this.neo4j.read(
      `MATCH (a:Agent {id: $agentId})-[:HAS_RECOMMENDATION]->(r:Recommendation)-[:ABOUT]->(f:Farmer)
       WHERE $status IS NULL OR r.status = $status
       RETURN r, f
       ORDER BY r.priority DESC, r.createdAt DESC`,
      { agentId, status: status ?? null },
    );
    return records.map((rec) => this.rowToRecommendation(rec.get('r').properties, rec.get('f').properties));
  }

  async updateStatus(
    agentId: string,
    recommendationId: string,
    status: RecommendationStatus,
  ): Promise<Recommendation | null> {
    const records = await this.neo4j.write(
      `MATCH (:Agent {id: $agentId})-[:HAS_RECOMMENDATION]->(r:Recommendation {id: $recommendationId})-[:ABOUT]->(f:Farmer)
       SET r.status = $status, r.updatedAt = datetime()
       RETURN r, f`,
      { agentId, recommendationId, status },
    );
    if (records.length === 0) return null;
    return this.rowToRecommendation(records[0].get('r').properties, records[0].get('f').properties);
  }

  private rowToRecommendation(
    rProps: Record<string, unknown>,
    fProps: Record<string, unknown>,
  ): Recommendation {
    return {
      id: rProps.id as string,
      kind: rProps.kind as Recommendation['kind'],
      reason: rProps.reason as string,
      rationale: (rProps.rationale as string) ?? '',
      priority: toNum(rProps.priority),
      status: rProps.status as RecommendationStatus,
      dedupeKey: rProps.dedupeKey as string,
      createdAt: rProps.createdAt?.toString?.() ?? '',
      updatedAt: rProps.updatedAt?.toString?.() ?? '',
      farmer: {
        id: fProps.id as string,
        name: fProps.name as string,
        phone: (fProps.phone as string) ?? null,
      },
    };
  }
}
