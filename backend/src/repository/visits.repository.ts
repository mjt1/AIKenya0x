import { Injectable } from '@nestjs/common';
import { v4 as uuid } from 'uuid';
import { Neo4jService } from '../neo4j/neo4j.service';
import { serializeNeo4j } from '../neo4j/serialize';

export interface CreateVisitInput {
  visitId?: string;
  agentId: string;
  farmerId: string;
  date?: string;
  enterpriseIds: string[];
  observations: { kind: string; text: string }[];
  notes: string;
  clientUpdatedAt?: string;
  /**
   * AI-classified issues (from /structure-note). Each becomes an :Issue node
   * linked from its matching kind='issue' Observation via FLAGS. Only created
   * when the visit is newly created (not on idempotent replay).
   */
  issues?: {
    text: string;
    severity: string;
    contagious: boolean;
    enterprise: string;
  }[];
}

export interface CreateVisitOutcome {
  status: 'applied' | 'duplicate' | 'notfound';
  id?: string;
  serverUpdatedAt?: string | null;
}

@Injectable()
export class VisitsRepository {
  constructor(private readonly neo4j: Neo4jService) {}

  async createForAgent(input: CreateVisitInput): Promise<CreateVisitOutcome> {
    const visitId = input.visitId ?? uuid();
    const observations = input.observations.map((o) => ({
      id: uuid(),
      kind: o.kind,
      text: o.text,
    }));
    const ts = input.clientUpdatedAt ?? new Date().toISOString();
    const records = await this.neo4j.write(
      `MATCH (a:Agent {id: $agentId})-[:MANAGES]->(f:Farmer {id: $farmerId})
       UNWIND $enterpriseIds AS eid
         MATCH (f)-[:RUNS]->(e:Enterprise {id: eid})
       WITH a, f, collect(DISTINCT e) AS enterprises
       MERGE (v:Visit {id: $visitId})
         ON CREATE SET v.date = coalesce(datetime($date), datetime()),
                       v.agentId = $agentId,
                       v.notes = $notes,
                       v.createdAt = datetime(),
                       v.updatedAt = datetime(),
                       v.clientUpdatedAt = datetime($clientUpdatedAt),
                       v._created = true
         ON MATCH SET v._created = false
       MERGE (f)-[:HAD_VISIT]->(v)
       SET f.lastVisitedAt = v.date, f.updatedAt = datetime()
       WITH v, enterprises
       FOREACH (e IN enterprises | MERGE (v)-[:FOR_ENTERPRISE]->(e))
       WITH v
       FOREACH (o IN $observations |
         MERGE (obs:Observation {id: o.id})
           ON CREATE SET obs.text = o.text, obs.kind = o.kind,
                         obs.capturedAt = datetime(),
                         obs.updatedAt = datetime()
         MERGE (v)-[:CAPTURED]->(obs)
       )
       RETURN v.id AS id, v._created AS created, v.updatedAt AS updatedAt`,
      {
        agentId: input.agentId,
        farmerId: input.farmerId,
        visitId,
        date: input.date ?? null,
        notes: input.notes,
        enterpriseIds: input.enterpriseIds,
        observations,
        clientUpdatedAt: ts,
      },
    );
    if (records.length === 0) return { status: 'notfound' };
    const created = Boolean(records[0].get('created'));
    await this.neo4j.write(
      `MATCH (v:Visit {id: $visitId}) REMOVE v._created`,
      { visitId },
    );

    // Create :Issue nodes for AI-classified issues, only on first creation so
    // an idempotent replay does not duplicate them. Each Issue is linked from
    // its matching kind='issue' Observation (same source text) via FLAGS.
    if (created && input.issues && input.issues.length > 0) {
      await this.neo4j.write(
        `MATCH (v:Visit {id: $visitId})
         UNWIND $issues AS iss
           MERGE (issue:Issue {id: iss.id})
             ON CREATE SET issue.text = iss.text, issue.severity = iss.severity,
                           issue.contagious = iss.contagious,
                           issue.enterprise = iss.enterprise,
                           issue.status = 'open', issue.createdAt = datetime(),
                           issue.updatedAt = datetime()
           WITH v, iss, issue
           OPTIONAL MATCH (v)-[:CAPTURED]->(obs:Observation {kind: 'issue'})
             WHERE obs.text = iss.text
           FOREACH (o IN CASE WHEN obs IS NULL THEN [] ELSE [obs] END |
             MERGE (o)-[:FLAGS]->(issue)
           )`,
        {
          visitId,
          issues: input.issues.map((i) => ({
            id: uuid(),
            text: i.text,
            severity: i.severity,
            contagious: i.contagious,
            enterprise: i.enterprise,
          })),
        },
      );
    }

    return {
      status: created ? 'applied' : 'duplicate',
      id: records[0].get('id'),
      serverUpdatedAt: records[0].get('updatedAt')?.toString?.() ?? null,
    };
  }

