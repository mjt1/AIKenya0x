/**
 * Controlled metric vocabulary for sensors. The frontend mirrors this list so
 * agents pick from a dropdown (plus an 'other' free-text option). The backend
 * stays lenient (any non-empty metric string is accepted) but uses these
 * defaults to fill in a unit when the agent or device omits one.
 */
export interface SensorMetricDef {
  metric: string;
  label: string;
  unit: string;
}

export const SENSOR_METRICS: SensorMetricDef[] = [
  { metric: 'soil_moisture', label: 'Soil moisture', unit: '%' },
  { metric: 'soil_ph', label: 'Soil pH', unit: 'pH' },
  { metric: 'soil_temp', label: 'Soil temperature', unit: '°C' },
  { metric: 'air_temp', label: 'Air temperature', unit: '°C' },
  { metric: 'humidity', label: 'Humidity', unit: '%' },
  { metric: 'rainfall', label: 'Rainfall', unit: 'mm' },
  { metric: 'milk_yield', label: 'Milk yield', unit: 'L/day' },
  { metric: 'water_intake', label: 'Water intake', unit: 'L/day' },
  { metric: 'body_temp', label: 'Body temperature', unit: '°C' },
  { metric: 'weight', label: 'Weight', unit: 'kg' },
];

const UNIT_BY_METRIC = new Map<string, string>(
  SENSOR_METRICS.map((m) => [m.metric, m.unit]),
);

/** Default unit for a known metric, or null for unknown ('other') metrics. */
export function defaultUnitFor(metric: string): string | null {
  return UNIT_BY_METRIC.get(metric) ?? null;
}
