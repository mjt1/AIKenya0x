"use client";

import { apiFetch } from "@/lib/api";
import { getPending, removeOps, type QueuedOp } from "@/lib/offline/queue";

interface SyncOpResult {
  clientId: string;
  status: "applied" | "duplicate" | "conflict" | "rejected";
  reason?: string;
}

export interface FlushResult {
  pushed: number;
  applied: number;
  failed: number;
}

/**
 * Push all queued offline operations to the backend (POST /sync/push) and
 * clear the ones the server processed. Idempotent via each op's clientId, so a
 * partial/retried flush never double-applies. Conflicts are kept for a later
 * pull-and-retry; applied/duplicate/rejected are terminal and removed.
 */
export async function flushQueue(): Promise<FlushResult> {
  const pending = await getPending();
  if (pending.length === 0) return { pushed: 0, applied: 0, failed: 0 };

  const operations = pending.map((op: QueuedOp) => ({
    clientId: op.clientId,
    kind: op.kind,
    clientUpdatedAt: op.clientUpdatedAt,
    farmerId: op.farmerId,
    payload: op.payload,
  }));

  const res = await apiFetch<{ results: SyncOpResult[] }>("/sync/push", {
    method: "POST",
    body: { operations },
  });

  const results = res.results ?? [];
  const applied = results.filter(
    (r) => r.status === "applied" || r.status === "duplicate",
  ).length;
  const failed = results.filter((r) => r.status === "rejected").length;

  // Remove everything except conflicts (which want a pull-and-retry later).
  const removable = results
    .filter((r) => r.status !== "conflict")
    .map((r) => r.clientId);
  await removeOps(removable);

  return { pushed: operations.length, applied, failed };
}
