"use client";

import { useRouter } from "next/navigation";
import { Text } from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { EnterpriseCard } from "@/components/farmers/enterprise-card";
import { VisitTimeline } from "@/components/farmers/visit-timeline";
import { QueueRow } from "@/components/queue/queue-row";
import { useFarmer } from "@/hooks/queries/use-farmer";
import { useFarmerVisits } from "@/hooks/queries/use-farmer-visits";
import { useQueue } from "@/hooks/queries/use-queue";

function lastVisitedLabel(iso: string | null): string {
  if (!iso) return "Never";
  return new Date(iso).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function FarmerDetailView({ farmerId }: { farmerId: string }) {
  const router = useRouter();
  const farmer = useFarmer(farmerId);
  const visits = useFarmerVisits(farmerId);
  const queue = useQueue();

  if (farmer.isPending) {
    return (
      <div className="py-12 text-center">
        <Spinner className="mx-auto h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (farmer.isError || !farmer.data) {
    return (
      <div className="py-12 text-center">
        <Text variant="h3">Farmer not found</Text>
        <Text variant="muted" className="mt-1">
          This farmer isn&apos;t in your caseload.
        </Text>
        <div className="mt-4">
          <Button size="sm" variant="secondary" onClick={() => router.push("/farmers")}>
            Back to farmers
          </Button>
        </div>
      </div>
    );
  }

  const f = farmer.data;
  const recs = (queue.data ?? []).filter((r) => r.farmer.id === f.id);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <Text variant="h1">{f.name}</Text>
          <Text variant="muted" className="mt-1">
            {f.phone}
            {f.gps ? ` · ${f.gps}` : ""} · Last visit{" "}
            {lastVisitedLabel(f.lastVisitedAt)}
          </Text>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => router.push(`/farmers/${f.id}/edit`)}
          >
            Edit
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => router.push(`/advisory?farmerId=${f.id}`)}
          >
            Ask advisory
          </Button>
          <Button size="sm" onClick={() => router.push(`/capture?farmerId=${f.id}`)}>
            Log visit
          </Button>
        </div>
      </header>

      {recs.length > 0 ? (
        <section>
          <Text variant="overline">Recommended next</Text>
          <div className="mt-2 rounded-card border border-outline bg-surface">
            {recs.map((r, i) => (
              <QueueRow key={r.id} rec={r} rank={i + 1} />
            ))}
          </div>
        </section>
      ) : null}

      <section>
        <Text variant="overline">Enterprises</Text>
        <div className="mt-2 grid gap-4 sm:grid-cols-2">
          {f.enterprises.length > 0 ? (
            f.enterprises.map((e) => <EnterpriseCard key={e.id} enterprise={e} />)
          ) : (
            <Text variant="muted">No enterprises registered.</Text>
          )}
        </div>
      </section>

      <section>
        <div className="flex items-center justify-between">
          <Text variant="overline">Visit history</Text>
          {visits.isFetching ? (
            <Spinner className="h-4 w-4 animate-spin text-muted" />
          ) : null}
        </div>
        <div className="mt-2">
          {visits.isPending ? (
            <Spinner className="h-5 w-5 animate-spin text-primary" />
          ) : visits.isError ? (
            <Text variant="muted">Couldn&apos;t load visits.</Text>
          ) : (
            <VisitTimeline visits={visits.data ?? []} />
          )}
        </div>
      </section>
    </div>
  );
}
