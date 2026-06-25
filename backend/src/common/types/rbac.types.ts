export enum Role {
  agent = 'agent',
  supervisor = 'supervisor',
  admin = 'admin',
}

export const ALL_ROLES: Role[] = [Role.agent, Role.supervisor, Role.admin];

/**
 * Access scope passed from controllers to repositories so reads can be
 * widened for supervisors / admins without changing the per-agent default.
 */
export interface AccessScope {
  role: Role;
  agentId: string;
  cooperativeId: string | null;
}
