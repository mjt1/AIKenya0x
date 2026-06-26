"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { ADMIN_AGENTS_QUERY_KEY } from "@/hooks/queries/use-admin-agents";
import {
  ADMIN_BY_AGENT_QUERY_KEY,
  ADMIN_OVERVIEW_QUERY_KEY,
} from "@/hooks/queries/use-admin-analytics";
import type { CreateAgentInput, PublicAgent } from "@/lib/types";

/** Create an agent (POST /admin/agents). Admin only. */
export function useCreateAgent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateAgentInput) =>
      apiFetch<PublicAgent>("/admin/agents", { method: "POST", body: input }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ADMIN_AGENTS_QUERY_KEY });
      void queryClient.invalidateQueries({ queryKey: ADMIN_BY_AGENT_QUERY_KEY });
      void queryClient.invalidateQueries({ queryKey: ADMIN_OVERVIEW_QUERY_KEY });
    },
  });
}
