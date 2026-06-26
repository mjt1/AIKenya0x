"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { ADMIN_AGENTS_QUERY_KEY } from "@/hooks/queries/use-admin-agents";
import { ADMIN_BY_AGENT_QUERY_KEY } from "@/hooks/queries/use-admin-analytics";
import type { PublicAgent, UpdateAgentRoleInput } from "@/lib/types";

/** Change an agent's role (PATCH /admin/agents/:id/role). Admin only. */
export function useUpdateAgentRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, role }: UpdateAgentRoleInput) =>
      apiFetch<PublicAgent>(`/admin/agents/${id}/role`, {
        method: "PATCH",
        body: { role },
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ADMIN_AGENTS_QUERY_KEY });
      void queryClient.invalidateQueries({ queryKey: ADMIN_BY_AGENT_QUERY_KEY });
    },
  });
}
