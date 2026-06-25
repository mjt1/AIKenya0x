"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { login } from "@/lib/api";
import { useAuthToken } from "@/lib/auth-context";
import { ME_QUERY_KEY } from "@/hooks/queries/use-me";
import type { AgentProfile, LoginInput } from "@/lib/types";

/** Logs in (POST /auth/login), stores the token, and seeds the me cache. */
export function useLogin() {
  const { setToken } = useAuthToken();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: LoginInput) => login(input),
    onSuccess: (res) => {
      setToken(res.access_token);
      queryClient.setQueryData<AgentProfile>(ME_QUERY_KEY, (prev) => ({
        agent: res.agent,
        caseloadSize: prev?.caseloadSize ?? 0,
      }));
      // login returns the agent but not caseload size — refetch for the real value.
      void queryClient.invalidateQueries({ queryKey: ME_QUERY_KEY });
    },
  });
}
