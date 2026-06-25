"use client";

import { useSearchParams } from "next/navigation";
import { AdvisoryChat } from "@/components/advisory/advisory-chat";

/** Reads ?farmerId from the URL and pre-scopes the advisory chat. */
export function AdvisoryRoute() {
  const farmerId = useSearchParams().get("farmerId") ?? undefined;
  return <AdvisoryChat key={farmerId ?? "none"} initialFarmerId={farmerId} />;
}
