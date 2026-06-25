"use client";

import { Badge } from "@/components/ui/badge";
import { Text } from "@/components/ui/text";
import { StatCard } from "@/components/stat-card";
import { useMe } from "@/hooks/queries/use-me";
import { initials, roleLabel } from "@/lib/format";

/** US-02 — agent profile + the caseload scoped to them. */
export function ProfileSummary() {
  const me = useMe();
  if (!me.data) return null;
  const { agent, caseloadSize } = me.data;

  return (
    <div className="space-y-6">
      <header>
        <Text variant="h1">Profile</Text>
        <Text variant="muted" className="mt-1">
          Your account and the caseload scoped to you.
        </Text>
      </header>

      <div className="rounded-card border border-outline bg-surface p-5">
        <div className="flex items-center gap-4">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-primary-container text-lg font-bold text-on-primary-container">
            {initials(agent.name)}
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Text variant="h3" className="truncate">
                {agent.name}
              </Text>
              <Badge tone="brand">{roleLabel(agent.role)}</Badge>
            </div>
            <Text variant="muted" className="truncate">
              {agent.email}
            </Text>
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <StatCard
          label="Caseload"
          value={caseloadSize}
          hint="farmers assigned to you"
          emphasis
        />
        <StatCard label="County" value={agent.county} />
      </div>

      <Text
        variant="muted"
        as="p"
        className="rounded-md bg-surface-muted px-4 py-3"
      >
        You only see farmers in your caseload. Records stay scoped to your
        county.
      </Text>
    </div>
  );
}
