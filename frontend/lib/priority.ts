/** Priority bands derived from a recommendation's 0-100 score (PRD US-07/08/09). */
export type PriorityBand = "urgent" | "window" | "routine";

export function priorityBand(priority: number): PriorityBand {
  if (priority >= 75) return "urgent";
  if (priority >= 45) return "window";
  return "routine";
}

export const BAND_META: Record<
  PriorityBand,
  { label: string; tone: "danger" | "warning" | "success" }
> = {
  urgent: { label: "Urgent", tone: "danger" },
  window: { label: "Window closing", tone: "warning" },
  routine: { label: "Routine", tone: "success" },
};
