"use client";

import type { CreateVisitInput } from "@/lib/types";

/**
 * IndexedDB outbound queue for operations captured while offline (US-15).
 * Each op mirrors the backend /sync/push contract and carries an idempotency
 * clientId so replays are safe.
 */

const DB_NAME = "suluhu-offline";
const STORE = "outbound";
const DB_VERSION = 1;

/** Fired (on window) whenever the queue changes, so the UI can refresh counts. */
export const QUEUE_CHANGED_EVENT = "suluhu:queue-changed";

export type SyncOpKind =
  | "farmer.create"
  | "farmer.update"
  | "enterprise.create"
  | "visit.create";

export interface QueuedOp {
  clientId: string;
  kind: SyncOpKind;
  clientUpdatedAt: string;
  farmerId?: string;
  payload: unknown;
  /** Human label for the pending-sync UI. */
  label: string;
  queuedAt: string;
}

function idbAvailable(): boolean {
  return typeof window !== "undefined" && "indexedDB" in window;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "clientId" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function emitChanged(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(QUEUE_CHANGED_EVENT));
  }
}

/** Queue a visit captured offline. Returns the idempotency clientId. */
export async function enqueueVisit(
  farmerId: string,
  input: CreateVisitInput,
  farmerName?: string,
): Promise<string> {
  const op: QueuedOp = {
    clientId: newId(),
    kind: "visit.create",
    clientUpdatedAt: new Date().toISOString(),
    farmerId,
    payload: input,
    label: `Visit \u2014 ${farmerName ?? "farmer"}`,
    queuedAt: new Date().toISOString(),
  };
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).add(op);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
  emitChanged();
  return op.clientId;
}

/** All queued operations, oldest first. */
export async function getPending(): Promise<QueuedOp[]> {
  if (!idbAvailable()) return [];
  const db = await openDb();
  const ops = await new Promise<QueuedOp[]>((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).getAll();
    req.onsuccess = () => resolve((req.result as QueuedOp[]) ?? []);
    req.onerror = () => reject(req.error);
  });
  db.close();
  return ops.sort((a, b) => a.queuedAt.localeCompare(b.queuedAt));
}

/** Delete ops the server has acknowledged. */
export async function removeOps(clientIds: string[]): Promise<void> {
  if (!idbAvailable() || clientIds.length === 0) return;
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    const store = tx.objectStore(STORE);
    clientIds.forEach((id) => store.delete(id));
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
  emitChanged();
}

export async function countPending(): Promise<number> {
  return (await getPending()).length;
}
