import { Injectable } from '@nestjs/common';
import { v4 as uuid } from 'uuid';
import { Neo4jService } from '../neo4j/neo4j.service';
import { serializeNeo4j } from '../neo4j/serialize';
import {
  type CreateFarmerDto,
  type EnterpriseInput,
  EnterpriseType,
} from '../farmers/dto/create-farmer.dto';
import type { UpdateFarmerDto } from '../farmers/dto/update-farmer.dto';

export interface FarmerRow {
  id: string;
  name: string;
  gps: string | null;
  phone: string;
  lastVisitedAt: string | null;
  updatedAt?: string | null;
}

/**
 * Per-farmer card for the caseload map tooltip (US — enhanced map pins).
 * Aggregates the real signals we store: enterprise mix, recency, open issues
 * and the latest field note. Priority/band still comes from the recommendation
 * queue on the client.
 */
export interface FarmerMapSummary {
  id: string;
  name: string;
  phone: string;
  gps: string | null;
  lastVisitedAt: string | null;
  /** Distinct enterprise types this farmer runs, e.g. ['Dairy', 'Sugarcane']. */
  enterprises: string[];
  /** Count of open issues flagged across the farmer's visits. */
  openIssueCount: number;
  /** Most severe open issue, if any. */
  topIssue: {
    text: string;
    severity: string | null;
    contagious: boolean;
  } | null;
  /** Most recent observation captured on any visit, if any. */
  latestObservation: {
    kind: string;
    text: string;
    capturedAt: string | null;
  } | null;
}

export interface CreateForAgentOptions {
  farmerId?: string;
  clientUpdatedAt?: string;
}

export interface UpdateOutcome {
  status: 'applied' | 'conflict' | 'notfound';
  farmer?: FarmerRow;
  serverUpdatedAt?: string;
}

export interface ReassignPreview {
  farmerExists: boolean;
  targetAgentExists: boolean;
  fromAgentId: string | null;
}

@Injectable()
export class FarmersRepository {
  constructor(private readonly neo4j: Neo4jService) {}

  async createForAgent(
    agentId: string,
    dto: CreateFarmerDto,
    opts: CreateForAgentOptions = {},
  ): Promise<{ id: string; created: boolean }> {
    const farmerId = opts.farmerId ?? uuid();
    const enterprises = dto.enterprises.map((e) => this.expandEnterprise(e));
    const records = await this.neo4j.write(
      `MATCH (a:Agent {id: $agentId})
       MERGE (f:Farmer {id: $farmerId})
         ON CREATE SET f.name = $name, f.gps = $gps, f.phone = $phone,
                       f.createdAt = datetime(), f.updatedAt = datetime(),
                       f.clientUpdatedAt = datetime($clientUpdatedAt),
                       f._created = true
         ON MATCH SET f._created = false
       MERGE (a)-[:MANAGES]->(f)
       WITH f
       UNWIND $enterprises AS ent
         MERGE (e:Enterprise {id: ent.id})
           ON CREATE SET e.type = ent.type, e.createdAt = datetime(),
                         e.updatedAt = datetime(),
                         e.clientUpdatedAt = datetime($clientUpdatedAt)
         MERGE (f)-[:RUNS]->(e)
         FOREACH (animal IN ent.animals |
           MERGE (an:Animal {id: animal.id})
             ON CREATE SET an += animal.props, an.updatedAt = datetime()
           MERGE (e)-[:HAS_ASSET]->(an)
         )
         FOREACH (field IN ent.fields |
           MERGE (fl:Field {id: field.id})
             ON CREATE SET fl += field.props, fl.updatedAt = datetime()
           MERGE (e)-[:HAS_ASSET]->(fl)
         )
       WITH f
       RETURN f.id AS id, f._created AS created
       LIMIT 1`,
      {
        agentId,
        farmerId,
        name: dto.name,
        gps: dto.gps ?? null,
        phone: dto.phone,
        enterprises,
        clientUpdatedAt: opts.clientUpdatedAt ?? new Date().toISOString(),
      },
    );
    if (records.length === 0) {
      throw new Error('AGENT_NOT_FOUND');
    }
    const created = Boolean(records[0].get('created'));
    // Clean the bookkeeping flag.
    await this.neo4j.write(
      `MATCH (f:Farmer {id: $farmerId}) REMOVE f._created`,
      { farmerId },
    );
    return { id: records[0].get('id'), created };
  }

