"use client";

import { RequireAuth } from "@/components/require-auth";
import { RequireAdmin } from "@/components/admin/require-admin";
import { AppShell } from "@/components/app-shell";
import { KbAdmin } from "@/components/admin/kb-admin";

export default function AdminKnowledgePage() {
  return (
    <RequireAuth>
      <RequireAdmin>
        <AppShell>
          <KbAdmin />
        </AppShell>
      </RequireAdmin>
    </RequireAuth>
  );
}
