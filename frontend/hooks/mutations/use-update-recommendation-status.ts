"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { QUEUE_QUERY_KEY } from "@/hooks/queries/use-queue";
import type { Recommendation, RecommendationStatus } from "@/lib/types";

export interface UpdateRecommendationStatusInput {
  id: string;
  status: RecommendationStatus;
  /** Optional free-text outcome note. Encouraged for partly_done / not_done. */
  note?: string;
}

/**
 * Record a recommendation outcome (done / partly_done / not_done / dismissed /
 * snoozed / pending), with an optional note, and refresh the queue.
 */
export function useUpdateRecommendationStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status, note }: UpdateRecommendationStatusInput) =>
      apiFetch<Recommendation>(`/recommendations/${id}/status`, {
        method: "PATCH",
        body: note !== undefined ? { status, note } : { status },
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: QUEUE_QUERY_KEY });
    },
  });
}
