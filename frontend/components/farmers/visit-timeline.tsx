import { Badge } from "@/components/ui/badge";
import { Text } from "@/components/ui/text";
import { ObservationList } from "@/components/capture/observation-list";
import type { Visit } from "@/lib/types";

function visitDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function VisitTimeline({ visits }: { visits: Visit[] }) {
  if (visits.length === 0) {
    return <Text variant="muted">No visits logged yet.</Text>;
  }
  return (
    <ol className="space-y-4">
      {visits.map((v) => (
        <li key={v.id} className="rounded-card border border-outline bg-surface p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Text variant="label">{visitDate(v.date)}</Text>
            <div className="flex flex-wrap gap-1.5">
              {v.enterprises.map((e) => (
                <Badge key={e.id} tone="neutral">
                  {e.type}
                </Badge>
              ))}
            </div>
          </div>
          {v.notes ? (
            <p className="mt-1.5 text-sm text-muted">{v.notes}</p>
          ) : null}
          {v.observations.length > 0 ? (
            <div className="mt-3">
              <ObservationList observations={v.observations} />
            </div>
          ) : null}
        </li>
      ))}
    </ol>
  );
}
