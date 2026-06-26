"use client";

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { useAuthToken } from "@/lib/auth-context";
import type { KbDocument } from "@/lib/types";

export const KB_DOCUMENTS_QUERY_KEY = ["admin", "kb", "documents"] as const;

/** Uploaded reference documents with chunk counts (GET /admin/kb/documents). */
export function useKbDocuments() {
  const { token, isHydrated } = useAuthToken();
  return useQuery({
    queryKey: KB_DOCUMENTS_QUERY_KEY,
    queryFn: () => apiFetch<KbDocument[]>("/admin/kb/documents"),
    enabled: isHydrated && !!token,
    staleTime: 30_000,
  });
}
