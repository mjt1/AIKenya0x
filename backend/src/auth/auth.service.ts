import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { v4 as uuid } from 'uuid';
import { AgentsService } from '../agents/agents.service';
import { toPublic } from '../agents/agent.entity';
import { CooperativesRepository } from '../repository/cooperatives.repository';
import { Role } from '../common/types/rbac.types';
import type { RegisterDto } from './dto/register.dto';
import type { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly agents: AgentsService,
    private readonly coops: CooperativesRepository,
    private readonly jwt: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.agents.findByEmail(dto.email);
    if (existing) throw new ConflictException('Email already registered');
    const passwordHash = await bcrypt.hash(dto.password, 10);

    // Bootstrap rule: first ever agent becomes admin; all others default to agent.
    const totalAgents = await this.agents.countAll();
    const role = totalAgents === 0 ? Role.admin : Role.agent;

    const coop = await this.coops.upsertByName(dto.cooperative, dto.county);

    const created = await this.agents.create({
      id: uuid(),
      name: dto.name,
      email: dto.email,
      passwordHash,
      county: dto.county,
      cooperative: dto.cooperative,
      cooperativeId: coop.id,
      role,
    });
    return this.sign(created);
  }

  async login(dto: LoginDto) {
    const agent = await this.agents.findByEmail(dto.email);
    if (!agent) throw new UnauthorizedException('Invalid credentials');
    const ok = await bcrypt.compare(dto.password, agent.passwordHash);
    if (!ok) throw new UnauthorizedException('Invalid credentials');
    return this.sign(agent);
  }

  private sign(agent: Awaited<ReturnType<AgentsService['create']>>) {
    const publicAgent = toPublic(agent);
    const access_token = this.jwt.sign({
      sub: agent.id,
      email: agent.email,
      county: agent.county,
      cooperative: agent.cooperative,
      cooperativeId: agent.cooperativeId,
      role: agent.role,
    });
    return { access_token, agent: publicAgent };
  }
}
