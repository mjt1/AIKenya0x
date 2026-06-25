import { Injectable } from '@nestjs/common';
import { Neo4jService } from '../../neo4j/neo4j.service';

const toNum = (v: unknown): number =>
  typeof v === 'number'
    ? v
    : v && typeof (v as { toNumber?: () => number }).toNumber === 'function'
      ? (v as { toNumber: () => number }).toNumber()
      : Number(v ?? 0);

@Injectable()
export class AdminAnalyticsService {
  constructor(private readonly neo4j: Neo4jService) {}

  async platformOverview() {
    const [r] = await this.neo4j.read(
      `OPTIONAL MATCH (a:Agent)
       WITH count(DISTINCT a) AS totalAgents
       OPTIONAL MATCH (f:Farmer)
       WITH totalAgents, count(DISTINCT f) AS totalFarmers
       OPTIONAL MATCH (v:Visit)
       WITH totalAgents, totalFarmers,
            count(DISTINCT v) AS totalVisits,
            count(DISTINCT CASE WHEN v.date >= datetime() - duration({days: 7})
                                THEN v END) AS visitsThisWeek,
            count(DISTINCT CASE WHEN v.date >= datetime() - duration({days: 30})
                                THEN v END) AS visitsThisMonth
       OPTIONAL MATCH (r:Recommendation)
       WITH totalAgents, totalFarmers,
            totalVisits, visitsThisWeek, visitsThisMonth,
            count(DISTINCT r) AS totalRecommendations,
            count(DISTINCT CASE WHEN r.status = 'accepted' THEN r END) AS recsAccepted,
            count(DISTINCT CASE WHEN r.status = 'applied'  THEN r END) AS recsApplied
       OPTIONAL MATCH (d:KnowledgeDocument)
       RETURN totalAgents, totalFarmers,
              totalVisits, visitsThisWeek, visitsThisMonth,
              totalRecommendations, recsAccepted, recsApplied,
              count(DISTINCT d) AS totalKbDocuments`,
    );
    const totalRecs = toNum(r.get('totalRecommendations'));
    const recsAccepted = toNum(r.get('recsAccepted'));
    const recsApplied = toNum(r.get('recsApplied'));
    return {
      totalAgents: toNum(r.get('totalAgents')),
      totalFarmers: toNum(r.get('totalFarmers')),
      totalVisits: toNum(r.get('totalVisits')),
      visitsThisWeek: toNum(r.get('visitsThisWeek')),
      visitsThisMonth: toNum(r.get('visitsThisMonth')),
      totalRecommendations: totalRecs,
      recsAccepted,
      recsApplied,
      adoptionRate: totalRecs === 0 ? 0 : (recsApplied + recsAccepted) / totalRecs,
      totalKbDocuments: toNum(r.get('totalKbDocuments')),
    };
  }

  async byAgent() {
    const records = await this.neo4j.read(
      `MATCH (a:Agent)
       OPTIONAL MATCH (a)-[:MANAGES]->(f:Farmer)
       OPTIONAL MATCH (a)-[:MANAGES]->(:Farmer)-[:HAD_VISIT]->(v:Visit)
       WITH a, count(DISTINCT f) AS farmers, count(DISTINCT v) AS visits,
            count(DISTINCT CASE WHEN v.date >= datetime() - duration({days: 30})
                                THEN v END) AS visitsLast30d
       RETURN a.id AS id, a.name AS name, a.email AS email,
              a.role AS role,
              farmers, visits, visitsLast30d
       ORDER BY farmers DESC, name ASC`,
    );
    return records.map((r) => ({
      id: r.get('id'),
      name: r.get('name'),
      email: r.get('email'),
      role: r.get('role'),
      caseloadSize: toNum(r.get('farmers')),
      totalVisits: toNum(r.get('visits')),
      visitsLast30d: toNum(r.get('visitsLast30d')),
    }));
  }

  async demandAggregate() {
    const records = await this.neo4j.read(
      `MATCH (:Issue)-[:RECOMMENDS]->(:Action)-[:NEEDS]->(i:Input)
       RETURN i.name AS name, i.type AS type, sum(coalesce(i.quantity, 1)) AS quantity
       ORDER BY quantity DESC LIMIT 50`,
    );
    return records.map((r) => ({
      name: r.get('name'),
      type: r.get('type'),
      quantity: toNum(r.get('quantity')),
    }));
  }
}
