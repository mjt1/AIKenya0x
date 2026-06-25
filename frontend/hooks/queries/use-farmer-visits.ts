"use client";

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { useAuthToken } from "@/lib/auth-context";
import type { Visit } from "@/lib/types";

/** Visit history for a farmer (GET /farmers/:id/visits), newest first. */
export function useFarmerVisits(id: string | null) {
  const { token, isHydrated } = useAuthToken();
  return useQuery({
    queryKey: ["farmers", id ?? "none", "visits"],
    queryFn: () => apiFetch<Visit[]>(`/farmers/${id}/visits`),
    enabled: isHydrated && !!token && !!id,
    staleTime: 30_000,
    select: (data) =>
      [...data].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
      ),
  });
}
