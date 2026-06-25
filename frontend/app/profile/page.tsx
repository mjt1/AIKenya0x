"use client";

import { RequireAuth } from "@/components/require-auth";
import { AppShell } from "@/components/app-shell";
import { ProfileSummary } from "@/components/profile-summary";

export default function ProfilePage() {
  return (
    <RequireAuth>
      <AppShell>
        <ProfileSummary />
      </AppShell>
    </RequireAuth>
  );
}
