"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { ME_QUERY_KEY } from "@/hooks/queries/use-me";
import { FARMERS_QUERY_KEY } from "@/hooks/queries/use-farmers";
import type { CreateFarmerInput, FarmerDetail } from "@/lib/types";

/** Register a farmer + enterprises (POST /farmers). Bumps caseload size. */
export function useCreateFarmer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateFarmerInput) =>
      apiFetch<FarmerDetail>("/farmers", { method: "POST", body: input }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: FARMERS_QUERY_KEY });
      void queryClient.invalidateQueries({ queryKey: ME_QUERY_KEY });
    },
  });
}
