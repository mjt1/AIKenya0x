"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { TextAreaField } from "@/components/ui/textarea";
import { useUpdateRecommendationStatus } from "@/hooks/mutations/use-update-recommendation-status";
import type { Recommendation, RecommendationStatus } from "@/lib/types";

type Outcome = Extract<RecommendationStatus, "done" | "partly_done" | "not_done">;

const OUTCOMES: { value: Outcome; label: string }[] = [
  { value: "done", label: "Done" },
  { value: "partly_done", label: "Partly done" },
  { value: "not_done", label: "Not done" },
];

/**
 * Expandable outcome logger for a queued recommendation (US-13). Lets the agent
 * record done / partly done / not done plus an optional free-text note. On a
 * resolved outcome the queue invalidates and the row drops off the pending list.
 */
export function RecommendationOutcome({
  rec,
  onClose,
}: {
  rec: Recommendation;
  onClose: () => void;
}) {
  const [outcome, setOutcome] = useState<Outcome>("done");
  const [note, setNote] = useState("");
  const update = useUpdateRecommendationStatus();

  const save = () => {
    update.mutate(
      { id: rec.id, status: outcome, note: note.trim() || undefined },
      { onSuccess: onClose },
    );
  };

  return (
    <div className="mt-3 rounded-lg border border-outline bg-surface-muted p-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-faint">
        Log outcome
      </p>

      <div className="mt-2 flex flex-wrap gap-1.5">
        {OUTCOMES.map((o) => (
          <Button
            key={o.value}
            size="sm"
            variant={outcome === o.value ? "primary" : "secondary"}
            aria-pressed={outcome === o.value}
            disabled={update.isPending}
            onClick={() => setOutcome(o.value)}
          >
            {o.label}
          </Button>
        ))}
      </div>

      <div className="mt-3">
        <TextAreaField
          label="Outcome note"
          name={`outcome-note-${rec.id}`}
          rows={2}
          placeholder="What happened on this visit?"
          hint={
            outcome === "done"
              ? "Optional \u2014 add detail if useful."
              : "Recommended \u2014 note why it was only partly done / not done."
          }
          value={note}
          onChange={(e) => setNote(e.target.value)}
          disabled={update.isPending}
        />
      </div>

      {update.isError ? (
        <p className="mt-2 text-xs text-danger">
          Couldn&apos;t save the outcome. Check your connection and try again.
        </p>
      ) : null}

      <div className="mt-3 flex justify-end gap-1.5">
        <Button
          size="sm"
          variant="ghost"
          disabled={update.isPending}
          onClick={onClose}
        >
          Cancel
        </Button>
        <Button size="sm" loading={update.isPending} onClick={save}>
          Save outcome
        </Button>
      </div>
    </div>
  );
}
