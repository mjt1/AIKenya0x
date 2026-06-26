"use client";

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { useAuthToken } from "@/lib/auth-context";
import type { PublicAgent } from "@/lib/types";

export const ADMIN_AGENTS_QUERY_KEY = ["admin", "agents"] as const;

/** Every agent on the platform (GET /admin/agents). Admin only. */
export function useAdminAgents() {
  const { token, isHydrated } = useAuthToken();
  return useQuery({
    queryKey: ADMIN_AGENTS_QUERY_KEY,
    queryFn: () => apiFetch<PublicAgent[]>("/admin/agents"),
    enabled: isHydrated && !!token,
    staleTime: 30_000,
  });
}
