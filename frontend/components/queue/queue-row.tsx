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
import type { Recommendation } from "@/lib/types";

export function QueueRow({ rec, rank }: { rec: Recommendation; rank: number }) {
  const update = useUpdateRecommendationStatus();
  const [loggingOutcome, setLoggingOutcome] = useState(false);
  const meta = BAND_META[priorityBand(rec.priority)];
  const pendingStatus = update.isPending ? update.variables?.status : undefined;

  return (
    <div className="border-b border-outline px-4 py-3 last:border-b-0">
      <div className="flex items-start gap-3">
        <div className="w-6 shrink-0 pt-0.5 text-sm font-bold tabular-nums text-faint">
          {rank}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={`/farmers/${rec.farmer.id}`}
              className="truncate font-semibold text-foreground hover:text-primary hover:underline"
            >
              {rec.farmer.name}
            </Link>
            <Badge tone={meta.tone}>{meta.label}</Badge>
            <Badge tone="neutral">{kindLabel(rec.kind)}</Badge>
          </div>
          <p className="mt-0.5 text-sm text-muted">{rec.reason}</p>
          {rec.rationale ? (
            <p className="mt-0.5 text-xs text-faint">{rec.rationale}</p>
          ) : null}
          <div className="mt-2 max-w-xs">
            <ScoreBar value={rec.priority} />
          </div>
        </div>

        {!loggingOutcome ? (
          <div className="flex shrink-0 flex-col items-end gap-1.5">
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
            <div className="flex gap-1.5">
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
          </div>
        ) : null}
      </div>

      {loggingOutcome ? (
        <RecommendationOutcome rec={rec} onClose={() => setLoggingOutcome(false)} />
      ) : null}
    </div>
  );
}
