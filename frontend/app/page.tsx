"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthToken } from "@/lib/auth-context";
import { FullScreenLoader } from "@/components/ui/spinner";

/**
 * Home is an auth gate: signed-in agents go to the Daily Queue, everyone else
 * to login.
 */
export default function HomePage() {
  const { token, isHydrated } = useAuthToken();
  const router = useRouter();

  useEffect(() => {
    if (!isHydrated) return;
    router.replace(token ? "/queue" : "/login");
  }, [isHydrated, token, router]);

  return <FullScreenLoader label="Loading Suluhu…" />;
}