  async updateForAgent(
    agentId: string,
    farmerId: string,
    patch: UpdateFarmerDto,
    clientUpdatedAt?: string,
  ): Promise<UpdateOutcome> {
    const exists = await this.neo4j.read(
      `MATCH (:Agent {id: $agentId})-[:MANAGES]->(f:Farmer {id: $farmerId})
       RETURN f.clientUpdatedAt AS clientUpdatedAt, f.updatedAt AS updatedAt`,
      { agentId, farmerId },
    );
    if (exists.length === 0) return { status: 'notfound' };

    const cleaned = Object.fromEntries(
      Object.entries(patch).filter(([, v]) => v !== undefined),
    );
    const ts = clientUpdatedAt ?? new Date().toISOString();

    const records = await this.neo4j.write(
      `MATCH (:Agent {id: $agentId})-[:MANAGES]->(f:Farmer {id: $farmerId})
       WHERE f.clientUpdatedAt IS NULL OR f.clientUpdatedAt <= datetime($clientUpdatedAt)
       SET   f += $patch,
             f.clientUpdatedAt = datetime($clientUpdatedAt),
             f.updatedAt = datetime()
       RETURN f`,
      { agentId, farmerId, patch: cleaned, clientUpdatedAt: ts },
    );
    if (records.length === 0) return { status: 'conflict' };
    const props = records[0].get('f').properties;
    return {
      status: 'applied',
      farmer: this.farmerFrom(props),
      serverUpdatedAt: props.updatedAt?.toString?.() ?? null,
    };
  }

  async listForAgent(agentId: string): Promise<FarmerRow[]> {
    const records = await this.neo4j.read(
      `MATCH (:Agent {id: $agentId})-[:MANAGES]->(f:Farmer)
       RETURN f
       ORDER BY coalesce(f.lastVisitedAt, datetime('1970-01-01T00:00:00Z')) ASC`,
      { agentId },
    );
    return records.map((r) => this.farmerFrom(r.get('f').properties));
  }

  /**
   * Caseload cards for the map tooltip. One read aggregates each farmer's
   * enterprise mix, latest observation and most-severe open issue.
   */
  async mapSummaryForAgent(agentId: string): Promise<FarmerMapSummary[]> {
    const records = await this.neo4j.read(
      `MATCH (:Agent {id: $agentId})-[:MANAGES]->(f:Farmer)
       CALL { WITH f
         OPTIONAL MATCH (f)-[:RUNS]->(e:Enterprise)
         RETURN collect(DISTINCT e.type) AS enterprises
       }
       CALL { WITH f
         OPTIONAL MATCH (f)-[:HAD_VISIT]->(:Visit)-[:CAPTURED]->(o:Observation)
         WITH o ORDER BY o.capturedAt DESC LIMIT 1
         RETURN o AS latestObs
       }
       CALL { WITH f
         OPTIONAL MATCH (f)-[:HAD_VISIT]->(:Visit)-[:CAPTURED]->(:Observation)-[:FLAGS]->(i:Issue)
         WHERE i.status = 'open'
         WITH i, CASE i.severity
                   WHEN 'high' THEN 3 WHEN 'medium' THEN 2 WHEN 'low' THEN 1 ELSE 0
                 END AS rank
         ORDER BY rank DESC, i.contagious DESC
         RETURN collect(i) AS issues
       }
       RETURN f.id AS id, f.name AS name, f.phone AS phone, f.gps AS gps,
              f.lastVisitedAt AS lastVisitedAt,
              enterprises AS enterprises,
              latestObs.kind AS obsKind,
              latestObs.text AS obsText,
              latestObs.capturedAt AS obsCapturedAt,
              size(issues) AS openIssueCount,
              head(issues).text AS issueText,
              head(issues).severity AS issueSeverity,
              head(issues).contagious AS issueContagious
       ORDER BY coalesce(f.lastVisitedAt, datetime('1970-01-01T00:00:00Z')) ASC`,
      { agentId },
    );

    const ts = (v: any): string | null => v?.toString?.() ?? null;

    return records.map((r) => {
      const obsText = r.get('obsText') as string | null;
      const issueText = r.get('issueText') as string | null;
      const enterprises = (
        (r.get('enterprises') as (string | null)[] | null) ?? []
      ).filter((t): t is string => Boolean(t));
      return {
        id: r.get('id') as string,
        name: r.get('name') as string,
        phone: r.get('phone') as string,
        gps: (r.get('gps') as string | null) ?? null,
        lastVisitedAt: ts(r.get('lastVisitedAt')),
        enterprises,
        openIssueCount: Number(r.get('openIssueCount') ?? 0),
        topIssue: issueText
          ? {
              text: issueText,
              severity: (r.get('issueSeverity') as string | null) ?? null,
              contagious: Boolean(r.get('issueContagious')),
            }
          : null,
        latestObservation: obsText
          ? {
              kind: (r.get('obsKind') as string | null) ?? 'observation',
              text: obsText,
              capturedAt: ts(r.get('obsCapturedAt')),
            }
          : null,
      };
    });
  }

