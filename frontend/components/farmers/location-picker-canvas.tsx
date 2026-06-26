"use client";

import { useEffect } from "react";
import {
  MapContainer,
  TileLayer,
  CircleMarker,
  useMap,
  useMapEvents,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";

// Default centre: Kakamega, Western Kenya (matches the caseload map fallback).
const DEFAULT_CENTER: [number, number] = [0.2827, 34.7519];

function ClickCapture({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onPick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

/** Recenter only when the new point falls outside the current view (e.g. after
 * "use my location"), so clicking inside the map never causes a jarring jump. */
function Recenter({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  useEffect(() => {
    if (!map.getBounds().contains([lat, lng])) {
      map.setView([lat, lng]);
    }
  }, [lat, lng, map]);
  return null;
}

export default function LocationPickerCanvas({
  lat,
  lng,
  onPick,
}: {
  lat: number | null;
  lng: number | null;
  onPick: (lat: number, lng: number) => void;
}) {
  const hasPoint = lat !== null && lng !== null;
  const center: [number, number] = hasPoint ? [lat, lng] : DEFAULT_CENTER;

  return (
    <MapContainer
      center={center}
      zoom={hasPoint ? 14 : 8}
      scrollWheelZoom
      className="h-64 w-full overflow-hidden rounded-card border border-outline"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <ClickCapture onPick={onPick} />
      {hasPoint ? (
        <>
          <CircleMarker
            center={[lat, lng]}
            radius={9}
            pathOptions={{
              color: "#07371b",
              fillColor: "#07371b",
              fillOpacity: 0.85,
              weight: 2,
            }}
          />
          <Recenter lat={lat} lng={lng} />
        </>
      ) : null}
    </MapContainer>
  );
}
