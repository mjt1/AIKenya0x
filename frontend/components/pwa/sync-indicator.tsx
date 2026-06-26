"use client";

import { Spinner } from "@/components/ui/spinner";
import { useOfflineSync } from "@/hooks/use-offline-sync";

/**
 * Compact connectivity + pending-sync chip. Hidden entirely when online with
 * nothing queued; otherwise shows offline state or a one-tap manual sync.
 */
export function SyncIndicator() {
  const { online, pending, syncing, syncNow } = useOfflineSync();

  if (online && pending === 0 && !syncing) return null;

  const label = !online
    ? pending > 0
      ? `Offline · ${pending} queued`
      : "Offline"
    : syncing
      ? "Syncing…"
      : `${pending} to sync`;

  return (
    <button
      type="button"
      onClick={syncNow}
      disabled={!online || syncing}
      title={
        online
          ? "Sync captures saved offline"
          : "You're offline — captures are saved on this device"
      }
      className="inline-flex items-center gap-2 rounded-full border border-outline bg-surface px-3 py-1 text-xs font-medium text-foreground shadow-sm disabled:cursor-default"
    >
      {syncing ? (
        <Spinner className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <span
          className={`h-2 w-2 rounded-full ${online ? "bg-primary" : "bg-danger"}`}
        />
      )}
      <span>{label}</span>
    </button>
  );
}
