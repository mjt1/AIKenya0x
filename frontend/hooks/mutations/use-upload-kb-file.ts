"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { KB_DOCUMENTS_QUERY_KEY } from "@/hooks/queries/use-kb-documents";
import { ADMIN_OVERVIEW_QUERY_KEY } from "@/hooks/queries/use-admin-analytics";
import type { KbUploadResult, UploadDocumentFileInput } from "@/lib/types";

/**
 * Upload a reference *file* (PDF or text); the server extracts the text,
 * then chunks + embeds it (POST /admin/kb/documents/file, multipart).
 * Lets admins feed a long manual without pasting it.
 */
export function useUploadKbFile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UploadDocumentFileInput) => {
      const form = new FormData();
      form.append("file", input.file);
      form.append("title", input.title);
      form.append("source", input.source);
      if (input.enterprise) form.append("enterprise", input.enterprise);
      return apiFetch<KbUploadResult>("/admin/kb/documents/file", {
        method: "POST",
        body: form,
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: KB_DOCUMENTS_QUERY_KEY });
      void queryClient.invalidateQueries({ queryKey: ADMIN_OVERVIEW_QUERY_KEY });
    },
  });
}
