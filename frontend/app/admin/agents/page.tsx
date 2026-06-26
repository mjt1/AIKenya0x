"use client";

import { RequireAuth } from "@/components/require-auth";
import { RequireAdmin } from "@/components/admin/require-admin";
import { AppShell } from "@/components/app-shell";
import { AgentsAdmin } from "@/components/admin/agents-admin";

export default function AdminAgentsPage() {
  return (
    <RequireAuth>
      <RequireAdmin>
        <AppShell>
          <AgentsAdmin />
        </AppShell>
      </RequireAdmin>
    </RequireAuth>
  );
}
