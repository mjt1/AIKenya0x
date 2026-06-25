"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { QUEUE_QUERY_KEY } from "@/hooks/queries/use-queue";
import type { GenerateQueueResult } from "@/lib/types";

/** Rebuilds the recommendation queue (rule-based candidates -> AI-ranked -> persisted). */
export function useGenerateQueue() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () =>
      apiFetch<GenerateQueueResult>("/recommendations/generate", {
        method: "POST",
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: QUEUE_QUERY_KEY });
    },
  });
}
