import { Text } from "@/components/ui/text";
import { Badge } from "@/components/ui/badge";
import { CitationItem } from "@/components/advisory/citation-item";
import type { AdvisoryAnswer } from "@/lib/types";

/** One advisory Q&A turn: the question, then the grounded (or referral) answer. */
export function AdvisoryTurn({ answer }: { answer: AdvisoryAnswer }) {
  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-card rounded-br-sm bg-primary px-4 py-2.5 text-sm text-on-primary">
          {answer.question}
        </div>
      </div>

      <div className="max-w-[90%] space-y-3 rounded-card border border-outline bg-surface p-4">
        <div className="flex flex-wrap items-center gap-2">
          {answer.deferred ? (
            <Badge tone="warning">Referral advised</Badge>
          ) : (
            <Badge tone="success">Grounded answer</Badge>
          )}
          {answer.farmer ? <Badge tone="neutral">{answer.farmer.name}</Badge> : null}
        </div>

        <p className="whitespace-pre-wrap text-sm text-foreground">
          {answer.answer}
        </p>

        {answer.rationale ? (
          <Text variant="caption">{answer.rationale}</Text>
        ) : null}

        {answer.citations.length > 0 ? (
          <div>
            <Text variant="overline">Sources</Text>
            <ul className="mt-1.5 space-y-1.5">
              {answer.citations.map((c, i) => (
                <CitationItem key={c.chunkId} citation={c} index={i + 1} />
              ))}
            </ul>
          </div>
        ) : (
          <Text variant="caption">No sources retrieved for this question.</Text>
        )}
      </div>
    </div>
  );
}
