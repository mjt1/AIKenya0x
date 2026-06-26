"use client";

import { useEffect, useRef, useState } from "react";
import { Text } from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/input";
import { SelectField } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { AdvisoryTurn } from "@/components/advisory/advisory-turn";
import { useFarmers } from "@/hooks/queries/use-farmers";
import { useAskAdvisory } from "@/hooks/mutations/use-ask-advisory";
import { ApiError } from "@/lib/api";
import type { AdvisoryAnswer } from "@/lib/types";

type EnterpriseScope = "" | "dairy" | "sugarcane";

export function AdvisoryChat({
  initialFarmerId,
}: {
  initialFarmerId?: string;
}) {
  const farmers = useFarmers();
  const ask = useAskAdvisory();

  const [question, setQuestion] = useState("");
  const [farmerId, setFarmerId] = useState(initialFarmerId ?? "");
  const [enterprise, setEnterprise] = useState<EnterpriseScope>("");
  const [turns, setTurns] = useState<AdvisoryAnswer[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Keep the newest message in view, like a chat.
  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [turns.length, ask.isPending]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const q = question.trim();
    if (q.length < 3)
      return setError("Type a question (at least 3 characters).");
    try {
      const res = await ask.mutateAsync({
        question: q,
        ...(farmerId ? { farmerId } : {}),
        ...(enterprise ? { enterprise } : {}),
      });
      setTurns((cur) => [...cur, res]);
      setQuestion("");
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Couldn't get an answer. Please try again.",
      );
    }
  }

  const selectedFarmerName = farmers.data?.find((f) => f.id === farmerId)?.name;

  return (
    <div className="space-y-4">
      <header>
        <Text variant="h1">Chat with Suluhu</Text>
        <Text variant="muted" className="mt-1">
          Ask a technical question — answers are grounded in the knowledge base
          and cite their sources.
        </Text>
      </header>

      {/* Message column — oldest at top, newest (and "thinking") at the bottom. */}
      <div
        ref={scrollRef}
        className="h-[58vh] space-y-6 overflow-y-auto rounded-card border border-outline bg-surface p-4"
      >
        {turns.length === 0 && !ask.isPending ? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <Text variant="h3">Ask anything agronomic or veterinary</Text>
            <Text variant="muted" className="mx-auto mt-1 max-w-md">
              e.g. &quot;What&apos;s the CAN top-dressing rate for ratoon
              cane?&quot; or &quot;Cow off feed with low milk — what should I
              check?&quot;
            </Text>
          </div>
        ) : (
          <>
            {turns.map((t) => (
              <AdvisoryTurn key={t.inquiryId} answer={t} />
            ))}
            {ask.isPending ? (
              <div className="flex items-center gap-2 text-sm text-muted">
                <Spinner className="h-4 w-4 animate-spin" /> Thinking…
              </div>
            ) : null}
          </>
        )}
      </div>

      {/* Composer — pinned beneath the conversation. */}
      <form
        onSubmit={onSubmit}
        className="space-y-3 rounded-card border border-outline bg-surface p-4"
      >
        {error ? (
          <div
            role="alert"
            className="rounded-md border border-danger/30 bg-danger-surface px-3 py-2 text-sm text-danger"
          >
            {error}
          </div>
        ) : null}

        <div className="grid gap-3 sm:grid-cols-2">
          <SelectField
            label="Farmer (optional)"
            value={farmerId}
            onChange={(e) => setFarmerId(e.target.value)}
            disabled={farmers.isPending}
            hint={
              selectedFarmerName
                ? `Grounded in ${selectedFarmerName}'s records`
                : "Link a farmer to use their history"
            }
          >
            <option value="">General — no farmer</option>
            {farmers.data?.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </SelectField>
          <SelectField
            label="Enterprise (optional)"
            value={enterprise}
            onChange={(e) => setEnterprise(e.target.value as EnterpriseScope)}
          >
            <option value="">Any</option>
            <option value="dairy">Dairy</option>
            <option value="sugarcane">Sugarcane</option>
          </SelectField>
        </div>

        <div className="flex items-end gap-2">
          <div className="flex-1">
            <Field
              label="Question"
              value={question}
              placeholder="Ask a question…"
              onChange={(e) => setQuestion(e.target.value)}
            />
          </div>
          <Button type="submit" loading={ask.isPending}>
            {ask.isPending ? "Asking…" : "Ask"}
          </Button>
        </div>
      </form>
    </div>
  );
}
