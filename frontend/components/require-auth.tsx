"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthToken } from "@/lib/auth-context";
import { useMe } from "@/hooks/queries/use-me";
import { FullScreenLoader } from "./ui/spinner";

/**
 * Gates a page behind authentication. No token -> /login. Invalid/expired token
 * (me query 401s) -> clear + /login. While resolving, shows a loader so
 * protected content never flashes.
 */
export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { token, isHydrated, clearToken } = useAuthToken();
  const me = useMe();
  const router = useRouter();

  useEffect(() => {
    if (isHydrated && !token) router.replace("/login");
  }, [isHydrated, token, router]);

  useEffect(() => {
    if (me.isError) {
      clearToken();
      router.replace("/login");
    }
  }, [me.isError, clearToken, router]);

  if (!isHydrated || !token || me.isPending || !me.data) {
    return <FullScreenLoader label="Checking your session…" />;
  }
  return <>{children}</>;
}
