"use client";

import { MapContainer, TileLayer, CircleMarker, Popup } from "react-leaflet";
import Link from "next/link";
import "leaflet/dist/leaflet.css";
import { HeatLayer } from "@/components/map/heat-layer";
import { FitBounds } from "@/components/map/fit-bounds";
import type { PriorityBand } from "@/lib/priority";

export interface MapPoint {
  id: string;
  name: string;
  lat: number;
  lng: number;
  band: PriorityBand;
  priority: number;
}

const BAND_COLOR: Record<PriorityBand, string> = {
  urgent: "#ba1a1a",
  window: "#b45309",
  routine: "#1f6c3a",
};

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
              <div className="space-y-1">
                <p className="text-sm font-semibold text-foreground">{p.name}</p>
                <Link
                  href={`/farmers/${p.id}`}
                  className="text-sm font-medium text-primary underline"
                >
                  Open farmer
                </Link>
              </div>
            </Popup>
          </CircleMarker>
        ))
      )}
      <FitBounds points={points} />
    </MapContainer>
  );
}
