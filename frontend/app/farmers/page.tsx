"use client";

import { RequireAuth } from "@/components/require-auth";
import { AppShell } from "@/components/app-shell";
import { FarmersList } from "@/components/farmers/farmers-list";

export default function FarmersPage() {
  return (
    <RequireAuth>
      <AppShell>
        <FarmersList />
      </AppShell>
    </RequireAuth>
  );
}
