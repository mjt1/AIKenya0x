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
                     a.role = $role,
                     a.createdAt = datetime()
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

  async caseloadSize(agentId: string): Promise<number> {
    const records = await this.neo4j.read(
      `MATCH (:Agent {id: $agentId})-[:MANAGES]->(f:Farmer)
       RETURN count(f) AS size`,
      { agentId },
    );
    return Number(records[0].get('size'));
  }

  /** Backfill role default so legacy rows stay safe. */
  private hydrate(props: Record<string, unknown>): AgentRecord {
    return {
      ...(props as unknown as AgentRecord),
      role: ((props as { role?: Role }).role ?? Role.agent) as Role,
    };
  }
}
