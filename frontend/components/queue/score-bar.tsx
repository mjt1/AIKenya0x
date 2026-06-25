import { cn } from "@/lib/utils";
import { priorityBand, type PriorityBand } from "@/lib/priority";

const FILL: Record<PriorityBand, string> = {
  urgent: "bg-danger",
  window: "bg-warning",
  routine: "bg-routine",
};

/** Horizontal 0-100 priority bar, coloured by band, with the numeric score. */
export function ScoreBar({ value }: { value: number }) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-sunken">
        <div
          className={cn("h-full rounded-full", FILL[priorityBand(value)])}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="w-7 shrink-0 text-right text-xs font-semibold tabular-nums text-foreground">
        {Math.round(value)}
      </span>
    </div>
  );
}
