"use client";

import { RequireAuth } from "@/components/require-auth";
import { AppShell } from "@/components/app-shell";
import { FarmerForm } from "@/components/farmers/farmer-form";

export default function NewFarmerPage() {
  return (
    <RequireAuth>
      <AppShell>
        <FarmerForm />
      </AppShell>
    </RequireAuth>
  );
}
