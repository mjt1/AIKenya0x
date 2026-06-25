"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { StatCard } from "@/components/stat-card";
import { Spinner } from "@/components/ui/spinner";
import { QueueRow } from "@/components/queue/queue-row";
import { useMe } from "@/hooks/queries/use-me";
import { useQueue } from "@/hooks/queries/use-queue";
import { useGenerateQueue } from "@/hooks/mutations/use-generate-queue";
import { priorityBand, type PriorityBand } from "@/lib/priority";
import { firstName, greeting } from "@/lib/format";

export function DailyQueue() {
  const router = useRouter();
  const me = useMe();
  const queue = useQueue();
  const generate = useGenerateQueue();

  const recs = queue.data ?? [];
  const counts: Record<PriorityBand, number> = {
    urgent: 0,
    window: 0,
    routine: 0,
  };
  for (const r of recs) counts[priorityBand(r.priority)] += 1;

  const name = me.data ? firstName(me.data.agent.name) : "";
  const caseloadSize = me.data?.caseloadSize ?? 0;
  const hasFarmers = caseloadSize > 0;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Text variant="h1">
            {greeting()}
            {name ? `, ${name}` : ""}.
          </Text>
          <Text variant="muted" className="mt-1">
            {recs.length > 0
              ? `${recs.length} farmer${recs.length === 1 ? "" : "s"} need your attention today.`
              : hasFarmers
                ? "Your priority visits for today."
                : "Add a farmer to get started."}
          </Text>
        </div>
        {hasFarmers ? (
          <Button
            variant="secondary"
            size="sm"
            loading={generate.isPending}
            onClick={() => generate.mutate()}
          >
            Regenerate
          </Button>
        ) : (
          <Button size="sm" onClick={() => router.push("/farmers/new")}>
            Add farmer
          </Button>
        )}
      </header>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Urgent" value={counts.urgent} emphasis />
        <StatCard label="Window closing" value={counts.window} />
        <StatCard label="Routine" value={counts.routine} />
      </div>

      <div className="rounded-card border border-outline bg-surface">
        <div className="flex items-center justify-between border-b border-outline px-4 py-3">
          <Text variant="h3">Priority queue</Text>
          {queue.isFetching ? (
            <Spinner className="h-4 w-4 animate-spin text-muted" />
          ) : null}
        </div>

        {queue.isPending ? (
          <div className="px-4 py-12 text-center">
            <Spinner className="mx-auto h-6 w-6 animate-spin text-primary" />
          </div>
        ) : queue.isError ? (
          <div className="px-4 py-12 text-center">
            <Text variant="muted">Couldn&apos;t load your queue.</Text>
            <div className="mt-3">
              <Button size="sm" variant="secondary" onClick={() => queue.refetch()}>
                Retry
              </Button>
            </div>
          </div>
        ) : recs.length === 0 ? (
          !hasFarmers ? (
            <div className="px-4 py-12 text-center">
              <Text variant="h3">No farmers yet</Text>
              <Text variant="muted" className="mt-1">
                Add your first farmer to start building today&apos;s queue.
              </Text>
              <div className="mt-4">
                <Button size="sm" onClick={() => router.push("/farmers/new")}>
                  Add a farmer
                </Button>
              </div>
            </div>
          ) : (
            <div className="px-4 py-12 text-center">
              <Text variant="h3">You&apos;re all caught up</Text>
              <Text variant="muted" className="mt-1">
                No pending visits in your queue right now.
              </Text>
              <div className="mt-4">
                <Button
                  size="sm"
                  loading={generate.isPending}
                  onClick={() => generate.mutate()}
                >
                  Regenerate queue
                </Button>
              </div>
            </div>
          )
        ) : (
          <div>
            {recs.map((rec, i) => (
              <QueueRow key={rec.id} rec={rec} rank={i + 1} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
