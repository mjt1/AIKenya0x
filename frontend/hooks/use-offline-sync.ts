"use client";

import { useCallback, useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { countPending, QUEUE_CHANGED_EVENT } from "@/lib/offline/queue";
import { flushQueue } from "@/lib/offline/sync";
import { QUEUE_QUERY_KEY } from "@/hooks/queries/use-queue";
import { FARMERS_QUERY_KEY } from "@/hooks/queries/use-farmers";

export interface OfflineSync {
  online: boolean;
  pending: number;
  syncing: boolean;
  syncNow: () => void;
}

/**
 * Tracks connectivity + the offline outbound queue. Flushes automatically on
 * reconnect (and on mount if online) so captures made offline sync without the
 * agent doing anything. Refreshes the queue + caseload views after a sync.
 */
export function useOfflineSync(): OfflineSync {
  const queryClient = useQueryClient();
  const [online, setOnline] = useState(true);
  const [pending, setPending] = useState(0);
  const [syncing, setSyncing] = useState(false);

  const refreshPending = useCallback(() => {
    void countPending()
      .then(setPending)
      .catch(() => {});
  }, []);

  const syncNow = useCallback(() => {
    if (typeof navigator !== "undefined" && !navigator.onLine) return;
    setSyncing(true);
    void flushQueue()
      .then((res) => {
        if (res.applied > 0) {
          void queryClient.invalidateQueries({ queryKey: QUEUE_QUERY_KEY });
          void queryClient.invalidateQueries({ queryKey: FARMERS_QUERY_KEY });
        }
      })
      .catch(() => {})
      .finally(() => {
        setSyncing(false);
        refreshPending();
      });
  }, [queryClient, refreshPending]);

  useEffect(() => {
    setOnline(navigator.onLine);
    refreshPending();

    const onOnline = () => {
      setOnline(true);
      syncNow();
    };
    const onOffline = () => setOnline(false);

    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    window.addEventListener(QUEUE_CHANGED_EVENT, refreshPending);

    if (navigator.onLine) syncNow();

    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      window.removeEventListener(QUEUE_CHANGED_EVENT, refreshPending);
    };
  }, [syncNow, refreshPending]);

  return { online, pending, syncing, syncNow };
}
