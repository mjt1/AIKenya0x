"use client";

import { useEffect } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet.heat";

/** Renders a leaflet.heat density layer; weights are priority/100. */
export function HeatLayer({ points }: { points: [number, number, number][] }) {
  const map = useMap();
  useEffect(() => {
    const layer = L.heatLayer(points, { radius: 28, blur: 18, maxZoom: 13 });
    layer.addTo(map);
    return () => {
      layer.remove();
    };
  }, [map, points]);
  return null;
}
