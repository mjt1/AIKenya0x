"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useCallback } from "react";
import { useAuthToken } from "@/lib/auth-context";

/** Clears the token + cached queries and returns to the login screen. */
export function useLogout() {
  const { clearToken } = useAuthToken();
  const queryClient = useQueryClient();
  const router = useRouter();
  return useCallback(() => {
    clearToken();
    queryClient.clear();
    router.replace("/login");
  }, [clearToken, queryClient, router]);
}
