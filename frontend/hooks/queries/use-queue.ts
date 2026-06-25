"use client";

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { useAuthToken } from "@/lib/auth-context";
import type { Recommendation } from "@/lib/types";

export const QUEUE_QUERY_KEY = ["recommendations", "pending"] as const;

/** The Daily Queue: pending recommendations, ranked most-urgent first. */
export function useQueue() {
  const { token, isHydrated } = useAuthToken();
  return useQuery({
    queryKey: QUEUE_QUERY_KEY,
    queryFn: () => apiFetch<Recommendation[]>("/recommendations"),
    enabled: isHydrated && !!token,
    retry: false,
    staleTime: 30_000,
    select: (data) => [...data].sort((a, b) => b.priority - a.priority),
  });
}
