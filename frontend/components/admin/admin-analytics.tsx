"use client";

import { StatCard } from "@/components/stat-card";
import { Badge } from "@/components/ui/badge";
import { Text } from "@/components/ui/text";
import { Spinner } from "@/components/ui/spinner";
import {
  useAdminOverview,
  useAdminByAgent,
} from "@/hooks/queries/use-admin-analytics";

/** US-19 — Platform analytics across agents (admin only). */
export function AdminAnalytics() {
  const overview = useAdminOverview();
  const byAgent = useAdminByAgent();
  const o = overview.data;
  const rows = byAgent.data ?? [];

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-xl font-bold text-foreground">Analytics</h1>
        <Text variant="caption">
          Platform-wide visit volumes, adoption, and per-agent activity.
        </Text>
      </header>

      {overview.isPending ? (
        <div className="flex justify-center py-8">
          <Spinner className="h-5 w-5 animate-spin" />
        </div>
      ) : overview.isError || !o ? (
        <p className="text-sm text-danger">Couldn&apos;t load platform analytics.</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Agents" value={o.totalAgents} />
          <StatCard label="Farmers" value={o.totalFarmers} />
          <StatCard
            label="Visits (total)"
            value={o.totalVisits}
            hint={`${o.visitsThisWeek} this week`}
          />
          <StatCard
            label="Adoption rate"
            value={`${Math.round(o.adoptionRate * 100)}%`}
            hint={`${o.recsDone + o.recsPartlyDone}/${o.totalRecommendations} acted on`}
            emphasis
          />
          <StatCard label="Visits this month" value={o.visitsThisMonth} />
          <StatCard label="Recommendations" value={o.totalRecommendations} />
          <StatCard label="KB documents" value={o.totalKbDocuments} />
        </div>
      )}

      <section className="space-y-2">
        <Text variant="overline">By agent</Text>
        {byAgent.isPending ? (
          <div className="flex justify-center py-8">
            <Spinner className="h-5 w-5 animate-spin" />
          </div>
        ) : byAgent.isError ? (
          <p className="text-sm text-danger">Couldn&apos;t load per-agent rollups.</p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted">No agents yet.</p>
        ) : (
          <div className="overflow-x-auto rounded-card border border-outline bg-surface">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-outline text-left text-xs uppercase tracking-wide text-faint">
                  <th className="px-4 py-2 font-semibold">Agent</th>
                  <th className="px-4 py-2 font-semibold">Role</th>
                  <th className="px-4 py-2 text-right font-semibold">Caseload</th>
                  <th className="px-4 py-2 text-right font-semibold">Visits</th>
                  <th className="px-4 py-2 text-right font-semibold">Last 30d</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((a) => (
                  <tr key={a.id} className="border-b border-outline last:border-b-0">
                    <td className="px-4 py-2">
                      <span className="font-medium text-foreground">{a.name}</span>
                      <span className="block text-xs text-muted">{a.email}</span>
                    </td>
                    <td className="px-4 py-2">
                      <Badge tone={a.role === "admin" ? "warning" : "neutral"}>
                        {a.role}
                      </Badge>
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums">
                      {a.caseloadSize}
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums">
                      {a.totalVisits}
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums">
                      {a.visitsLast30d}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
