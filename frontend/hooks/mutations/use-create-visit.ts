"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { QUEUE_QUERY_KEY } from "@/hooks/queries/use-queue";
import type { CreateVisitInput, Visit } from "@/lib/types";

/**
 * Capture a visit (POST /farmers/:id/visits). The backend calls the AI service
 * to structure the free-text notes into observations/issues/advice. On success
 * we invalidate the queue + farmers so the capture->re-rank loop closes.
 */
export function useCreateVisit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      farmerId,
      input,
    }: {
      farmerId: string;
      input: CreateVisitInput;
    }) =>
      apiFetch<Visit>(`/farmers/${farmerId}/visits`, {
        method: "POST",
        body: input,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: QUEUE_QUERY_KEY });
      void queryClient.invalidateQueries({ queryKey: ["farmers"] });
    },
  });
}
