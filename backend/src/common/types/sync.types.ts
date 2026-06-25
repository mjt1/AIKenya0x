export const SYNC_OP_KINDS = [
  'farmer.create',
  'farmer.update',
  'enterprise.create',
  'visit.create',
] as const;

export type SyncOpKind = (typeof SYNC_OP_KINDS)[number];

export const SYNC_OP_STATUSES = [
  'applied',
  'duplicate',
  'conflict',
  'rejected',
] as const;

export type SyncOpStatus = (typeof SYNC_OP_STATUSES)[number];

export interface SyncOpResult {
  clientId: string;
  kind: SyncOpKind;
  status: SyncOpStatus;
  serverId?: string;
  serverUpdatedAt?: string;
  reason?: string;
}

export interface SyncPullResponse {
  cursor: string;
  farmers: unknown[];
  enterprises: unknown[];
  visits: unknown[];
  observations: unknown[];
}

export interface SyncStatusResponse {
  serverTime: string;
  caseloadCount: number;
  lastWriteAt: string | null;
}
