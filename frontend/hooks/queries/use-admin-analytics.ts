"use client";

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { useAuthToken } from "@/lib/auth-context";
import type { AdminAnalyticsOverview, AdminAgentRollup } from "@/lib/types";

export const ADMIN_OVERVIEW_QUERY_KEY = ["admin", "analytics", "overview"] as const;
export const ADMIN_BY_AGENT_QUERY_KEY = ["admin", "analytics", "agents"] as const;

/** Platform totals (GET /admin/analytics/overview). Admin only. */
export function useAdminOverview() {
  const { token, isHydrated } = useAuthToken();
  return useQuery({
    queryKey: ADMIN_OVERVIEW_QUERY_KEY,
    queryFn: () => apiFetch<AdminAnalyticsOverview>("/admin/analytics/overview"),
    enabled: isHydrated && !!token,
    staleTime: 30_000,
  });
}

/** Per-agent rollups (GET /admin/analytics/agents). Admin only. */
export function useAdminByAgent() {
  const { token, isHydrated } = useAuthToken();
  return useQuery({
    queryKey: ADMIN_BY_AGENT_QUERY_KEY,
    queryFn: () => apiFetch<AdminAgentRollup[]>("/admin/analytics/agents"),
    enabled: isHydrated && !!token,
    staleTime: 30_000,
  });
}
