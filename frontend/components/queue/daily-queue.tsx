"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { Spinner } from "@/components/ui/spinner";
import { QueueRow } from "@/components/queue/queue-row";
import { useMe } from "@/hooks/queries/use-me";
import { useQueue } from "@/hooks/queries/use-queue";
import { useGenerateQueue } from "@/hooks/mutations/use-generate-queue";
import { priorityBand, type PriorityBand } from "@/lib/priority";
import { cn } from "@/lib/utils";
import { firstName, greeting } from "@/lib/format";

const STATS: { band: PriorityBand; label: string; dot: string }[] = [
  { band: "urgent", label: "Urgent", dot: "bg-danger" },
  { band: "window", label: "Window", dot: "bg-warning" },
  { band: "routine", label: "Routine", dot: "bg-success" },
];

const HEADER_GRID =
  "md:grid md:grid-cols-[2rem_minmax(0,1fr)_7rem_8rem_10rem] md:items-center md:gap-3";

export function DailyQueue() {
  const router = useRouter();
  const me = useMe();
  const queue = useQueue();
  const generate = useGenerateQueue();

  const recs = queue.data ?? [];
  const counts: Record<PriorityBand, number> = { urgent: 0, window: 0, routine: 0 };
  for (const r of recs) counts[priorityBand(r.priority)] += 1;

  const name = me.data ? firstName(me.data.agent.name) : "";
  const caseloadSize = me.data?.caseloadSize ?? 0;
  const hasFarmers = caseloadSize > 0;

  return (
    <div className="space-y-5">
      {/* Mission bar */}
      <div className="flex flex-wrap items-center gap-4 rounded-card bg-primary-dark px-5 py-4 text-white">
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-semibold">
            {greeting()}
            {name ? `, ${name}` : ""}.
          </h2>
          <p className="mt-0.5 text-sm text-white/60">
            {recs.length > 0
              ? `${recs.length} farmer${recs.length === 1 ? "" : "s"} ranked by priority score`
              : hasFarmers
                ? "Your priority visits for today"
                : "Add a farmer to get started"}
            {hasFarmers
              ? ` \u00b7 ${caseloadSize} in caseload`
              : ""}
          </p>
        </div>

        {recs.length > 0 ? (
          <div className="flex items-center">
            {STATS.map((s) => (
              <div
                key={s.band}
                className="border-l border-white/10 px-4 text-center first:border-l-0"
              >
                <div className="text-xl font-bold tabular-nums">
                  {counts[s.band]}
                </div>
                <div className="mt-0.5 flex items-center justify-center gap-1 text-[11px] text-white/55">
                  <span className={cn("h-1.5 w-1.5 rounded-full", s.dot)} />
                  {s.label}
                </div>
              </div>
            ))}
          </div>
        ) : null}

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
          <Button size="sm" variant="secondary" onClick={() => router.push("/farmers/new")}>
            Add farmer
          </Button>
        )}
      </div>

      {/* Priority queue panel */}
      <div className="overflow-hidden rounded-card border border-outline bg-surface">
        <div className="flex items-center justify-between px-4 py-3">
          <Text variant="h3">Today&apos;s Priority Queue</Text>
          <div className="flex items-center gap-2 text-[11px] text-muted">
            <span>Ranked by unified score</span>
            {queue.isFetching ? (
              <Spinner className="h-3.5 w-3.5 animate-spin text-muted" />
            ) : null}
          </div>
        </div>

        {/* Column header (desktop) */}
        {recs.length > 0 ? (
          <div
            className={cn(
              "hidden border-b border-outline px-4 py-2 text-[11px] font-medium text-muted",
              HEADER_GRID,
            )}
          >
            <div>#</div>
            <div>Farmer &middot; Reason</div>
            <div>Type</div>
            <div>Score</div>
            <div className="md:text-right">Risk &middot; Action</div>
          </div>
        ) : null}

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
          <>
            <div>
              {recs.map((rec, i) => (
                <QueueRow key={rec.id} rec={rec} rank={i + 1} />
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-outline bg-surface-muted px-4 py-2 text-[11px] text-muted">
              <span className="flex items-center gap-1.5">
                <span className="h-1.5 w-3 rounded-full bg-danger" /> Urgent (75+)
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-1.5 w-3 rounded-full bg-warning" /> Window (45-74)
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-1.5 w-3 rounded-full bg-success" /> Routine (below 45)
              </span>
              <span className="ml-auto">Score 0-100 &middot; higher = more urgent</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
