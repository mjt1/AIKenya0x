"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/input";
import { SelectField } from "@/components/ui/select";
import { Text } from "@/components/ui/text";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { ApiError } from "@/lib/api";
import {
  SENSOR_METRICS,
  OTHER_METRIC,
  defaultUnitFor,
  type Sensor,
} from "@/lib/sensors";
import { useFarmerSensors } from "@/hooks/queries/use-sensors";
import { useCreateSensor } from "@/hooks/mutations/use-create-sensor";
import { useRegenerateSensorToken } from "@/hooks/mutations/use-regenerate-sensor-token";
import { useDeleteSensor } from "@/hooks/mutations/use-delete-sensor";

const API_BASE = (
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000"
).replace(/\/+$/, "");

interface TokenPanel {
  token: string;
  sensorName: string;
  metric: string;
}

function lastReadingLabel(iso: string | null): string {
  if (!iso) return "No readings yet";
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "No readings yet";
  const mins = Math.floor((Date.now() - then) / 60000);
  if (mins < 1) return "Last reading just now";
  if (mins < 60) return `Last reading ${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `Last reading ${hrs}h ago`;
  return `Last reading ${Math.floor(hrs / 24)}d ago`;
}

export function SensorsSection({ farmerId }: { farmerId: string }) {
  const sensors = useFarmerSensors(farmerId);
  const create = useCreateSensor(farmerId);
  const regenerate = useRegenerateSensorToken(farmerId);
  const remove = useDeleteSensor(farmerId);

  const [name, setName] = useState("");
  const [metricChoice, setMetricChoice] = useState(SENSOR_METRICS[0].metric);
  const [customMetric, setCustomMetric] = useState("");
  const [unit, setUnit] = useState(defaultUnitFor(SENSOR_METRICS[0].metric));
  const [formError, setFormError] = useState<string | null>(null);

  const [tokenPanel, setTokenPanel] = useState<TokenPanel | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const isOther = metricChoice === OTHER_METRIC;
  const effectiveMetric = (isOther ? customMetric : metricChoice).trim();

  function onMetricChange(value: string) {
    setMetricChoice(value);
    if (value !== OTHER_METRIC) setUnit(defaultUnitFor(value));
    else setUnit("");
  }

  async function copy(key: string, text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied((c) => (c === key ? null : c)), 1500);
    } catch {
      /* clipboard unavailable — user can select manually */
    }
  }

  function resetForm() {
    setName("");
    setMetricChoice(SENSOR_METRICS[0].metric);
    setCustomMetric("");
    setUnit(defaultUnitFor(SENSOR_METRICS[0].metric));
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    if (!name.trim()) return setFormError("Give the sensor a name.");
    if (!effectiveMetric) return setFormError("Choose or type a metric.");
    create.mutate(
      {
        name: name.trim(),
        metric: effectiveMetric,
        ...(unit.trim() ? { unit: unit.trim() } : {}),
      },
      {
        onSuccess: (res) => {
          setTokenPanel({
            token: res.token,
            sensorName: res.sensor.name,
            metric: res.sensor.metric,
          });
          resetForm();
        },
        onError: (err) =>
          setFormError(
            err instanceof ApiError ? err.message : "Couldn't add the sensor.",
          ),
      },
    );
  }

  function onRegenerate(s: Sensor) {
    regenerate.mutate(s.id, {
      onSuccess: (res) =>
        setTokenPanel({ token: res.token, sensorName: s.name, metric: s.metric }),
    });
  }

  const list = sensors.data ?? [];
  const pending = create.isPending;

  return (
    <section className="max-w-lg space-y-4 rounded-card border border-outline bg-surface p-5">
      <header>
        <Text variant="h3">Sensors</Text>
        <Text variant="muted" className="mt-1">
          Register a device (e.g. a soil probe) to stream readings to this
          farmer. Each sensor gets its own token.
        </Text>
      </header>

      {/* One-time token panel */}
      {tokenPanel ? (
        <div className="space-y-2 rounded-md border border-primary/40 bg-primary-container/30 p-3">
          <p className="text-sm font-semibold text-foreground">
            Token for {tokenPanel.sensorName}
          </p>
          <p className="text-xs text-danger">
            Copy it now &mdash; it won&apos;t be shown again.
          </p>

          <TokenRow
            label="Token"
            value={tokenPanel.token}
            copied={copied === "token"}
            onCopy={() => copy("token", tokenPanel.token)}
          />
          <TokenRow
            label="Webhook URL"
            value={`${API_BASE}/sensors/ingest`}
            copied={copied === "url"}
            onCopy={() => copy("url", `${API_BASE}/sensors/ingest`)}
          />

          <div>
            <div className="mb-1 flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-faint">
                Example
              </span>
              <button
                type="button"
                className="text-xs font-medium text-primary underline"
                onClick={() =>
                  copy(
                    "curl",
                    curlExample(tokenPanel.token, tokenPanel.metric),
                  )
                }
              >
                {copied === "curl" ? "Copied" : "Copy curl"}
              </button>
            </div>
            <pre className="overflow-x-auto rounded bg-foreground/90 p-2 text-[11px] leading-relaxed text-on-primary">
              {curlExample(tokenPanel.token, tokenPanel.metric)}
            </pre>
          </div>

          <div className="flex justify-end">
            <Button size="sm" variant="secondary" onClick={() => setTokenPanel(null)}>
              Done
            </Button>
          </div>
        </div>
      ) : null}

      {/* Add sensor */}
      <form onSubmit={submit} className="space-y-3">
        <Field
          label="Sensor name"
          name="sensor-name"
          placeholder="North plot moisture probe"
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={pending}
        />
        <div className="grid grid-cols-2 gap-3">
          <SelectField
            label="Measures"
            name="sensor-metric"
            value={metricChoice}
            onChange={(e) => onMetricChange(e.target.value)}
            disabled={pending}
          >
            {SENSOR_METRICS.map((m) => (
              <option key={m.metric} value={m.metric}>
                {m.label}
              </option>
            ))}
            <option value={OTHER_METRIC}>Other…</option>
          </SelectField>
          <Field
            label="Unit"
            name="sensor-unit"
            placeholder="%"
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
            disabled={pending}
          />
        </div>
        {isOther ? (
          <Field
            label="Metric name"
            name="sensor-custom-metric"
            placeholder="e.g. leaf_wetness"
            hint="Lowercase, no spaces (snake_case)."
            value={customMetric}
            onChange={(e) => setCustomMetric(e.target.value)}
            disabled={pending}
          />
        ) : null}

        {formError ? <p className="text-sm text-danger">{formError}</p> : null}

        <div className="flex justify-end">
          <Button type="submit" size="sm" loading={pending}>
            Add sensor
          </Button>
        </div>
      </form>

      {/* Existing sensors */}
      <div className="space-y-2">
        <Text variant="overline">Registered ({list.length})</Text>
        {sensors.isPending ? (
          <div className="flex justify-center py-6">
            <Spinner className="h-5 w-5 animate-spin text-primary" />
          </div>
        ) : sensors.isError ? (
          <p className="text-sm text-danger">Couldn&apos;t load sensors.</p>
        ) : list.length === 0 ? (
          <p className="text-sm text-muted">No sensors registered yet.</p>
        ) : (
          <ul className="divide-y divide-outline rounded-md border border-outline">
            {list.map((s) => (
              <li key={s.id} className="flex items-start justify-between gap-3 px-3 py-2.5">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-foreground">
                    {s.name}
                  </p>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5">
                    <Badge tone="neutral">
                      {s.metric}
                      {s.unit ? ` (${s.unit})` : ""}
                    </Badge>
                    {s.status !== "active" ? (
                      <Badge tone="neutral">{s.status}</Badge>
                    ) : null}
                  </div>
                  <p className="mt-1 text-xs text-faint">
                    {s.tokenPrefix}… · {lastReadingLabel(s.lastReadingAt)}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    loading={regenerate.isPending && regenerate.variables === s.id}
                    disabled={regenerate.isPending}
                    onClick={() => onRegenerate(s)}
                  >
                    New token
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    loading={remove.isPending && remove.variables === s.id}
                    disabled={remove.isPending}
                    onClick={() => remove.mutate(s.id)}
                  >
                    Remove
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

function TokenRow({
  label,
  value,
  copied,
  onCopy,
}: {
  label: string;
  value: string;
  copied: boolean;
  onCopy: () => void;
}) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-faint">
          {label}
        </span>
        <button
          type="button"
          className="text-xs font-medium text-primary underline"
          onClick={onCopy}
        >
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <code className="block overflow-x-auto rounded bg-surface-muted px-2 py-1 text-[11px] text-foreground">
        {value}
      </code>
    </div>
  );
}

function curlExample(token: string, metric: string): string {
  const m = metric || "soil_moisture";
  return [
    `curl -X POST ${API_BASE}/sensors/ingest \\`,
    `  -H "Authorization: Bearer ${token}" \\`,
    `  -H "Content-Type: application/json" \\`,
    `  -d '{"readings": {"${m}": 0}}'`,
  ].join("\n");
}
