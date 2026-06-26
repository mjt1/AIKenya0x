"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Field } from "@/components/ui/input";
import { SelectField } from "@/components/ui/select";
import { Text } from "@/components/ui/text";
import { Spinner } from "@/components/ui/spinner";
import { useAdminAgents } from "@/hooks/queries/use-admin-agents";
import { useCreateAgent } from "@/hooks/mutations/use-create-agent";
import { useUpdateAgentRole } from "@/hooks/mutations/use-update-agent-role";
import { ApiError } from "@/lib/api";
import type { CreateAgentInput, Role } from "@/lib/types";

const EMPTY: CreateAgentInput = {
  name: "",
  email: "",
  password: "",
  county: "",
  role: "agent",
};

/** US-17 — Admin agent management: create agents and change roles. */
export function AgentsAdmin() {
  const agents = useAdminAgents();
  const create = useCreateAgent();
  const updateRole = useUpdateAgentRole();

  const [form, setForm] = useState<CreateAgentInput>(EMPTY);
  const set = (k: keyof CreateAgentInput, v: string) =>
    setForm((f) => ({ ...f, [k]: v }));

  const canSubmit =
    form.name.trim().length > 0 &&
    form.email.trim().length > 0 &&
    form.password.length >= 8 &&
    form.county.trim().length > 0;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    create.mutate(
      {
        ...form,
        name: form.name.trim(),
        email: form.email.trim(),
        county: form.county.trim(),
      },
      { onSuccess: () => setForm(EMPTY) },
    );
  };

  const createError =
    create.error instanceof ApiError
      ? create.error.message
      : create.error
        ? "Couldn't create agent."
        : undefined;

  const list = agents.data ?? [];

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-xl font-bold text-foreground">Agents</h1>
        <Text variant="caption">
          Create extension agents and manage their platform roles.
        </Text>
      </header>

      <form
        onSubmit={submit}
        className="space-y-4 rounded-card border border-outline bg-surface p-4"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Name"
            name="name"
            value={form.name}
            onChange={(e) => set("name", e.target.value)}
            disabled={create.isPending}
          />
          <Field
            label="Email"
            name="email"
            type="email"
            value={form.email}
            onChange={(e) => set("email", e.target.value)}
            disabled={create.isPending}
          />
          <Field
            label="Password"
            name="password"
            type="password"
            hint="At least 8 characters."
            value={form.password}
            onChange={(e) => set("password", e.target.value)}
            disabled={create.isPending}
          />
          <Field
            label="County"
            name="county"
            placeholder="Kakamega"
            value={form.county}
            onChange={(e) => set("county", e.target.value)}
            disabled={create.isPending}
          />
        </div>
        <SelectField
          label="Role"
          name="role"
          value={form.role ?? "agent"}
          onChange={(e) => set("role", e.target.value)}
          disabled={create.isPending}
        >
          <option value="agent">Agent</option>
          <option value="admin">Admin</option>
        </SelectField>

        {createError ? <p className="text-sm text-danger">{createError}</p> : null}

        <div className="flex justify-end">
          <Button
            type="submit"
            loading={create.isPending}
            disabled={!canSubmit || create.isPending}
          >
            Create agent
          </Button>
        </div>
      </form>

      <section className="space-y-2">
        <Text variant="overline">All agents</Text>
        {agents.isPending ? (
          <div className="flex justify-center py-8">
            <Spinner className="h-5 w-5 animate-spin" />
          </div>
        ) : agents.isError ? (
          <p className="text-sm text-danger">Couldn&apos;t load agents.</p>
        ) : list.length === 0 ? (
          <p className="text-sm text-muted">No agents yet.</p>
        ) : (
          <ul className="divide-y divide-outline rounded-card border border-outline bg-surface">
            {list.map((a) => {
              const pendingRole =
                updateRole.isPending && updateRole.variables?.id === a.id;
              return (
                <li
                  key={a.id}
                  className="flex items-center justify-between gap-3 px-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-foreground">
                      {a.name}
                    </p>
                    <p className="truncate text-xs text-muted">
                      {a.email} · {a.county}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Badge tone={a.role === "admin" ? "warning" : "neutral"}>
                      {a.role}
                    </Badge>
                    <select
                      aria-label={`Role for ${a.name}`}
                      className="rounded-md border border-outline-strong bg-surface px-2 py-1 text-xs text-foreground disabled:opacity-60"
                      value={a.role}
                      disabled={pendingRole}
                      onChange={(e) =>
                        updateRole.mutate({
                          id: a.id,
                          role: e.target.value as Role,
                        })
                      }
                    >
                      <option value="agent">agent</option>
                      <option value="admin">admin</option>
                    </select>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
