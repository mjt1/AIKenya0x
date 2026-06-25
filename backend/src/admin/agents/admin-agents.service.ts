import { ConflictException, Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { v4 as uuid } from 'uuid';
import { AgentsService } from '../../agents/agents.service';
import { toPublic } from '../../agents/agent.entity';
import { Role } from '../../common/types/rbac.types';
import type { CreateAgentDto } from '../dto/create-agent.dto';

@Injectable()
export class AdminAgentsService {
  constructor(private readonly agents: AgentsService) {}

  async createAgent(dto: CreateAgentDto) {
    const existing = await this.agents.findByEmail(dto.email);
    if (existing) throw new ConflictException('Email already registered');
    const passwordHash = await bcrypt.hash(dto.password, 10);
    const created = await this.agents.create({
      id: uuid(),
      name: dto.name,
      email: dto.email.toLowerCase().trim(),
      passwordHash,
      county: dto.county,
      role: dto.role ?? Role.agent,
    });
    return toPublic(created);
  }
}