  async listForFarmer(agentId: string, farmerId: string) {
    const records = await this.neo4j.read(
      `MATCH (:Agent {id: $agentId})-[:MANAGES]->(:Farmer {id: $farmerId})-[:HAD_VISIT]->(v:Visit)
       OPTIONAL MATCH (v)-[:CAPTURED]->(o:Observation)
       OPTIONAL MATCH (v)-[:FOR_ENTERPRISE]->(e:Enterprise)
       WITH v, collect(DISTINCT o { .* }) AS observations,
                 collect(DISTINCT e { .* }) AS enterprises
       RETURN v { .*, observations: observations, enterprises: enterprises } AS visit
       ORDER BY v.date DESC`,
      { agentId, farmerId },
    );
    return records.map((r) => serializeNeo4j(r.get('visit')));
  }

  async findOneForAgent(agentId: string, visitId: string) {
    const records = await this.neo4j.read(
      `MATCH (:Agent {id: $agentId})-[:MANAGES]->(f:Farmer)-[:HAD_VISIT]->(v:Visit {id: $visitId})
       OPTIONAL MATCH (v)-[:CAPTURED]->(o:Observation)
       OPTIONAL MATCH (v)-[:FOR_ENTERPRISE]->(e:Enterprise)
       WITH f, v, collect(DISTINCT o { .* }) AS observations,
                  collect(DISTINCT e { .* }) AS enterprises
       RETURN v { .*, farmer: f { .id, .name }, observations: observations, enterprises: enterprises } AS visit`,
      { agentId, visitId },
    );
    return records.length === 0 ? null : serializeNeo4j(records[0].get('visit'));
  }

  async deltaForAgent(agentId: string, since?: string) {
    const records = await this.neo4j.read(
      `MATCH (:Agent {id: $agentId})-[:MANAGES]->(f:Farmer)-[:HAD_VISIT]->(v:Visit)
       WHERE $since IS NULL OR v.updatedAt IS NULL OR v.updatedAt > datetime($since)
       OPTIONAL MATCH (v)-[:FOR_ENTERPRISE]->(e:Enterprise)
       WITH f, v, collect(DISTINCT e.id) AS enterpriseIds
       RETURN v { .*, farmerId: f.id, enterpriseIds: enterpriseIds } AS visit
       ORDER BY coalesce(v.updatedAt, datetime('1970-01-01T00:00:00Z'))`,
      { agentId, since: since ?? null },
    );
    return records.map((r) => serializeNeo4j(r.get('visit')));
  }

  async observationDelta(agentId: string, since?: string) {
    const records = await this.neo4j.read(
      `MATCH (:Agent {id: $agentId})-[:MANAGES]->(:Farmer)-[:HAD_VISIT]->(v:Visit)-[:CAPTURED]->(o:Observation)
       WHERE $since IS NULL OR o.updatedAt IS NULL OR o.updatedAt > datetime($since)
       RETURN o { .*, visitId: v.id } AS observation
       ORDER BY coalesce(o.updatedAt, datetime('1970-01-01T00:00:00Z'))`,
      { agentId, since: since ?? null },
    );
    return records.map((r) => serializeNeo4j(r.get('observation')));
  }
}
