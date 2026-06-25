import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AgentsService } from '../agents/agents.service';
import { toPublic } from '../agents/agent.entity';
import { Role } from '../common/types/rbac.types';
import type { AuthenticatedAgent } from '../common/decorators/current-agent.decorator';

interface JwtPayload {
  sub: string;
  email: string;
  county: string;
  cooperative: string;
  cooperativeId: string | null;
  role: Role;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    private readonly agents: AgentsService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('JWT_SECRET'),
    });
  }

  async validate(payload: JwtPayload): Promise<AuthenticatedAgent> {
    const agent = await this.agents.findByEmail(payload.email);
    if (!agent || agent.id !== payload.sub) {
      throw new UnauthorizedException('Token no longer valid');
    }
    // Trust DB values over JWT in case role/coop changed mid-token.
    return toPublic(agent);
  }
}
