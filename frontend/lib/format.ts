/** Two-letter initials from a name, e.g. "Asha Wekesa" -> "AW". */
export function initials(name: string): string {
  return name
    .split(" ")
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

/** Humanize a role string, e.g. "agent" -> "Agent". */
export function roleLabel(role: string): string {
  return role ? role.charAt(0).toUpperCase() + role.slice(1) : "Agent";
}

/** First token of a name, e.g. "Asha Wekesa" -> "Asha". */
export function firstName(name: string): string {
  return name.trim().split(" ")[0] || name;
}

/** Time-of-day greeting. */
export function greeting(date: Date = new Date()): string {
  const h = date.getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

const KIND_LABELS: Record<string, string> = {
  overdue_visit: "Overdue visit",
  first_visit: "First visit",
  issue_followup: "Issue follow-up",
  advice_followup: "Advice follow-up",
};

/** Humanize a recommendation kind, e.g. "overdue_visit" -> "Overdue visit". */
export function kindLabel(kind: string): string {
  return KIND_LABELS[kind] ?? kind.replace(/_/g, " ");
}
