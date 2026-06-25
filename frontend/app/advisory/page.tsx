"use client";

import { Suspense } from "react";
import { RequireAuth } from "@/components/require-auth";
import { AppShell } from "@/components/app-shell";
import { AdvisoryRoute } from "@/components/advisory/advisory-route";
import { Spinner } from "@/components/ui/spinner";

export default function AdvisoryPage() {
  return (
    <RequireAuth>
      <AppShell>
        <Suspense
          fallback={
            <div className="py-12 text-center">
              <Spinner className="mx-auto h-6 w-6 animate-spin text-primary" />
            </div>
          }
        >
          <AdvisoryRoute />
        </Suspense>
      </AppShell>
    </RequireAuth>
  );
}
