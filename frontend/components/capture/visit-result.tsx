import { Text } from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ObservationList } from "@/components/capture/observation-list";
import type { Visit } from "@/lib/types";

export interface VisitResultProps {
  visit: Visit;
  farmerName: string;
  onLogAnother: () => void;
}

/** Success panel shown after a visit is captured. */
export function VisitResult({
  visit,
  farmerName,
  onLogAnother,
}: VisitResultProps) {
  return (
    <div className="space-y-5">
      <div className="rounded-card border border-primary/30 bg-primary-container/40 px-4 py-3">
        <Text variant="label" className="text-on-primary-container">
          Visit logged for {farmerName}.
        </Text>
        <Text variant="caption" className="mt-0.5">
          The AI structured your notes below. This feeds tomorrow&apos;s queue.
        </Text>
      </div>

      <div>
        <Text variant="overline">Enterprises</Text>
        <div className="mt-1.5 flex flex-wrap gap-2">
          {visit.enterprises.length > 0 ? (
            visit.enterprises.map((e) => (
              <Badge key={e.id} tone="brand">
                {e.type}
              </Badge>
            ))
          ) : (
            <Text variant="muted">—</Text>
          )}
        </div>
      </div>

      <div>
        <Text variant="overline">Structured notes</Text>
        <div className="mt-2">
          <ObservationList observations={visit.observations} />
        </div>
      </div>

      <Button variant="secondary" size="sm" onClick={onLogAnother}>
        Log another visit
      </Button>
    </div>
  );
}
