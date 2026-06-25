"use client";

import { useEffect } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";

/** Pans/zooms the map to fit all provided points whenever they change. */
export function FitBounds({ points }: { points: { lat: number; lng: number }[] }) {
  const map = useMap();
  useEffect(() => {
    if (points.length === 0) return;
    const bounds = L.latLngBounds(
      points.map((p) => [p.lat, p.lng] as [number, number]),
    );
    map.fitBounds(bounds, { padding: [40, 40], maxZoom: 13 });
  }, [map, points]);
  return null;
}
