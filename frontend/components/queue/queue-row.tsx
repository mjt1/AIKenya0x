"use client";

import { useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScoreBar } from "@/components/queue/score-bar";
import { RecommendationOutcome } from "@/components/queue/recommendation-outcome";
import { useUpdateRecommendationStatus } from "@/hooks/mutations/use-update-recommendation-status";
import { priorityBand, BAND_META } from "@/lib/priority";
import { kindLabel } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Recommendation } from "@/lib/types";

// Must match the column header grid in daily-queue.tsx.
const ROW_GRID =
  "md:grid md:grid-cols-[2rem_minmax(0,1fr)_7rem_8rem_10rem] md:items-center md:gap-3";

const TONE_TEXT: Record<string, string> = {
  danger: "text-danger",
  warning: "text-warning",
  success: "text-success",
};

export function QueueRow({ rec, rank }: { rec: Recommendation; rank: number }) {
  const update = useUpdateRecommendationStatus();
  const [loggingOutcome, setLoggingOutcome] = useState(false);
  const meta = BAND_META[priorityBand(rec.priority)];
  const toneText = TONE_TEXT[meta.tone] ?? "text-foreground";
  const pendingStatus = update.isPending ? update.variables?.status : undefined;

  return (
    <div className="border-b border-outline px-4 py-3 last:border-b-0">
      <div className={cn("flex flex-col gap-2", ROW_GRID)}>
        {/* Rank */}
        <div className={cn("text-base font-bold tabular-nums", toneText)}>
          {rank}
        </div>

        {/* Farmer + reason */}
        <div className="min-w-0">
          <Link
            href={`/farmers/${rec.farmer.id}`}
            className="font-semibold text-foreground hover:text-primary hover:underline"
          >
            {rec.farmer.name}
          </Link>
          <p className="mt-0.5 text-[13px] text-muted">{rec.reason}</p>
          {rec.rationale ? (
            <p className="mt-0.5 text-xs text-faint">{rec.rationale}</p>
          ) : null}
        </div>

        {/* Type (recommendation kind) */}
        <div className="min-w-0">
          <Badge tone="neutral">{kindLabel(rec.kind)}</Badge>
        </div>

        {/* Score */}
        <div>
          <div className={cn("text-sm font-semibold tabular-nums", toneText)}>
            {rec.priority}
          </div>
          <div className="mt-1 max-w-[7rem]">
            <ScoreBar value={rec.priority} />
          </div>
        </div>

        {/* Risk + primary action */}
        <div className="flex items-center gap-2 md:flex-col md:items-end md:gap-1.5">
          <Badge tone={meta.tone}>{meta.label}</Badge>
          <Link
            href={`/capture?farmerId=${rec.farmer.id}`}
            className="inline-flex items-center rounded-md border border-primary/40 px-2.5 py-1 text-xs font-medium text-primary transition-colors hover:bg-primary-container"
          >
            Log visit
          </Link>
        </div>
      </div>

      {/* Resolve actions (preserved) */}
      {!loggingOutcome ? (
        <div className="mt-2 flex flex-wrap gap-1.5 md:justify-end">
          <Button
            size="sm"
            loading={pendingStatus === "done"}
            disabled={update.isPending}
            onClick={() => update.mutate({ id: rec.id, status: "done" })}
          >
            Done
          </Button>
          <Button
            size="sm"
            variant="secondary"
            disabled={update.isPending}
            onClick={() => setLoggingOutcome(true)}
          >
            Outcome...
          </Button>
          <Button
            size="sm"
            variant="ghost"
            loading={pendingStatus === "snoozed"}
            disabled={update.isPending}
            onClick={() => update.mutate({ id: rec.id, status: "snoozed" })}
          >
            Snooze
          </Button>
          <Button
            size="sm"
            variant="ghost"
            loading={pendingStatus === "dismissed"}
            disabled={update.isPending}
            onClick={() => update.mutate({ id: rec.id, status: "dismissed" })}
          >
            Dismiss
          </Button>
        </div>
      ) : null}

      {loggingOutcome ? (
        <RecommendationOutcome rec={rec} onClose={() => setLoggingOutcome(false)} />
      ) : null}
    </div>
  );
}
