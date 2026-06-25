import { Injectable, NotFoundException } from '@nestjs/common';
import { AgentsRepository } from '../repository/agents.repository';
import { type AgentRecord, type PublicAgent, toPublic } from './agent.entity';
import { Role } from '../common/types/rbac.types';

@Injectable()
export class AgentsService {
  constructor(private readonly repo: AgentsRepository) {}

  create(agent: AgentRecord) {
    return this.repo.create(agent);
  }

  findByEmail(email: string) {
    return this.repo.findByEmail(email);
  }

  countAll() {
    return this.repo.countAll();
  }

  async profile(
    agentId: string,
  ): Promise<{ agent: PublicAgent; caseloadSize: number }> {
    const agent = await this.repo.findById(agentId);
    if (!agent) throw new NotFoundException('Agent not found');
    const caseloadSize = await this.repo.caseloadSize(agentId);
    return { agent: toPublic(agent), caseloadSize };
  }

  async listAll(): Promise<PublicAgent[]> {
    const agents = await this.repo.listAll();
    return agents.map(toPublic);
  }

  async updateRole(agentId: string, role: Role): Promise<PublicAgent> {
    const agent = await this.repo.updateRole(agentId, role);
    if (!agent) throw new NotFoundException('Agent not found');
    return toPublic(agent);
  }
}
