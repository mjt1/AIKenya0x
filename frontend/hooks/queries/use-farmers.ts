"use client";

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { useAuthToken } from "@/lib/auth-context";
import type { FarmerListItem } from "@/lib/types";

export const FARMERS_QUERY_KEY = ["farmers"] as const;

/** The agent's caseload (GET /farmers), oldest-visited first. */
export function useFarmers() {
  const { token, isHydrated } = useAuthToken();
  return useQuery({
    queryKey: FARMERS_QUERY_KEY,
    queryFn: () => apiFetch<FarmerListItem[]>("/farmers"),
    enabled: isHydrated && !!token,
    staleTime: 60_000,
  });
}
