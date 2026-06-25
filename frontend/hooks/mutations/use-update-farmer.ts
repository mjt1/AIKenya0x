"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import type { FarmerDetail } from "@/lib/types";

export interface UpdateFarmerInput {
  name?: string;
  phone?: string;
  gps?: string;
}

/** Update a farmer's profile (PATCH /farmers/:id). 409 if a newer server version exists. */
export function useUpdateFarmer(farmerId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateFarmerInput) =>
      apiFetch<FarmerDetail>(`/farmers/${farmerId}`, {
        method: "PATCH",
        body: input,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["farmers"] });
    },
  });
}
