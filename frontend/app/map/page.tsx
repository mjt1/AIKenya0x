"use client";

import { RequireAuth } from "@/components/require-auth";
import { AppShell } from "@/components/app-shell";
import { CaseloadMap } from "@/components/map/caseload-map";

export default function MapPage() {
  return (
    <RequireAuth>
      <AppShell>
        <CaseloadMap />
      </AppShell>
    </RequireAuth>
  );
}
