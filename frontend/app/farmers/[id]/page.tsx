"use client";

import { useParams } from "next/navigation";
import { RequireAuth } from "@/components/require-auth";
import { AppShell } from "@/components/app-shell";
import { FarmerDetailView } from "@/components/farmers/farmer-detail-view";

export default function FarmerDetailPage() {
  const params = useParams<{ id: string }>();
  return (
    <RequireAuth>
      <AppShell>
        <FarmerDetailView farmerId={params.id} />
      </AppShell>
    </RequireAuth>
  );
}
