import { Injectable } from '@nestjs/common';
import { Neo4jService } from '../neo4j/neo4j.service';

export interface OverviewRow {
  totalFarmers: number;
  visitedLast30d: number;
  overdue: number;
  neverVisited: number;
  visitsThisWeek: number;
  visitsThisMonth: number;
  observationsByKind: { kind: string; count: number }[];
}

export interface CadencePoint {
  date: string;
  visits: number;
}

export interface TrendPoint {
  weekStart: string;
  kind: string;
  count: number;
}

export interface FarmerHealthRow {
  id: string;
  name: string;
  phone: string;
  lastVisitedAt: string | null;
  daysSinceVisit: number | null;
  status: 'active' | 'stale' | 'overdue' | 'never';
  observationCount: number;
}

const toNum = (v: unknown): number =>
  typeof v === 'number' ? v : v && typeof (v as { toNumber?: () => number }).toNumber === 'function' ? (v as { toNumber: () => number }).toNumber() : Number(v ?? 0);

@Injectable()
export class AnalyticsRepository {
  constructor(private readonly neo4j: Neo4jService) {}

  async overview(agentId: string): Promise<OverviewRow> {
    const records = await this.neo4j.read(
      `MATCH (a:Agent {id: $agentId})-[:MANAGES]->(f:Farmer)
       WITH a, collect(f) AS farmers
       WITH a, farmers,
            size([x IN farmers WHERE x.lastVisitedAt IS NOT NULL
                  AND x.lastVisitedAt >= datetime() - duration({days: 30})]) AS visitedLast30d,
            size([x IN farmers WHERE x.lastVisitedAt IS NOT NULL
                  AND x.lastVisitedAt < datetime() - duration({days: 30})]) AS overdue,
            size([x IN farmers WHERE x.lastVisitedAt IS NULL]) AS neverVisited
       OPTIONAL MATCH (a)-[:MANAGES]->(:Farmer)-[:HAD_VISIT]->(vWeek:Visit)
         WHERE vWeek.date >= datetime() - duration({days: 7})
       WITH farmers, visitedLast30d, overdue, neverVisited, count(DISTINCT vWeek) AS visitsThisWeek
       OPTIONAL MATCH (:Agent {id: $agentId})-[:MANAGES]->(:Farmer)-[:HAD_VISIT]->(vMonth:Visit)
         WHERE vMonth.date >= datetime() - duration({days: 30})
       WITH farmers, visitedLast30d, overdue, neverVisited, visitsThisWeek, count(DISTINCT vMonth) AS visitsThisMonth
       OPTIONAL MATCH (:Agent {id: $agentId})-[:MANAGES]->(:Farmer)-[:HAD_VISIT]->(:Visit)-[:CAPTURED]->(o:Observation)
       WITH size(farmers) AS totalFarmers, visitedLast30d, overdue, neverVisited,
            visitsThisWeek, visitsThisMonth,
            o.kind AS kind, count(o) AS kindCount
       RETURN totalFarmers, visitedLast30d, overdue, neverVisited,
              visitsThisWeek, visitsThisMonth,
              collect(CASE WHEN kind IS NULL THEN NULL ELSE {kind: kind, count: kindCount} END) AS observationsByKind`,
      { agentId },
    );
    if (records.length === 0) {
      return {
        totalFarmers: 0,
        visitedLast30d: 0,
        overdue: 0,
        neverVisited: 0,
        visitsThisWeek: 0,
        visitsThisMonth: 0,
        observationsByKind: [],
      };
    }
    const r = records[0];
    const raw = (r.get('observationsByKind') ?? []) as Array<{ kind: string; count: unknown } | null>;
    return {
      totalFarmers: toNum(r.get('totalFarmers')),
      visitedLast30d: toNum(r.get('visitedLast30d')),
      overdue: toNum(r.get('overdue')),
      neverVisited: toNum(r.get('neverVisited')),
      visitsThisWeek: toNum(r.get('visitsThisWeek')),
      visitsThisMonth: toNum(r.get('visitsThisMonth')),
      observationsByKind: raw
        .filter((x): x is { kind: string; count: unknown } => x !== null)
        .map((x) => ({ kind: x.kind, count: toNum(x.count) })),
    };
  }

  async visitCadence(agentId: string, days: number): Promise<CadencePoint[]> {
    const records = await this.neo4j.read(
      `MATCH (:Agent {id: $agentId})-[:MANAGES]->(:Farmer)-[:HAD_VISIT]->(v:Visit)
       WHERE v.date >= datetime() - duration({days: $days})
       WITH date(v.date) AS day, count(v) AS visits
       RETURN toString(day) AS date, visits
       ORDER BY day ASC`,
      { agentId, days: Math.max(1, Math.min(365, days)) },
    );
    return records.map((r) => ({
      date: r.get('date') as string,
      visits: toNum(r.get('visits')),
    }));
  }

  async observationTrends(agentId: string, days: number): Promise<TrendPoint[]> {
    const records = await this.neo4j.read(
      `MATCH (:Agent {id: $agentId})-[:MANAGES]->(:Farmer)-[:HAD_VISIT]->(v:Visit)-[:CAPTURED]->(o:Observation)
       WHERE v.date >= datetime() - duration({days: $days})
       WITH date.truncate('week', date(v.date)) AS weekStart, o.kind AS kind, count(o) AS count
       RETURN toString(weekStart) AS weekStart, kind, count
       ORDER BY weekStart ASC, kind ASC`,
      { agentId, days: Math.max(7, Math.min(365, days)) },
    );
    return records.map((r) => ({
      weekStart: r.get('weekStart') as string,
      kind: r.get('kind') as string,
      count: toNum(r.get('count')),
    }));
  }

  async farmerHealth(agentId: string): Promise<FarmerHealthRow[]> {
    const records = await this.neo4j.read(
      `MATCH (:Agent {id: $agentId})-[:MANAGES]->(f:Farmer)
       OPTIONAL MATCH (f)-[:HAD_VISIT]->(:Visit)-[:CAPTURED]->(o:Observation)
       WITH f, count(o) AS observationCount,
            CASE WHEN f.lastVisitedAt IS NULL THEN NULL
                 ELSE duration.between(f.lastVisitedAt, datetime()).days END AS daysSinceVisit
       RETURN f.id AS id, f.name AS name, f.phone AS phone,
              toString(f.lastVisitedAt) AS lastVisitedAt,
              daysSinceVisit, observationCount
       ORDER BY coalesce(f.lastVisitedAt, datetime('1970-01-01T00:00:00Z')) ASC`,
      { agentId },
    );
    return records.map((r) => {
      const d = r.get('daysSinceVisit');
      const days = d === null || d === undefined ? null : toNum(d);
      let status: FarmerHealthRow['status'];
      if (days === null) status = 'never';
      else if (days <= 14) status = 'active';
      else if (days <= 30) status = 'stale';
      else status = 'overdue';
      return {
        id: r.get('id') as string,
        name: r.get('name') as string,
        phone: r.get('phone') as string,
        lastVisitedAt: (r.get('lastVisitedAt') as string) ?? null,
        daysSinceVisit: days,
        status,
        observationCount: toNum(r.get('observationCount')),
      };
    });
  }
}