  async findOneForAgent(agentId: string, farmerId: string) {
    const records = await this.neo4j.read(
      `MATCH (:Agent {id: $agentId})-[:MANAGES]->(f:Farmer {id: $farmerId})
       OPTIONAL MATCH (f)-[:RUNS]->(e:Enterprise)
       OPTIONAL MATCH (e)-[:HAS_ASSET]->(asset)
       WITH f, e, collect(asset { .*, _label: head(labels(asset)) }) AS assets
       WITH f, collect(CASE WHEN e IS NULL THEN null ELSE e { .*, assets: assets } END) AS enterprises
       RETURN f, [x IN enterprises WHERE x IS NOT NULL] AS enterprises`,
      { agentId, farmerId },
    );
    if (records.length === 0) return null;
    return {
      ...this.farmerFrom(records[0].get('f').properties),
      // enterprises is a raw map projection (createdAt/updatedAt/asset ints are
      // driver wrappers) — serialize so no temporal/integer object leaks out.
      enterprises: serializeNeo4j(records[0].get('enterprises')),
    };
  }

  async addEnterpriseForAgent(
    agentId: string,
    farmerId: string,
    input: EnterpriseInput,
    opts: { enterpriseId?: string; clientUpdatedAt?: string } = {},
  ): Promise<{ id: string; created: boolean }> {
    const ent = this.expandEnterprise(input, opts.enterpriseId);
    const ts = opts.clientUpdatedAt ?? new Date().toISOString();
    const records = await this.neo4j.write(
      `MATCH (:Agent {id: $agentId})-[:MANAGES]->(f:Farmer {id: $farmerId})
       MERGE (e:Enterprise {id: $ent.id})
         ON CREATE SET e.type = $ent.type, e.createdAt = datetime(),
                       e.updatedAt = datetime(),
                       e.clientUpdatedAt = datetime($clientUpdatedAt),
                       e._created = true
         ON MATCH SET e._created = false
       MERGE (f)-[:RUNS]->(e)
       FOREACH (animal IN $ent.animals |
         MERGE (an:Animal {id: animal.id})
           ON CREATE SET an += animal.props, an.updatedAt = datetime()
         MERGE (e)-[:HAS_ASSET]->(an)
       )
       FOREACH (field IN $ent.fields |
         MERGE (fl:Field {id: field.id})
           ON CREATE SET fl += field.props, fl.updatedAt = datetime()
         MERGE (e)-[:HAS_ASSET]->(fl)
       )
       RETURN e.id AS id, e._created AS created`,
      { agentId, farmerId, ent, clientUpdatedAt: ts },
    );
    if (records.length === 0) {
      throw new Error('FARMER_NOT_FOUND');
    }
    const created = Boolean(records[0].get('created'));
    await this.neo4j.write(
      `MATCH (e:Enterprise {id: $entId}) REMOVE e._created`,
      { entId: ent.id },
    );
    return { id: records[0].get('id'), created };
  }

