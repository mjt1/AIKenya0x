"use client";

import { useEffect, useRef, useState } from "react";
import { Text } from "@/components/ui/text";
import { SelectField } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { AdvisoryTurn } from "@/components/advisory/advisory-turn";
import { useFarmers } from "@/hooks/queries/use-farmers";
import { useAskAdvisory } from "@/hooks/mutations/use-ask-advisory";
import { ApiError } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { AdvisoryAnswer } from "@/lib/types";

type EnterpriseScope = "" | "dairy" | "sugarcane";

const SUGGESTIONS = [
  "What's the CAN top-dressing rate for ratoon cane?",
  "Cow off feed with low milk — what should I check?",
  "How do I manage suspected sugarcane smut?",
];

function enterpriseLabel(e: EnterpriseScope): string {
  return e === "dairy" ? "Dairy" : e === "sugarcane" ? "Sugarcane" : "";
}

export function AdvisoryChat({ initialFarmerId }: { initialFarmerId?: string }) {
  const farmers = useFarmers();
  const ask = useAskAdvisory();

  const [question, setQuestion] = useState("");
  const [farmerId, setFarmerId] = useState(initialFarmerId ?? "");
  const [enterprise, setEnterprise] = useState<EnterpriseScope>("");
  const [turns, setTurns] = useState<AdvisoryAnswer[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [attachOpen, setAttachOpen] = useState(false);
  const [focused, setFocused] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [turns.length, ask.isPending]);

  async function doAsk() {
    if (ask.isPending) return;
    setError(null);
    const q = question.trim();
    if (q.length < 3) {
      return setError("Type a question (at least 3 characters).");
    }
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

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void doAsk();
    }
  }

  const selectedFarmerName = farmers.data?.find((f) => f.id === farmerId)?.name;
  const hasContext = Boolean(farmerId || enterprise);
  const canSend = question.trim().length >= 3 && !ask.isPending;

  return (
    <div className="space-y-4">
      <header>
        <Text variant="h1">Chat with Suluhu</Text>
        <Text variant="muted" className="mt-1">
          Ask a technical question — answers are grounded in the knowledge base
          and cite their sources.
        </Text>
      </header>

      {/* Conversation */}
      <div
        ref={scrollRef}
        className="h-[54vh] space-y-6 overflow-y-auto rounded-card border border-outline bg-surface p-4"
      >
        {turns.length === 0 && !ask.isPending ? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <Text variant="h3">Ask anything agronomic or veterinary</Text>
            <Text variant="muted" className="mx-auto mt-1 max-w-md">
              Grounded in your knowledge base. Attach a farmer or enterprise for
              tailored, cited answers.
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

      {/* Composer (mirrors the uiverse AI Input, themed green) */}
      <div>
        {error ? (
          <div
            role="alert"
            className="mb-2 rounded-md border border-danger/30 bg-danger-surface px-3 py-2 text-sm text-danger"
          >
            {error}
          </div>
        ) : null}

        {/* Suggestions (replace the scrolling marquee) */}
        {question.trim() === "" ? (
          <div className="mb-2 flex flex-wrap gap-2">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => {
                  setQuestion(s);
                  inputRef.current?.focus();
                }}
                className="rounded-full border border-outline bg-surface px-3 py-1 text-xs text-muted transition-colors hover:border-primary hover:text-primary"
              >
                {s}
              </button>
            ))}
          </div>
        ) : null}

        {/* Attached-context chips */}
        {hasContext ? (
          <div className="mb-2 flex flex-wrap items-center gap-2 text-xs">
            {selectedFarmerName ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-container px-2.5 py-1 font-medium text-on-primary-container">
                Farmer · {selectedFarmerName}
                <button
                  type="button"
                  aria-label="Remove farmer"
                  className="text-on-primary-container/70 hover:text-on-primary-container"
                  onClick={() => setFarmerId("")}
                >
                  ×
                </button>
              </span>
            ) : null}
            {enterprise ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-container px-2.5 py-1 font-medium text-on-primary-container">
                {enterpriseLabel(enterprise)}
                <button
                  type="button"
                  aria-label="Remove enterprise"
                  className="text-on-primary-container/70 hover:text-on-primary-container"
                  onClick={() => setEnterprise("")}
                >
                  ×
                </button>
              </span>
            ) : null}
          </div>
        ) : null}

        {/* Relative wrapper so the attach popover is NOT clipped by the
            composer's overflow-hidden (which only clips the glow). */}
        <div className="relative">
          {/* Attach popover: farmer + enterprise */}
          {attachOpen ? (
            <div className="absolute bottom-full left-0 z-30 mb-2 w-72 max-w-[calc(100%-1rem)] space-y-3 rounded-card border border-outline bg-surface p-3 shadow-lg">
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
                onChange={(e) =>
                  setEnterprise(e.target.value as EnterpriseScope)
                }
              >
                <option value="">Any</option>
                <option value="dairy">Dairy</option>
                <option value="sugarcane">Sugarcane</option>
              </SelectField>
              <div className="flex justify-end">
                <button
                  type="button"
                  className="text-xs font-medium text-primary"
                  onClick={() => setAttachOpen(false)}
                >
                  Done
                </button>
              </div>
            </div>
          ) : null}

          <form
            onSubmit={(e) => {
              e.preventDefault();
              void doAsk();
            }}
            className="relative overflow-hidden rounded-2xl border border-outline-strong bg-primary-dark"
          >
            {/* Soft glow that intensifies on focus */}
            <div
              aria-hidden
              className={cn(
                "pointer-events-none absolute h-44 w-44 rounded-full bg-white/20 blur-2xl transition-all duration-700",
                focused
                  ? "left-1/2 top-0 -translate-x-1/2 -translate-y-1/2 opacity-70"
                  : "left-0 top-0 -translate-x-1/3 -translate-y-1/2 opacity-40",
              )}
            />

            <div className="relative z-10 p-3">
              <textarea
                ref={inputRef}
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                onKeyDown={onKeyDown}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                rows={2}
                aria-label="Your question"
                placeholder="Ask about a farmer, crop, or issue…"
                className="max-h-40 w-full resize-none bg-transparent text-[15px] leading-relaxed text-white placeholder:text-white/45 outline-none"
              />

              <div className="mt-2 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setAttachOpen((o) => !o)}
                  aria-expanded={attachOpen}
                  aria-label="Attach farmer and enterprise"
                  className={cn(
                    "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                    hasContext
                      ? "bg-white/15 text-white"
                      : "text-white/70 hover:bg-white/10 hover:text-white",
                  )}
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-4 w-4"
                  >
                    <path d="M21.44 11.05l-9.19 9.19a5 5 0 0 1-7.07-7.07l9.19-9.19a3.5 3.5 0 0 1 4.95 4.95l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
                  </svg>
                  {hasContext ? "Context attached" : "Attach context"}
                </button>

                <button
                  type="submit"
                  disabled={!canSend}
                  aria-label="Send question"
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-on-primary transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {ask.isPending ? (
                    <Spinner className="h-4 w-4 animate-spin" />
                  ) : (
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="h-4 w-4"
                    >
                      <path d="M12 19V5M5 12l7-7 7 7" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
