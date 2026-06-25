import Link from "next/link";
import { Text } from "@/components/ui/text";
import type { FarmerListItem } from "@/lib/types";

function lastVisitedLabel(iso: string | null): string {
  if (!iso) return "Never visited";
  const d = new Date(iso).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  return `Last visit ${d}`;
}

export function FarmerListRow({ farmer }: { farmer: FarmerListItem }) {
  return (
    <Link
      href={`/farmers/${farmer.id}`}
      className="flex items-center justify-between gap-3 border-b border-outline px-4 py-3 transition-colors last:border-b-0 hover:bg-surface-muted"
    >
      <div className="min-w-0">
        <p className="truncate font-semibold text-foreground">{farmer.name}</p>
        <p className="truncate text-sm text-muted">{farmer.phone}</p>
      </div>
      <div className="shrink-0 text-right">
        <Text variant="caption">{lastVisitedLabel(farmer.lastVisitedAt)}</Text>
        {!farmer.gps ? <p className="text-[11px] text-warning">No GPS</p> : null}
      </div>
    </Link>
  );
}
