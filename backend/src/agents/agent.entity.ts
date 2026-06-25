import { Role } from '../common/types/rbac.types';

export interface AgentRecord {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  county: string;
  cooperative: string;
  cooperativeId: string | null;
  role: Role;
}

export type PublicAgent = Omit<AgentRecord, 'passwordHash'>;

export const toPublic = (a: AgentRecord): PublicAgent => {
  const { passwordHash: _ph, ...rest } = a;
  return rest;
};
