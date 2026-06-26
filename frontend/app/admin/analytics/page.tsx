"use client";

import { RequireAuth } from "@/components/require-auth";
import { RequireAdmin } from "@/components/admin/require-admin";
import { AppShell } from "@/components/app-shell";
import { AdminAnalytics } from "@/components/admin/admin-analytics";

export default function AdminAnalyticsPage() {
  return (
    <RequireAuth>
      <RequireAdmin>
        <AppShell>
          <AdminAnalytics />
        </AppShell>
      </RequireAdmin>
    </RequireAuth>
  );
}
