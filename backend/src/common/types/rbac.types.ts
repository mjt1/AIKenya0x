export enum Role {
  agent = 'agent',
  admin = 'admin',
}

export const ALL_ROLES: Role[] = [Role.agent, Role.admin];

/**
 * Access scope passed from controllers to repositories so reads can be
 * widened for admins without changing the per-agent default.
 */
export interface AccessScope {
  role: Role;
  agentId: string;
}
