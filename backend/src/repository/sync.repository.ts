import { Injectable } from '@nestjs/common';
import { Neo4jService } from '../neo4j/neo4j.service';
import type {
  SyncOpKind,
  SyncOpResult,
  SyncOpStatus,
} from '../common/types/sync.types';

@Injectable()
export class SyncRepository {
  constructor(private readonly neo4j: Neo4jService) {}

  /** Return a previously-recorded op result, or null if this clientId is new. */
  async findOperation(
    agentId: string,
    clientId: string,
  ): Promise<SyncOpResult | null> {
    const records = await this.neo4j.read(
      `MATCH (s:SyncOp {id: $clientId, agentId: $agentId}) RETURN s`,
      { agentId, clientId },
    );
    if (records.length === 0) return null;
    const p = records[0].get('s').properties;
    return {
      clientId: p.id,
      kind: p.kind as SyncOpKind,
      status: p.status as SyncOpStatus,
      serverId: p.serverId ?? undefined,
      serverUpdatedAt: p.serverUpdatedAt?.toString?.() ?? p.serverUpdatedAt ?? undefined,
      reason: p.reason ?? undefined,
    };
  }

  async logOperation(
    agentId: string,
    result: SyncOpResult,
    clientUpdatedAt: string,
  ): Promise<void> {
    await this.neo4j.write(
      `MERGE (s:SyncOp {id: $clientId})
       ON CREATE SET s.agentId = $agentId,
                     s.kind = $kind,
                     s.status = $status,
                     s.serverId = $serverId,
                     s.serverUpdatedAt = $serverUpdatedAt,
                     s.reason = $reason,
                     s.clientUpdatedAt = datetime($clientUpdatedAt),
                     s.appliedAt = datetime()`,
      {
        clientId: result.clientId,
        agentId,
        kind: result.kind,
        status: result.status,
        serverId: result.serverId ?? null,
        serverUpdatedAt: result.serverUpdatedAt ?? null,
        reason: result.reason ?? null,
        clientUpdatedAt,
      },
    );
  }

  async status(agentId: string) {
    const records = await this.neo4j.read(
      `MATCH (:Agent {id: $agentId})-[:MANAGES]->(f:Farmer)
       WITH count(f) AS caseloadCount,
            max(coalesce(f.updatedAt, datetime('1970-01-01T00:00:00Z'))) AS farmerMax
       OPTIONAL MATCH (:Agent {id: $agentId})-[:MANAGES]->(:Farmer)-[:HAD_VISIT]->(v:Visit)
       WITH caseloadCount, farmerMax,
            max(coalesce(v.updatedAt, datetime('1970-01-01T00:00:00Z'))) AS visitMax
       RETURN caseloadCount,
              CASE
                WHEN farmerMax >= visitMax THEN farmerMax
                ELSE visitMax
              END AS lastWriteAt`,
      { agentId },
    );
    if (records.length === 0) {
      return { caseloadCount: 0, lastWriteAt: null as string | null };
    }
    const r = records[0];
    const last = r.get('lastWriteAt');
    const lastStr = last?.toString?.() ?? null;
    return {
      caseloadCount: Number(r.get('caseloadCount')),
      lastWriteAt:
        lastStr === '1970-01-01T00:00:00.000000000Z' ? null : lastStr,
    };
  }
}
