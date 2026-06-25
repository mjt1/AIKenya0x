import { Injectable } from '@nestjs/common';
import { Neo4jService } from '../neo4j/neo4j.service';
import type { AgentRecord } from '../agents/agent.entity';
import { Role } from '../common/types/rbac.types';

@Injectable()
export class AgentsRepository {
  constructor(private readonly neo4j: Neo4jService) {}

  async create(agent: AgentRecord): Promise<AgentRecord> {
    const records = await this.neo4j.write(
      `MERGE (a:Agent {email: $email})
       ON CREATE SET a.id = $id,
                     a.name = $name,
                     a.passwordHash = $passwordHash,
                     a.county = $county,
                     a.cooperative = $cooperative,
                     a.cooperativeId = $cooperativeId,
                     a.role = $role,
                     a.createdAt = datetime()
       WITH a
       OPTIONAL MATCH (c:Cooperative {id: $cooperativeId})
       FOREACH (_ IN CASE WHEN c IS NULL THEN [] ELSE [1] END |
         MERGE (a)-[:BELONGS_TO]->(c)
       )
       RETURN a`,
      { ...agent },
    );
    return records[0].get('a').properties as AgentRecord;
  }

  async findByEmail(email: string): Promise<AgentRecord | null> {
    const records = await this.neo4j.read(
      `MATCH (a:Agent {email: $email}) RETURN a`,
      { email },
    );
    if (records.length === 0) return null;
    return this.hydrate(records[0].get('a').properties);
  }

  async findById(id: string): Promise<AgentRecord | null> {
    const records = await this.neo4j.read(
      `MATCH (a:Agent {id: $id}) RETURN a`,
      { id },
    );
    if (records.length === 0) return null;
    return this.hydrate(records[0].get('a').properties);
  }

  async listAll(): Promise<AgentRecord[]> {
    const records = await this.neo4j.read(
      `MATCH (a:Agent) RETURN a ORDER BY a.name ASC`,
    );
    return records.map((r) => this.hydrate(r.get('a').properties));
  }

  async listByCooperative(cooperativeId: string): Promise<AgentRecord[]> {
    const records = await this.neo4j.read(
      `MATCH (a:Agent {cooperativeId: $cooperativeId})
       RETURN a ORDER BY a.name ASC`,
      { cooperativeId },
    );
    return records.map((r) => this.hydrate(r.get('a').properties));
  }

  async countAll(): Promise<number> {
    const records = await this.neo4j.read(
      `MATCH (a:Agent) RETURN count(a) AS n`,
    );
    return Number(records[0].get('n'));
  }

  async updateRole(id: string, role: Role): Promise<AgentRecord | null> {
    const records = await this.neo4j.write(
      `MATCH (a:Agent {id: $id})
       SET a.role = $role
       RETURN a`,
      { id, role },
    );
    if (records.length === 0) return null;
    return this.hydrate(records[0].get('a').properties);
  }

  async assignCooperative(
    id: string,
    cooperativeId: string,
    cooperativeName: string,
  ): Promise<AgentRecord | null> {
    const records = await this.neo4j.write(
      `MATCH (a:Agent {id: $id})
       OPTIONAL MATCH (a)-[old:BELONGS_TO]->(:Cooperative)
       DELETE old
       WITH a
       MATCH (c:Cooperative {id: $cooperativeId})
       MERGE (a)-[:BELONGS_TO]->(c)
       SET a.cooperativeId = c.id, a.cooperative = $cooperativeName
       RETURN a`,
      { id, cooperativeId, cooperativeName },
    );
    if (records.length === 0) return null;
    return this.hydrate(records[0].get('a').properties);
  }

  async caseloadSize(agentId: string): Promise<number> {
    const records = await this.neo4j.read(
      `MATCH (:Agent {id: $agentId})-[:MANAGES]->(f:Farmer)
       RETURN count(f) AS size`,
      { agentId },
    );
    return Number(records[0].get('size'));
  }

  /** Backfill role/cooperativeId defaults so legacy rows stay safe. */
  private hydrate(props: Record<string, unknown>): AgentRecord {
    return {
      ...(props as unknown as AgentRecord),
      role: ((props as { role?: Role }).role ?? Role.agent) as Role,
      cooperativeId:
        (props as { cooperativeId?: string | null }).cooperativeId ?? null,
    };
  }
}

