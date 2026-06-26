// Sensor + reading types and the controlled metric vocabulary. Mirrors the
// backend (ai backend: src/sensors/sensor-metrics.ts + sensor response DTOs).

export interface Sensor {
  id: string;
  farmerId: string;
  name: string;
  metric: string;
  unit: string | null;
  status: string;
  tokenPrefix: string;
  lastReadingAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface CreateSensorInput {
  name: string;
  metric: string;
  unit?: string;
}

/** Returned ONCE on create — carries the plaintext token to copy. */
export interface SensorCreatedResult {
  sensor: Sensor;
  token: string;
  ingestPath: string;
}

export interface RegenerateTokenResult {
  token: string;
  tokenPrefix: string;
}

export interface SensorReading {
  id: string;
  metric: string;
  value: number | string;
  valueType: string;
  unit: string | null;
  ts: string;
  source: string;
}

export interface SensorMetricOption {
  metric: string;
  label: string;
  unit: string;
}

/** Controlled metric list — keep in sync with the backend. */
export const SENSOR_METRICS: SensorMetricOption[] = [
  { metric: "soil_moisture", label: "Soil moisture", unit: "%" },
  { metric: "soil_ph", label: "Soil pH", unit: "pH" },
  { metric: "soil_temp", label: "Soil temperature", unit: "°C" },
  { metric: "air_temp", label: "Air temperature", unit: "°C" },
  { metric: "humidity", label: "Humidity", unit: "%" },
  { metric: "rainfall", label: "Rainfall", unit: "mm" },
  { metric: "milk_yield", label: "Milk yield", unit: "L/day" },
  { metric: "water_intake", label: "Water intake", unit: "L/day" },
  { metric: "body_temp", label: "Body temperature", unit: "°C" },
  { metric: "weight", label: "Weight", unit: "kg" },
];

/** Sentinel for the free-form "other" choice in the metric dropdown. */
export const OTHER_METRIC = "__other__";

export function defaultUnitFor(metric: string): string {
  return SENSOR_METRICS.find((m) => m.metric === metric)?.unit ?? "";
}
