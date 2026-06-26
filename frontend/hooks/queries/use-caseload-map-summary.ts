"use client";

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { useAuthToken } from "@/lib/auth-context";
import type { EnterpriseType, ObservationKind } from "@/lib/types";

/** Most-severe open issue surfaced on a map pin. */
export interface MapTopIssue {
  text: string;
  severity: string | null;
  contagious: boolean;
}

/** Most recent field observation surfaced on a map pin. */
export interface MapLatestObservation {
  kind: ObservationKind | (string & {});
  text: string;
  capturedAt: string | null;
}

/** Enriched caseload card backing the map tooltip (GET /farmers/map). */
export interface MapFarmerSummary {
  id: string;
  name: string;
  phone: string;
  gps: string | null;
  lastVisitedAt: string | null;
  enterprises: EnterpriseType[];
  openIssueCount: number;
  topIssue: MapTopIssue | null;
  latestObservation: MapLatestObservation | null;
}

export const MAP_SUMMARY_QUERY_KEY = ["farmers", "map"] as const;

/**
 * Caseload cards enriched for the map tooltip: enterprise mix, last visit,
 * open issues and the latest note. Priority/band is layered on the client
 * from the recommendation queue.
 */
export function useCaseloadMapSummary() {
  const { token, isHydrated } = useAuthToken();
  return useQuery({
    queryKey: MAP_SUMMARY_QUERY_KEY,
    queryFn: () => apiFetch<MapFarmerSummary[]>("/farmers/map"),
    enabled: isHydrated && !!token,
    staleTime: 60_000,
  });
}
