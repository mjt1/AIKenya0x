"use client";

import { useSearchParams } from "next/navigation";
import { CaptureForm } from "@/components/capture/capture-form";

/** Reads ?farmerId from the URL and prefills the capture form. */
export function CaptureRoute() {
  const farmerId = useSearchParams().get("farmerId") ?? undefined;
  // key remounts the form when the target farmer changes via the URL.
  return <CaptureForm key={farmerId ?? "none"} initialFarmerId={farmerId} />;
}
