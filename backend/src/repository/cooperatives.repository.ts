import { Injectable } from '@nestjs/common';
import { v4 as uuid } from 'uuid';
import { Neo4jService } from '../neo4j/neo4j.service';

export interface CooperativeRecord {
  id: string;
  name: string;
  county: string;
  createdAt?: string;
}

const toNum = (v: unknown): number =>
  typeof v === 'number'
    ? v
    : v && typeof (v as { toNumber?: () => number }).toNumber === 'function'
      ? (v as { toNumber: () => number }).toNumber()
      : Number(v ?? 0);

@Injectable()
export class CooperativesRepository {
  constructor(private readonly neo4j: Neo4jService) {}

  async upsertByName(name: string, county: string): Promise<CooperativeRecord> {
    const records = await this.neo4j.write(
      `MERGE (c:Cooperative {name: $name})
         ON CREATE SET c.id = $id, c.county = $county, c.createdAt = datetime()
       RETURN c`,
      { id: uuid(), name, county },
    );
    return records[0].get('c').properties as CooperativeRecord;
  }

  async create(name: string, county: string): Promise<CooperativeRecord> {
    return this.upsertByName(name, county);
  }

  async list(): Promise<Array<CooperativeRecord & { agentCount: number }>> {
    const records = await this.neo4j.read(
      `MATCH (c:Cooperative)
       OPTIONAL MATCH (c)<-[:BELONGS_TO]-(a:Agent)
       WITH c, count(a) AS agentCount
       RETURN c, agentCount
       ORDER BY c.name ASC`,
    );
    return records.map((r) => ({
      ...(r.get('c').properties as CooperativeRecord),
      agentCount: toNum(r.get('agentCount')),
    }));
  }

  async findById(id: string): Promise<CooperativeRecord | null> {
    const records = await this.neo4j.read(
      `MATCH (c:Cooperative {id: $id}) RETURN c`,
      { id },
    );
    return records.length === 0
      ? null
      : (records[0].get('c').properties as CooperativeRecord);
  }

  async agentIdsForCooperative(cooperativeId: string): Promise<string[]> {
    const records = await this.neo4j.read(
      `MATCH (:Cooperative {id: $cooperativeId})<-[:BELONGS_TO]-(a:Agent)
       RETURN a.id AS id`,
      { cooperativeId },
    );
    return records.map((r) => r.get('id') as string);
  }
}
