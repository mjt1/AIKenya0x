"use client";

import { RequireAuth } from "@/components/require-auth";
import { AppShell } from "@/components/app-shell";
import { DailyQueue } from "@/components/queue/daily-queue";

export default function QueuePage() {
  return (
    <RequireAuth>
      <AppShell>
        <DailyQueue />
      </AppShell>
    </RequireAuth>
  );
}
