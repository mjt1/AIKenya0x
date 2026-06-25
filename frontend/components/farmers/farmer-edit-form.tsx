"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Text } from "@/components/ui/text";
import { Field } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { useFarmer } from "@/hooks/queries/use-farmer";
import { useUpdateFarmer } from "@/hooks/mutations/use-update-farmer";
import { ApiError } from "@/lib/api";

export function FarmerEditForm({ farmerId }: { farmerId: string }) {
  const router = useRouter();
  const farmer = useFarmer(farmerId);
  const update = useUpdateFarmer(farmerId);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [gps, setGps] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  // Seed the form from the loaded farmer, once.
  useEffect(() => {
    if (farmer.data && !ready) {
      setName(farmer.data.name);
      setPhone(farmer.data.phone);
      setGps(farmer.data.gps ?? "");
      setReady(true);
    }
  }, [farmer.data, ready]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name.trim()) return setError("Name can't be empty.");
    if (!phone.trim()) return setError("Phone can't be empty.");
    try {
      await update.mutateAsync({
        name: name.trim(),
        phone: phone.trim(),
        ...(gps.trim() ? { gps: gps.trim() } : {}),
      });
      router.push(`/farmers/${farmerId}`);
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setError("This farmer was updated elsewhere. Reload and try again.");
      } else {
        setError(
          err instanceof ApiError
            ? err.message
            : "Couldn't save changes. Please try again.",
        );
      }
    }
  }

  if (farmer.isPending) {
    return (
      <div className="py-12 text-center">
        <Spinner className="mx-auto h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (farmer.isError || !farmer.data) {
    return (
      <div className="py-12 text-center">
        <Text variant="h3">Farmer not found</Text>
        <div className="mt-4">
          <Button size="sm" variant="secondary" onClick={() => router.push("/farmers")}>
            Back to farmers
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header>
        <Text variant="h1">Edit farmer</Text>
        <Text variant="muted" className="mt-1">
          Update {farmer.data.name}&apos;s profile. Enterprises are managed from
          the farmer page.
        </Text>
      </header>

      <form
        onSubmit={onSubmit}
        className="max-w-lg space-y-5 rounded-card border border-outline bg-surface p-5"
      >
        {error ? (
          <div
            role="alert"
            className="rounded-md border border-danger/30 bg-danger-surface px-3 py-2 text-sm text-danger"
          >
            {error}
          </div>
        ) : null}

        <Field
          label="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
        <Field
          label="Phone"
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          required
        />
        <Field
          label="GPS (lat,lng)"
          value={gps}
          placeholder="0.2827,34.7519"
          hint="Optional — enables the caseload map."
          onChange={(e) => setGps(e.target.value)}
        />

        <div className="flex gap-2">
          <Button type="submit" loading={update.isPending}>
            {update.isPending ? "Saving…" : "Save changes"}
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={() => router.push(`/farmers/${farmerId}`)}
          >
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
