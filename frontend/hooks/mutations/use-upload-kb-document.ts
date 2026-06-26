"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { KB_DOCUMENTS_QUERY_KEY } from "@/hooks/queries/use-kb-documents";
import { ADMIN_OVERVIEW_QUERY_KEY } from "@/hooks/queries/use-admin-analytics";
import type { KbUploadResult, UploadDocumentInput } from "@/lib/types";

/** Upload a reference doc; server chunks + embeds it (POST /admin/kb/documents). */
export function useUploadKbDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UploadDocumentInput) =>
      apiFetch<KbUploadResult>("/admin/kb/documents", {
        method: "POST",
        body: input,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: KB_DOCUMENTS_QUERY_KEY });
      void queryClient.invalidateQueries({ queryKey: ADMIN_OVERVIEW_QUERY_KEY });
    },
  });
}
