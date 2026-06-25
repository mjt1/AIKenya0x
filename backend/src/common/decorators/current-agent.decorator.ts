import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Role } from '../types/rbac.types';

export interface AuthenticatedAgent {
  id: string;
  email: string;
  name: string;
  county: string;
  cooperative: string;
  cooperativeId: string | null;
  role: Role;
}

export const CurrentAgent = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthenticatedAgent => {
    const request = ctx.switchToHttp().getRequest();
    return request.user as AuthenticatedAgent;
  },
);
