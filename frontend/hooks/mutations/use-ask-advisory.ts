"use client";

import { useMutation } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import type { AdvisoryAnswer, AskAdvisoryInput } from "@/lib/types";

/** Ask a grounded, cited question (POST /advisory/ask). */
export function useAskAdvisory() {
  return useMutation({
    mutationFn: (input: AskAdvisoryInput) =>
      apiFetch<AdvisoryAnswer>("/advisory/ask", {
        method: "POST",
        body: input,
      }),
  });
}
