"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useMe } from "@/hooks/queries/use-me";
import { FullScreenLoader } from "@/components/ui/spinner";

/**
 * Gates a page behind the admin role. Use INSIDE <RequireAuth>, which already
 * ensures a valid session. Non-admins are bounced to the agent home so the
 * admin UI never flashes for them.
 */
export function RequireAdmin({ children }: { children: React.ReactNode }) {
  const me = useMe();
  const router = useRouter();
  const role = me.data?.agent.role;

  useEffect(() => {
    if (me.data && role !== "admin") router.replace("/queue");
  }, [me.data, role, router]);

  if (me.isPending || !me.data) {
    return <FullScreenLoader label="Checking access…" />;
  }
  if (role !== "admin") {
    return <FullScreenLoader label="Redirecting…" />;
  }
  return <>{children}</>;
}