  /** Farmers in the caseload updated since `since` (or all if omitted). */
  async deltaForAgent(agentId: string, since?: string) {
    const records = await this.neo4j.read(
      `MATCH (:Agent {id: $agentId})-[:MANAGES]->(f:Farmer)
       WHERE $since IS NULL OR f.updatedAt IS NULL OR f.updatedAt > datetime($since)
       OPTIONAL MATCH (f)-[:RUNS]->(e:Enterprise)
       WITH f, collect(DISTINCT e { .* }) AS enterprises
       RETURN f { .*, enterprises: enterprises } AS farmer
       ORDER BY coalesce(f.updatedAt, datetime('1970-01-01T00:00:00Z'))`,
      { agentId, since: since ?? null },
    );
    return records.map((r) => serializeNeo4j(r.get('farmer')));
  }

  async enterpriseDelta(agentId: string, since?: string) {
    const records = await this.neo4j.read(
      `MATCH (:Agent {id: $agentId})-[:MANAGES]->(f:Farmer)-[:RUNS]->(e:Enterprise)
       WHERE $since IS NULL OR e.updatedAt IS NULL OR e.updatedAt > datetime($since)
       RETURN e { .*, farmerId: f.id } AS enterprise
       ORDER BY coalesce(e.updatedAt, datetime('1970-01-01T00:00:00Z'))`,
      { agentId, since: since ?? null },
    );
    return records.map((r) => serializeNeo4j(r.get('enterprise')));
  }

  async caseloadCount(agentId: string): Promise<number> {
    const records = await this.neo4j.read(
      `MATCH (:Agent {id: $agentId})-[:MANAGES]->(f:Farmer)
       RETURN count(f) AS n`,
      { agentId },
    );
    return Number(records[0].get('n'));
  }

  /**
   * Inspect a proposed reassignment without performing it. Returns existence
   * flags and the source agent so the caller can authorize.
   */
  async reassignPreview(
    farmerId: string,
    toAgentId: string,
  ): Promise<ReassignPreview> {
    const records = await this.neo4j.read(
      `OPTIONAL MATCH (f:Farmer {id: $farmerId})
       OPTIONAL MATCH (toAgent:Agent {id: $toAgentId})
       OPTIONAL MATCH (fromAgent:Agent)-[:MANAGES]->(f)
       RETURN f IS NOT NULL          AS farmerExists,
              toAgent IS NOT NULL    AS targetAgentExists,
              fromAgent.id           AS fromAgentId`,
      { farmerId, toAgentId },
    );
    const r = records[0];
    return {
      farmerExists: Boolean(r.get('farmerExists')),
      targetAgentExists: Boolean(r.get('targetAgentExists')),
      fromAgentId: (r.get('fromAgentId') as string | null) ?? null,
    };
  }

  /**
   * Move :MANAGES edge from whichever agent currently owns the farmer to
   * the target agent. Idempotent.
   */
  async reassign(
    farmerId: string,
    toAgentId: string,
  ): Promise<{ reassignedAt: string }> {
    const records = await this.neo4j.write(
      `MATCH (f:Farmer {id: $farmerId})
       MATCH (target:Agent {id: $toAgentId})
       OPTIONAL MATCH (:Agent)-[old:MANAGES]->(f)
       DELETE old
       MERGE (target)-[:MANAGES]->(f)
       SET f.updatedAt = datetime()
       RETURN f.updatedAt AS reassignedAt`,
      { farmerId, toAgentId },
    );
    return {
      reassignedAt: records[0].get('reassignedAt')?.toString?.() ?? '',
    };
  }

  private expandEnterprise(e: EnterpriseInput, presetId?: string) {
    return {
      id: presetId ?? uuid(),
      type: e.type,
      animals:
        e.type === EnterpriseType.Dairy
          ? (e.animals ?? []).map((a) => ({ id: uuid(), props: { ...a } }))
          : [],
      fields:
        e.type === EnterpriseType.Sugarcane
          ? (e.fields ?? []).map((f) => ({ id: uuid(), props: { ...f } }))
          : [],
    };
  }

  private farmerFrom(p: any): FarmerRow {
    return {
      id: p.id,
      name: p.name,
      gps: p.gps ?? null,
      phone: p.phone,
      lastVisitedAt: p.lastVisitedAt?.toString?.() ?? p.lastVisitedAt ?? null,
      updatedAt: p.updatedAt?.toString?.() ?? p.updatedAt ?? null,
    };
  }
}
