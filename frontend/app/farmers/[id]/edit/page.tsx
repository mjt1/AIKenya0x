"use client";

import { useParams } from "next/navigation";
import { RequireAuth } from "@/components/require-auth";
import { AppShell } from "@/components/app-shell";
import { FarmerEditForm } from "@/components/farmers/farmer-edit-form";

export default function EditFarmerPage() {
  const params = useParams<{ id: string }>();
  return (
    <RequireAuth>
      <AppShell>
        <FarmerEditForm farmerId={params.id} />
      </AppShell>
    </RequireAuth>
  );
}
