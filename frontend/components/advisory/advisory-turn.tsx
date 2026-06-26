import { Text } from "@/components/ui/text";
import { Badge } from "@/components/ui/badge";
import { CitationItem } from "@/components/advisory/citation-item";
import type { AdvisoryAnswer } from "@/lib/types";

const CONFIDENCE_TONE: Record<string, "success" | "neutral" | "warning"> = {
  HIGH: "success",
  MEDIUM: "neutral",
  LOW: "warning",
};

/** One advisory Q&A turn: the question, then the grounded (or referral) answer. */
export function AdvisoryTurn({ answer }: { answer: AdvisoryAnswer }) {
  const actionItems = answer.actionItems ?? [];
  const inputsNeeded = answer.inputsNeeded ?? [];

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
          {answer.confidence ? (
            <Badge tone={CONFIDENCE_TONE[answer.confidence] ?? "neutral"}>
              {answer.confidence} confidence
            </Badge>
          ) : null}
          {answer.farmer ? <Badge tone="neutral">{answer.farmer.name}</Badge> : null}
        </div>

        <p className="whitespace-pre-wrap text-sm text-foreground">
          {answer.answer}
        </p>

        {answer.deferred && answer.referralReason ? (
          <div className="rounded-md border border-outline bg-surface-muted px-3 py-2">
            <Text variant="overline">Why refer</Text>
            <p className="mt-0.5 text-sm text-foreground">{answer.referralReason}</p>
          </div>
        ) : null}

        {actionItems.length > 0 ? (
          <div>
            <Text variant="overline">Recommended actions</Text>
            <ol className="mt-1.5 list-decimal space-y-1 pl-5 text-sm text-foreground">
              {actionItems.map((a, i) => (
                <li key={i}>{a}</li>
              ))}
            </ol>
          </div>
        ) : null}

        {inputsNeeded.length > 0 ? (
          <div>
            <Text variant="overline">Inputs to carry</Text>
            <ul className="mt-1.5 space-y-1 text-sm text-foreground">
              {inputsNeeded.map((inp, i) => (
                <li key={i} className="flex flex-wrap items-baseline gap-x-2">
                  <span className="font-medium">{inp.name}</span>
                  {inp.quantity || inp.unit ? (
                    <span className="text-muted">
                      {[inp.quantity, inp.unit].filter(Boolean).join(" ")}
                    </span>
                  ) : null}
                  {inp.notes ? (
                    <span className="text-faint">({inp.notes})</span>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

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
