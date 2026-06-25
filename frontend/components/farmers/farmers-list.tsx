"use client";

import { useRouter } from "next/navigation";
import { Text } from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { FarmerListRow } from "@/components/farmers/farmer-list-row";
import { useFarmers } from "@/hooks/queries/use-farmers";

export function FarmersList() {
  const router = useRouter();
  const farmers = useFarmers();
  const items = farmers.data ?? [];

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Text variant="h1">Farmers</Text>
          <Text variant="muted" className="mt-1">
            {items.length > 0
              ? `${items.length} in your caseload.`
              : "Your caseload."}
          </Text>
        </div>
        <Button size="sm" onClick={() => router.push("/farmers/new")}>
          Add farmer
        </Button>
      </header>

      <div className="rounded-card border border-outline bg-surface">
        {farmers.isPending ? (
          <div className="px-4 py-12 text-center">
            <Spinner className="mx-auto h-6 w-6 animate-spin text-primary" />
          </div>
        ) : farmers.isError ? (
          <div className="px-4 py-12 text-center">
            <Text variant="muted">Couldn&apos;t load your caseload.</Text>
            <div className="mt-3">
              <Button size="sm" variant="secondary" onClick={() => farmers.refetch()}>
                Retry
              </Button>
            </div>
          </div>
        ) : items.length === 0 ? (
          <div className="px-4 py-12 text-center">
            <Text variant="h3">No farmers yet</Text>
            <Text variant="muted" className="mt-1">
              Register your first farmer to start building a caseload.
            </Text>
            <div className="mt-4">
              <Button size="sm" onClick={() => router.push("/farmers/new")}>
                Add farmer
              </Button>
            </div>
          </div>
        ) : (
          <div>
            {items.map((f) => (
              <FarmerListRow key={f.id} farmer={f} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
