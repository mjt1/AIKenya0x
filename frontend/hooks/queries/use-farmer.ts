"use client";

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { useAuthToken } from "@/lib/auth-context";
import type { FarmerDetail } from "@/lib/types";

/** A single farmer with enterprises + assets (GET /farmers/:id). */
export function useFarmer(id: string | null) {
  const { token, isHydrated } = useAuthToken();
  return useQuery({
    queryKey: ["farmers", id ?? "none"],
    queryFn: () => apiFetch<FarmerDetail>(`/farmers/${id}`),
    enabled: isHydrated && !!token && !!id,
    staleTime: 60_000,
  });
}
