"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { parseGps, formatGps } from "@/lib/geo";

// Leaflet needs `window`; load the map canvas client-only.
const LocationPickerCanvas = dynamic(
  () => import("@/components/farmers/location-picker-canvas"),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-64 items-center justify-center rounded-card border border-outline bg-surface">
        <Spinner className="h-5 w-5 animate-spin text-primary" />
      </div>
    ),
  },
);

type GeoState = "idle" | "locating" | "error";

/**
 * Friendly location entry for a farmer's GPS: a one-tap "use my location"
 * button (ideal when the agent is standing at the farm), a tap-to-pin
 * OpenStreetMap, and a still-editable lat,lng field — all kept in sync.
 */
export function LocationPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (gps: string) => void;
}) {
  const [geo, setGeo] = useState<GeoState>("idle");
  const coords = parseGps(value);

  function useMyLocation() {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setGeo("error");
      return;
    }
    setGeo("locating");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        onChange(formatGps(pos.coords.latitude, pos.coords.longitude));
        setGeo("idle");
      },
      () => setGeo("error"),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium text-foreground">Location</span>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          loading={geo === "locating"}
          onClick={useMyLocation}
        >
          Use my location
        </Button>
        <span className="text-xs text-muted">
          {coords
            ? `Pinned at ${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}`
            : "Tap the map, or use your current location"}
        </span>
      </div>

      {geo === "error" ? (
        <p className="text-xs text-danger">
          Couldn&apos;t get your location — tap the map or type the coordinates
          instead.
        </p>
      ) : null}

      <LocationPickerCanvas
        lat={coords?.lat ?? null}
        lng={coords?.lng ?? null}
        onPick={(lat, lng) => onChange(formatGps(lat, lng))}
      />

      <Field
        label="GPS (lat,lng)"
        value={value}
        placeholder="0.2827,34.7519"
        hint="Set by the map or location button — or type it. Optional; enables the caseload map."
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
