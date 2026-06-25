"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Text } from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Spinner } from "@/components/ui/spinner";
import { SelectField } from "@/components/ui/select";
import { TextAreaField } from "@/components/ui/textarea";
import { VisitResult } from "@/components/capture/visit-result";
import { useFarmers } from "@/hooks/queries/use-farmers";
import { useFarmer } from "@/hooks/queries/use-farmer";
import { useCreateVisit } from "@/hooks/mutations/use-create-visit";
import { ApiError } from "@/lib/api";
import type { Visit } from "@/lib/types";

export function CaptureForm({ initialFarmerId }: { initialFarmerId?: string }) {
  const router = useRouter();
  const farmers = useFarmers();
  const create = useCreateVisit();

  const [farmerId, setFarmerId] = useState(initialFarmerId ?? "");
  const farmer = useFarmer(farmerId || null);

  const [enterpriseIds, setEnterpriseIds] = useState<string[]>([]);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Visit | null>(null);

  // Default-select every enterprise once a farmer's detail loads.
  useEffect(() => {
    if (farmer.data) setEnterpriseIds(farmer.data.enterprises.map((e) => e.id));
  }, [farmer.data]);

  function toggleEnterprise(id: string) {
    setEnterpriseIds((cur) =>
      cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id],
    );
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!farmerId) return setError("Select a farmer first.");
    if (enterpriseIds.length === 0)
      return setError("Select at least one enterprise the visit covered.");
    if (!notes.trim()) return setError("Add a few notes from the visit.");
    try {
      const visit = await create.mutateAsync({
        farmerId,
        input: { enterpriseIds, notes: notes.trim() },
      });
      setResult(visit);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Couldn't log the visit. Please try again.",
      );
    }
  }

  const farmerName =
    farmer.data?.name ??
    farmers.data?.find((f) => f.id === farmerId)?.name ??
    "the farmer";

  const noFarmers = !farmers.isPending && (farmers.data?.length ?? 0) === 0;

  return (
    <div className="space-y-6">
      <header>
        <Text variant="h1">Log a visit</Text>
        <Text variant="muted" className="mt-1">
          Capture what you saw — the AI sorts your notes into observations,
          issues, and advice.
        </Text>
      </header>

      {result ? (
        <VisitResult
          visit={result}
          farmerName={farmerName}
          onLogAnother={() => {
            setResult(null);
            setNotes("");
          }}
        />
      ) : farmers.isError ? (
        <Text variant="muted">Couldn&apos;t load your caseload.</Text>
      ) : noFarmers ? (
        <div className="rounded-card border border-outline bg-surface px-4 py-12 text-center">
          <Text variant="h3">No farmers yet</Text>
          <Text variant="muted" className="mt-1">
            Add a farmer before logging a visit.
          </Text>
          <div className="mt-4">
            <Button size="sm" onClick={() => router.push("/farmers/new")}>
              Add a farmer
            </Button>
          </div>
        </div>
      ) : (
        <form
          onSubmit={onSubmit}
          className="space-y-5 rounded-card border border-outline bg-surface p-5"
        >
          {error ? (
            <div
              role="alert"
              className="rounded-md border border-danger/30 bg-danger-surface px-3 py-2 text-sm text-danger"
            >
              {error}
            </div>
          ) : null}

          <SelectField
            label="Farmer"
            name="farmer"
            value={farmerId}
            onChange={(e) => setFarmerId(e.target.value)}
            disabled={farmers.isPending}
          >
            <option value="">
              {farmers.isPending ? "Loading caseload…" : "Select a farmer"}
            </option>
            {farmers.data?.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </SelectField>

          {farmerId && farmer.isLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted">
              <Spinner className="h-4 w-4 animate-spin" /> Loading enterprises…
            </div>
          ) : null}

          {farmer.data ? (
            farmer.data.enterprises.length > 0 ? (
              <div className="flex flex-col gap-2">
                <span className="text-sm font-medium text-foreground">
                  Enterprises visited
                </span>
                <div className="flex flex-wrap gap-4">
                  {farmer.data.enterprises.map((ent) => (
                    <Checkbox
                      key={ent.id}
                      label={ent.type}
                      checked={enterpriseIds.includes(ent.id)}
                      onChange={() => toggleEnterprise(ent.id)}
                    />
                  ))}
                </div>
              </div>
            ) : (
              <Text variant="muted">
                This farmer has no enterprises registered yet.
              </Text>
            )
          ) : null}

          <TextAreaField
            label="Field notes"
            name="notes"
            rows={5}
            placeholder="e.g. Cow off feed for 2 days, milk yield down ~20%. Advised electrolytes and a vet check. Cane block 2 ready for top-dressing."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />

          <Button type="submit" loading={create.isPending} disabled={!farmerId}>
            {create.isPending ? "Logging…" : "Log visit"}
          </Button>
        </form>
      )}
    </div>
  );
}
