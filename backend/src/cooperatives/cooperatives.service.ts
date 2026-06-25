import { Injectable, NotFoundException } from '@nestjs/common';
import { CooperativesRepository } from '../repository/cooperatives.repository';
import { AgentsRepository } from '../repository/agents.repository';
import { toPublic } from '../agents/agent.entity';

@Injectable()
export class CooperativesService {
  constructor(
    private readonly coops: CooperativesRepository,
    private readonly agents: AgentsRepository,
  ) {}

  list() {
    return this.coops.list();
  }

  create(name: string, county: string) {
    return this.coops.create(name, county);
  }

  async agentsInCooperative(cooperativeId: string) {
    const coop = await this.coops.findById(cooperativeId);
    if (!coop) throw new NotFoundException('Cooperative not found');
    const agents = await this.agents.listByCooperative(cooperativeId);
    return { cooperative: coop, agents: agents.map(toPublic) };
  }
}
