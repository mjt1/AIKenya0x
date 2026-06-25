"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Text } from "@/components/ui/text";
import { Field } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { EnterpriseFieldset } from "@/components/farmers/enterprise-fieldset";
import { newEnterprise, type EnterpriseDraft } from "@/components/farmers/draft";
import { useCreateFarmer } from "@/hooks/mutations/use-create-farmer";
import { ApiError } from "@/lib/api";
import type { CreateFarmerInput, EnterpriseInput } from "@/lib/types";

export function FarmerForm() {
  const router = useRouter();
  const create = useCreateFarmer();

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [gps, setGps] = useState("");
  const [enterprises, setEnterprises] = useState<EnterpriseDraft[]>([]);
  const [error, setError] = useState<string | null>(null);

  function addEnterprise(type: "Dairy" | "Sugarcane") {
    setEnterprises((cur) =>
      cur.some((e) => e.type === type) ? cur : [...cur, newEnterprise(type)],
    );
  }
  function updateEnterprise(next: EnterpriseDraft) {
    setEnterprises((cur) => cur.map((e) => (e.key === next.key ? next : e)));
  }
  function removeEnterprise(key: string) {
    setEnterprises((cur) => cur.filter((e) => e.key !== key));
  }

  function buildInput(): CreateFarmerInput {
    const ents = enterprises.map((e): EnterpriseInput => {
      if (e.type === "Dairy") {
        const animals = e.animals
          .filter((a) => a.breed.trim())
          .map((a) => ({
            breed: a.breed.trim(),
            ...(a.lactationStage.trim()
              ? { lactationStage: a.lactationStage.trim() }
              : {}),
          }));
        return { type: "Dairy", ...(animals.length ? { animals } : {}) };
      }
      const fields = e.fields
        .filter((f) => f.variety.trim() && f.areaHa.trim())
        .map((f) => ({
          variety: f.variety.trim(),
          areaHa: Number(f.areaHa),
          ...(f.ratoonCycle.trim() ? { ratoonCycle: Number(f.ratoonCycle) } : {}),
        }));
      return { type: "Sugarcane", ...(fields.length ? { fields } : {}) };
    });
    return {
      name: name.trim(),
      phone: phone.trim(),
      ...(gps.trim() ? { gps: gps.trim() } : {}),
      enterprises: ents,
    };
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name.trim()) return setError("Enter the farmer's name.");
    if (!phone.trim()) return setError("Enter a phone number.");
    if (enterprises.length === 0)
      return setError("Add at least one enterprise.");
    try {
      const farmer = await create.mutateAsync(buildInput());
      router.push(`/farmers/${farmer.id}`);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Couldn't register the farmer. Please try again.",
      );
    }
  }

  const hasDairy = enterprises.some((e) => e.type === "Dairy");
  const hasCane = enterprises.some((e) => e.type === "Sugarcane");

  return (
    <div className="space-y-6">
      <header>
        <Text variant="h1">Add a farmer</Text>
        <Text variant="muted" className="mt-1">
          Register a farmer and the enterprise(s) they run.
        </Text>
      </header>

      <form onSubmit={onSubmit} className="space-y-5">
        {error ? (
          <div
            role="alert"
            className="rounded-md border border-danger/30 bg-danger-surface px-3 py-2 text-sm text-danger"
          >
            {error}
          </div>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Name"
            value={name}
            placeholder="e.g. John Otieno"
            onChange={(e) => setName(e.target.value)}
            required
          />
          <Field
            label="Phone"
            type="tel"
            value={phone}
            placeholder="+254700000000"
            onChange={(e) => setPhone(e.target.value)}
            required
          />
        </div>
        <Field
          label="GPS (lat,lng)"
          value={gps}
          placeholder="0.2827,34.7519"
          hint="Optional — enables the caseload map."
          onChange={(e) => setGps(e.target.value)}
        />

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-foreground">
              Enterprises
            </span>
            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                variant="secondary"
                disabled={hasDairy}
                onClick={() => addEnterprise("Dairy")}
              >
                Add dairy
              </Button>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                disabled={hasCane}
                onClick={() => addEnterprise("Sugarcane")}
              >
                Add sugarcane
              </Button>
            </div>
          </div>
          {enterprises.length === 0 ? (
            <Text variant="muted">
              Add at least one enterprise (dairy, sugarcane, or both).
            </Text>
          ) : (
            <div className="space-y-3">
              {enterprises.map((e) => (
                <EnterpriseFieldset
                  key={e.key}
                  enterprise={e}
                  onChange={updateEnterprise}
                  onRemove={() => removeEnterprise(e.key)}
                />
              ))}
            </div>
          )}
        </div>

        <div className="flex gap-2">
          <Button type="submit" loading={create.isPending}>
            {create.isPending ? "Registering…" : "Register farmer"}
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={() => router.push("/farmers")}
          >
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
