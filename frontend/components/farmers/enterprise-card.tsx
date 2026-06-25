import { Badge } from "@/components/ui/badge";
import { Text } from "@/components/ui/text";
import type { Enterprise } from "@/lib/types";

function val(o: Record<string, unknown>, k: string): string | null {
  const v = o[k];
  if (v === null || v === undefined || v === "") return null;
  return String(v);
}

/** One enterprise (Dairy/Sugarcane) with its assets (animals or fields). */
export function EnterpriseCard({ enterprise }: { enterprise: Enterprise }) {
  const isDairy = enterprise.type === "Dairy";
  const animals = enterprise.animals ?? [];
  const fields = enterprise.fields ?? [];
  const count = isDairy ? animals.length : fields.length;
  const noun = isDairy ? "animal" : "field";

  return (
    <div className="rounded-card border border-outline bg-surface p-4">
      <div className="flex items-center justify-between">
        <Badge tone="brand">{enterprise.type}</Badge>
        <Text variant="caption">
          {count} {noun}
          {count === 1 ? "" : "s"}
        </Text>
      </div>
      <ul className="mt-3 space-y-1.5">
        {isDairy
          ? animals.map((a, i) => {
              const stage = val(a, "lactationStage");
              return (
                <li
                  key={i}
                  className="flex items-center justify-between text-sm"
                >
                  <span className="text-foreground">
                    {val(a, "breed") ?? "Animal"}
                  </span>
                  {stage ? <span className="text-muted">{stage}</span> : null}
                </li>
              );
            })
          : fields.map((fld, i) => {
              const area = val(fld, "areaHa");
              const ratoon = val(fld, "ratoonCycle");
              const meta = [
                area ? `${area} ha` : null,
                ratoon ? `ratoon ${ratoon}` : null,
              ]
                .filter(Boolean)
                .join(" · ");
              return (
                <li
                  key={i}
                  className="flex items-center justify-between text-sm"
                >
                  <span className="text-foreground">
                    {val(fld, "variety") ?? "Field"}
                  </span>
                  {meta ? <span className="text-muted">{meta}</span> : null}
                </li>
              );
            })}
        {count === 0 ? (
          <li className="text-sm text-muted">No assets recorded.</li>
        ) : null}
      </ul>
    </div>
  );
}
