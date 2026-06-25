import { Badge } from "@/components/ui/badge";
import { Text } from "@/components/ui/text";
import type { Observation, ObservationKind } from "@/lib/types";

const KIND_ORDER: ObservationKind[] = ["issue", "advice", "observation"];

const KIND_META: Record<
  ObservationKind,
  { label: string; tone: "danger" | "success" | "neutral" }
> = {
  issue: { label: "Issue", tone: "danger" },
  advice: { label: "Advice", tone: "success" },
  observation: { label: "Observation", tone: "neutral" },
};

/** Renders AI-structured visit notes, issues first. */
export function ObservationList({
  observations,
}: {
  observations: Observation[];
}) {
  if (observations.length === 0) {
    return (
      <Text variant="muted">
        No structured items were extracted from the notes.
      </Text>
    );
  }
  const sorted = [...observations].sort(
    (a, b) =>
      KIND_ORDER.indexOf(a.kind as ObservationKind) -
      KIND_ORDER.indexOf(b.kind as ObservationKind),
  );
  return (
    <ul className="space-y-2">
      {sorted.map((o) => {
        const meta =
          KIND_META[o.kind as ObservationKind] ?? KIND_META.observation;
        return (
          <li
            key={o.id}
            className="flex items-start gap-2.5 rounded-md border border-outline bg-surface px-3 py-2"
          >
            <Badge tone={meta.tone}>{meta.label}</Badge>
            <span className="text-sm text-foreground">{o.text}</span>
          </li>
        );
      })}
    </ul>
  );
}
