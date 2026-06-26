"use client";

import { MapContainer, TileLayer, CircleMarker, Popup } from "react-leaflet";
import Link from "next/link";
import "leaflet/dist/leaflet.css";
import { HeatLayer } from "@/components/map/heat-layer";
import { FitBounds } from "@/components/map/fit-bounds";
import { BAND_META, type PriorityBand } from "@/lib/priority";
import { cn } from "@/lib/utils";
import type {
  MapTopIssue,
  MapLatestObservation,
} from "@/hooks/queries/use-caseload-map-summary";

export interface MapPoint {
  id: string;
  name: string;
  lat: number;
  lng: number;
  band: PriorityBand;
  priority: number;
  phone: string | null;
  enterprises: string[];
  lastVisitedAt: string | null;
  /** Pending recommendations for this farmer. */
  pendingCount: number;
  /** Highest-priority recommendation's reason + kind, if any. */
  topRecReason: string | null;
  topRecKind: string | null;
  openIssueCount: number;
  topIssue: MapTopIssue | null;
  latestObservation: MapLatestObservation | null;
}

const BAND_COLOR: Record<PriorityBand, string> = {
  urgent: "#ba1a1a",
  window: "#b45309",
  routine: "#1f6c3a",
};

const ENTERPRISE_CHIP: Record<string, string> = {
  Dairy: "\uD83D\uDC04 Dairy",
  Sugarcane: "\uD83C\uDF3E Sugarcane",
};

const REC_KIND_LABEL: Record<string, string> = {
  overdue_visit: "Overdue visit",
  first_visit: "First visit",
  issue_followup: "Issue follow-up",
  advice_followup: "Advice follow-up",
  risk_alert: "Risk alert",
};

function recKindLabel(kind: string | null): string {
  if (!kind) return "Next action";
  return REC_KIND_LABEL[kind] ?? kind.replace(/_/g, " ");
}

function severityTone(severity: string): string {
  const s = severity.toLowerCase();
  if (s === "high") return "text-danger";
  if (s === "medium") return "text-warning";
  return "text-muted";
}

function lastVisitLabel(iso: string | null): { text: string; overdue: boolean } {
  if (!iso) return { text: "Never visited", overdue: true };
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return { text: "Never visited", overdue: true };
  const days = Math.floor((Date.now() - then) / 86_400_000);
  if (days <= 0) return { text: "Visited today", overdue: false };
  if (days === 1) return { text: "Visited yesterday", overdue: false };
  return { text: `Visited ${days} days ago`, overdue: days > 30 };
}

function FarmerPopup({ p }: { p: MapPoint }) {
  const visit = lastVisitLabel(p.lastVisitedAt);
  const pendingSuffix =
    p.pendingCount > 1 ? ` (${p.pendingCount} pending)` : "";
  return (
    <div className="w-60 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-semibold text-foreground">{p.name}</span>
        <span
          className="inline-block h-3 w-3 shrink-0 rounded-full"
          style={{ background: BAND_COLOR[p.band] }}
          title={BAND_META[p.band].label}
        />
      </div>

      {p.enterprises.length ? (
        <div className="flex flex-wrap gap-1">
          {p.enterprises.map((e) => (
            <span
              key={e}
              className="rounded-full bg-surface-muted px-2 py-0.5 text-[11px] font-medium text-foreground"
            >
              {ENTERPRISE_CHIP[e] ?? e}
            </span>
          ))}
        </div>
      ) : (
        <p className="text-[11px] text-faint">No enterprise on file</p>
      )}

      {p.priority > 0 ? (
        <p className="text-[12px] font-medium" style={{ color: BAND_COLOR[p.band] }}>
          Priority {p.priority} &middot; {BAND_META[p.band].label}
        </p>
      ) : null}

      <p className={cn("text-[12px]", visit.overdue ? "text-danger" : "text-muted")}>
        {visit.text}
      </p>

      {p.topRecReason ? (
        <div className="rounded-md bg-surface-muted px-2 py-1">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-faint">
            {recKindLabel(p.topRecKind)}
            {pendingSuffix}
          </p>
          <p className="text-[12px] text-foreground">{p.topRecReason}</p>
        </div>
      ) : null}

      {p.openIssueCount > 0 && p.topIssue ? (
        <div>
          <p className="text-[12px] font-semibold text-danger">
            {p.openIssueCount} open issue{p.openIssueCount === 1 ? "" : "s"}
          </p>
          <p className="text-[12px] text-foreground">
            {p.topIssue.text}
            {p.topIssue.severity ? (
              <span
                className={cn(
                  "ml-1 text-[11px] font-medium",
                  severityTone(p.topIssue.severity),
                )}
              >
                &middot; {p.topIssue.severity}
              </span>
            ) : null}
            {p.topIssue.contagious ? (
              <span className="ml-1 text-[11px] font-medium text-danger">
                &middot; contagious
              </span>
            ) : null}
          </p>
        </div>
      ) : null}

      {p.latestObservation ? (
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-faint">
            Latest note
          </p>
          <p className="line-clamp-2 text-[12px] text-muted">
            {p.latestObservation.text}
          </p>
        </div>
      ) : null}

      <div className="rounded-md border border-dashed border-outline px-2 py-1">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-faint">
          Not tracked yet
        </p>
        <p className="text-[11px] text-faint">
          Milk-yield drop &middot; Soil moisture &middot; Sugarcane risk
        </p>
      </div>

      <div className="flex items-center gap-3 pt-0.5">
        <Link
          href={`/farmers/${p.id}`}
          className="text-[12px] font-semibold text-primary underline"
        >
          Open farmer
        </Link>
        {p.phone ? (
          <a
            href={`tel:${p.phone}`}
            className="text-[12px] font-medium text-primary underline"
          >
            Call
          </a>
        ) : null}
      </div>
    </div>
  );
}

export default function CaseloadMapCanvas({
  points,
  mode,
}: {
  points: MapPoint[];
  mode: "pins" | "heatmap";
}) {
  const center: [number, number] = points.length
    ? [points[0].lat, points[0].lng]
    : [0.2827, 34.7519];

  return (
    <MapContainer
      center={center}
      zoom={11}
      scrollWheelZoom
      className="h-[60vh] w-full overflow-hidden rounded-card border border-outline"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {mode === "heatmap" ? (
        <HeatLayer
          points={points.map(
            (p) => [p.lat, p.lng, Math.max(0.15, p.priority / 100)] as [number, number, number],
          )}
        />
      ) : (
        points.map((p) => (
          <CircleMarker
            key={p.id}
            center={[p.lat, p.lng]}
            radius={9}
            pathOptions={{
              color: BAND_COLOR[p.band],
              fillColor: BAND_COLOR[p.band],
              fillOpacity: 0.85,
              weight: 2,
            }}
          >
            <Popup>
              <FarmerPopup p={p} />
            </Popup>
          </CircleMarker>
        ))
      )}
      <FitBounds points={points} />
    </MapContainer>
  );
}
