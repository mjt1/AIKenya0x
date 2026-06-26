"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { KB_DOCUMENTS_QUERY_KEY } from "@/hooks/queries/use-kb-documents";
import { ADMIN_OVERVIEW_QUERY_KEY } from "@/hooks/queries/use-admin-analytics";
import type { KbDeleteResult } from "@/lib/types";

/** Delete a document and its chunks (DELETE /admin/kb/documents/:id). */
export function useDeleteKbDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<KbDeleteResult>(`/admin/kb/documents/${id}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: KB_DOCUMENTS_QUERY_KEY });
      void queryClient.invalidateQueries({ queryKey: ADMIN_OVERVIEW_QUERY_KEY });
    },
  });
}
