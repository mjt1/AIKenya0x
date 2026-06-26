"use client";

import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import Link from "next/link";
import { Text } from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import {
  useCaseloadMapSummary,
  type MapFarmerSummary,
} from "@/hooks/queries/use-caseload-map-summary";
import { useQueue } from "@/hooks/queries/use-queue";
import { priorityBand, BAND_META, type PriorityBand } from "@/lib/priority";
import { parseGps } from "@/lib/geo";
import { cn } from "@/lib/utils";
import type { MapPoint } from "@/components/map/caseload-map-canvas";

// Leaflet needs `window`; load the canvas client-only.
const CaseloadMapCanvas = dynamic(
  () => import("@/components/map/caseload-map-canvas"),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[60vh] items-center justify-center rounded-card border border-outline bg-surface">
        <Spinner className="h-6 w-6 animate-spin text-primary" />
      </div>
    ),
  },
);

const BAND_DOT: Record<PriorityBand, string> = {
  urgent: "bg-danger",
  window: "bg-warning",
  routine: "bg-routine",
};

interface RecRollup {
  band: PriorityBand;
  priority: number;
  topReason: string | null;
  topKind: string | null;
  pendingCount: number;
}

export function CaseloadMap() {
  const summary = useCaseloadMapSummary();
  const queue = useQueue();
  const [mode, setMode] = useState<"pins" | "heatmap">("pins");

  // Each farmer's recommendations: highest-priority one drives colour + the
  // tooltip's "next action"; pending ones are counted.
  const recByFarmer = useMemo(() => {
    const m = new Map<string, RecRollup>();
    for (const r of queue.data ?? []) {
      let cur = m.get(r.farmer.id);
      if (!cur) {
        cur = {
          band: priorityBand(r.priority),
          priority: r.priority,
          topReason: r.reason ?? null,
          topKind: r.kind ?? null,
          pendingCount: 0,
        };
        m.set(r.farmer.id, cur);
      }
      if (r.status === "pending") cur.pendingCount += 1;
      if (r.priority > cur.priority) {
        cur.priority = r.priority;
        cur.band = priorityBand(r.priority);
        cur.topReason = r.reason ?? null;
        cur.topKind = r.kind ?? null;
      }
    }
    return m;
  }, [queue.data]);

  const { points, missing } = useMemo(() => {
    const pts: MapPoint[] = [];
    const miss: MapFarmerSummary[] = [];
    for (const f of summary.data ?? []) {
      const coords = parseGps(f.gps);
      if (!coords) {
        miss.push(f);
        continue;
      }
      const rec = recByFarmer.get(f.id);
      pts.push({
        id: f.id,
        name: f.name,
        lat: coords.lat,
        lng: coords.lng,
        band: rec?.band ?? "routine",
        priority: rec?.priority ?? 0,
        phone: f.phone ?? null,
        enterprises: f.enterprises ?? [],
        lastVisitedAt: f.lastVisitedAt,
        pendingCount: rec?.pendingCount ?? 0,
        topRecReason: rec?.topReason ?? null,
        topRecKind: rec?.topKind ?? null,
        openIssueCount: f.openIssueCount,
        topIssue: f.topIssue,
        latestObservation: f.latestObservation,
      });
    }
    return { points: pts, missing: miss };
  }, [summary.data, recByFarmer]);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Text variant="h1">Caseload map</Text>
          <Text variant="muted" className="mt-1">
            {points.length} farmer{points.length === 1 ? "" : "s"} mapped
            {missing.length ? ` \u00b7 ${missing.length} without GPS` : ""}.
          </Text>
        </div>
        <div className="inline-flex overflow-hidden rounded-md border border-outline-strong">
          <button
            type="button"
            onClick={() => setMode("pins")}
            className={cn(
              "px-3 py-1.5 text-sm font-medium transition-colors",
              mode === "pins"
                ? "bg-primary text-on-primary"
                : "bg-surface text-muted hover:bg-surface-muted",
            )}
          >
            Pins
          </button>
          <button
            type="button"
            onClick={() => setMode("heatmap")}
            className={cn(
              "px-3 py-1.5 text-sm font-medium transition-colors",
              mode === "heatmap"
                ? "bg-primary text-on-primary"
                : "bg-surface text-muted hover:bg-surface-muted",
            )}
          >
            Heatmap
          </button>
        </div>
      </header>

      <div className="flex flex-wrap gap-4">
        {(["urgent", "window", "routine"] as PriorityBand[]).map((b) => (
          <div key={b} className="flex items-center gap-2 text-sm text-muted">
            <span className={cn("h-3 w-3 rounded-full", BAND_DOT[b])} />
            {BAND_META[b].label}
          </div>
        ))}
      </div>

      {summary.isPending ? (
        <div className="flex h-[60vh] items-center justify-center rounded-card border border-outline bg-surface">
          <Spinner className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : summary.isError ? (
        <div className="rounded-card border border-outline bg-surface px-4 py-12 text-center">
          <Text variant="muted">Couldn&apos;t load your caseload.</Text>
          <div className="mt-3">
            <Button size="sm" variant="secondary" onClick={() => summary.refetch()}>
              Retry
            </Button>
          </div>
        </div>
      ) : points.length === 0 ? (
        <div className="rounded-card border border-outline bg-surface px-4 py-12 text-center">
          <Text variant="h3">No mapped farmers</Text>
          <Text variant="muted" className="mt-1">
            {missing.length
              ? "Your farmers don't have GPS coordinates yet."
              : "Add farmers with GPS to see them here."}
          </Text>
        </div>
      ) : (
        <CaseloadMapCanvas points={points} mode={mode} />
      )}

      {missing.length > 0 ? (
        <section>
          <Text variant="overline">Missing GPS ({missing.length})</Text>
          <div className="mt-2 rounded-card border border-outline bg-surface">
            {missing.map((f) => (
              <Link
                key={f.id}
                href={`/farmers/${f.id}`}
                className="flex items-center justify-between border-b border-outline px-4 py-3 transition-colors last:border-b-0 hover:bg-surface-muted"
              >
                <span className="font-medium text-foreground">{f.name}</span>
                <span className="text-sm text-muted">{f.phone}</span>
              </Link>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
