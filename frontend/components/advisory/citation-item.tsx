import type { AdvisoryCitation } from "@/lib/types";

export function CitationItem({
  citation,
  index,
}: {
  citation: AdvisoryCitation;
  index: number;
}) {
  return (
    <li className="rounded-md border border-outline bg-app px-3 py-2">
      <div className="flex items-center justify-between gap-2">
        <span className="min-w-0 truncate text-xs font-semibold text-foreground">
          [{index}] {citation.title ?? citation.source}
        </span>
        <span className="shrink-0 text-[11px] tabular-nums text-faint">
          {Math.round(citation.score * 100)}% match
        </span>
      </div>
      {citation.title ? (
        <p className="truncate text-[11px] text-faint">{citation.source}</p>
      ) : null}
      <p className="mt-1 text-xs text-muted">{citation.snippet}</p>
    </li>
  );
}
