"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchProfile } from "@/lib/api";
import { useAuthToken } from "@/lib/auth-context";

export const ME_QUERY_KEY = ["me"] as const;

/** Current agent profile + caseload size (GET /auth/me). Runs once a token exists. */
export function useMe() {
  const { token, isHydrated } = useAuthToken();
  return useQuery({
    queryKey: ME_QUERY_KEY,
    queryFn: fetchProfile,
    enabled: isHydrated && !!token,
    retry: false,
    staleTime: 60_000,
  });
}
