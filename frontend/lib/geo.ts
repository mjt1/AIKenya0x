export interface LatLng {
  lat: number;
  lng: number;
}

/** Parse a "lat,lng" string (the backend's farmer.gps format). Returns null if absent/invalid. */
export function parseGps(gps: string | null | undefined): LatLng | null {
  if (!gps) return null;
  const parts = gps.split(",").map((s) => Number(s.trim()));
  if (parts.length !== 2 || parts.some((n) => Number.isNaN(n))) return null;
  const [lat, lng] = parts;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  return { lat, lng };
}

/** Format coordinates into the backend's "lat,lng" string (5 dp ~= 1.1m). */
export function formatGps(lat: number, lng: number, precision = 5): string {
  return `${lat.toFixed(precision)},${lng.toFixed(precision)}`;
}
