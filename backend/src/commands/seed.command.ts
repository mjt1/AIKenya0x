import { Logger } from '@nestjs/common';
import { Command, CommandRunner, Option } from 'nest-commander';
import * as bcrypt from 'bcrypt';
import { v4 as uuid } from 'uuid';
import { AgentsService } from '../agents/agents.service';
import { Role } from '../common/types/rbac.types';
import { Neo4jService } from '../neo4j/neo4j.service';
import { FarmersRepository } from '../repository/farmers.repository';
import { VisitsRepository } from '../repository/visits.repository';
import { RecommendationsRepository } from '../repository/recommendations.repository';
import { AiClientService } from '../ai-client/ai-client.service';
import {
  EnterpriseType,
  type EnterpriseInput,
} from '../farmers/dto/create-farmer.dto';

export interface SeedCommandOptions {
  email?: string;
  password?: string;
  name?: string;
  county?: string;
  reset?: boolean;
}

type ObsKind = 'observation' | 'issue' | 'advice';

interface SeedFarmer {
  key: string; // stable id suffix -> deterministic, so re-seeding is idempotent
  name: string;
  phone: string;
  gps: string; // "lat,lng"
  enterprises: EnterpriseInput[];
  /** Backdate Farmer.createdAt (used to trigger first_visit candidates). */
  createdDaysAgo?: number;
  /** A single backdated visit. Omit for "never visited". */
  visit?: {
    daysAgo: number;
    notes: string;
    observations: { kind: ObsKind; text: string }[];
    issues?: {
      text: string; // must match an observation of kind 'issue' to link via FLAGS
      severity: string;
      contagious: boolean;
      enterprise: string;
    }[];
  };
}

// A clustered, deterministic caseload around Kakamega. Coordinates for
// Achieng/Nafula/Kiplagat sit within a few hundred metres so the contagious
// issues trigger risk-propagation alerts on the neighbour.
const SAMPLE_FARMERS: SeedFarmer[] = [
  {
    key: 'achieng',
    name: 'Achieng Ouma',
    phone: '+254700000001',
    gps: '0.2827,34.7519',
    enterprises: [
      {
        type: EnterpriseType.Dairy,
        animals: [{ breed: 'Friesian cross', lactationStage: 'mid' }],
      },
    ],
    visit: {
      daysAgo: 3,
      notes: 'Routine dairy check; suspected mastitis.',
      observations: [
        {
          kind: 'issue',
          text: 'Milk yield down 18% over 3 days; udder swollen on one quarter',
        },
        { kind: 'observation', text: 'Cow 3 off feed since yesterday' },
        {
          kind: 'advice',
          text: 'Advised CMT test and isolating the affected cow',
        },
      ],
      issues: [
        {
          text: 'Milk yield down 18% over 3 days; udder swollen on one quarter',
          severity: 'HIGH',
          contagious: true,
          enterprise: 'DAIRY',
        },
      ],
    },
  },
  {
    key: 'nafula',
    name: 'Nafula Simiyu',
    phone: '+254700000002',
    gps: '0.2841,34.7531',
    enterprises: [
      { type: EnterpriseType.Dairy, animals: [{ breed: 'Ayrshire' }] },
      {
        type: EnterpriseType.Sugarcane,
        fields: [{ areaHa: 1.5, variety: 'KEN 83-737', ratoonCycle: 1 }],
      },
    ],
    visit: {
      daysAgo: 5,
      notes: 'Sugarcane inspection; possible smut.',
      observations: [
        {
          kind: 'issue',
          text: 'Whip-like black growth emerging on cane stalks',
        },
        {
          kind: 'advice',
          text: 'Advised roguing infected stalks and seed-cane quarantine',
        },
      ],
      issues: [
        {
          text: 'Whip-like black growth emerging on cane stalks',
          severity: 'HIGH',
          contagious: true,
          enterprise: 'SUGARCANE',
        },
      ],
    },
  },
  {
    key: 'kiplagat',
    name: 'Kiplagat Rono',
    phone: '+254700000003',
    gps: '0.2853,34.7526',
    enterprises: [
      { type: EnterpriseType.Dairy, animals: [{ breed: 'Guernsey' }] },
    ],
    // Overdue (no contagious issue of its own) but near two contagious farms
    // -> expect overdue_visit + risk_alert.
    visit: {
      daysAgo: 50,
      notes: 'Herd in good condition at last check.',
      observations: [
        { kind: 'observation', text: 'Herd healthy; FMD booster due soon' },
      ],
    },
  },
  {
    key: 'wekesa',
    name: 'Wekesa Barasa',
    phone: '+254700000004',
    gps: '0.3210,34.8005',
    enterprises: [
      {
        type: EnterpriseType.Sugarcane,
        fields: [
          {
            areaHa: 2.0,
            variety: 'CO 421',
            ratoonCycle: 2,
            plantingDate: '2024-02-01',
          },
        ],
      },
    ],
    visit: {
      daysAgo: 40,
      notes: 'Ratoon cane mid-cycle.',
      observations: [
        {
          kind: 'observation',
          text: 'Ratoon cane ~4 months, slight yellowing',
        },
      ],
    },
  },
  {
    key: 'moraa',
    name: 'Moraa Nyaboke',
    phone: '+254700000005',
    gps: '0.2605,34.7008',
    enterprises: [
      {
        type: EnterpriseType.Sugarcane,
        fields: [{ areaHa: 1.0, variety: 'KEN 82-808' }],
      },
    ],
    // Advice given 20 days ago -> advice_followup window (14-30 days).
    visit: {
      daysAgo: 20,
      notes: 'Weeding + nutrition advice.',
      observations: [
        {
          kind: 'advice',
          text: 'Apply CAN top-dressing at 50 kg/acre within the week',
        },
      ],
    },
  },
  {
    key: 'barasa',
    name: 'Barasa Wanjala',
    phone: '+254700000006',
    gps: '0.3995,34.9002',
    enterprises: [
      { type: EnterpriseType.Dairy, animals: [{ breed: 'Friesian' }] },
    ],
    // Never visited + registered 21 days ago -> first_visit candidate.
    createdDaysAgo: 21,
  },
];

/**
 * Seeds a demo agent + a sample caseload (farmers, enterprises, backdated
 * visits/issues) and generates the recommendation queue. Idempotent via
 * deterministic farmer ids; re-run with --reset to wipe & reseed.
 *
 * Usage:
 *   yarn cli seed
 *   yarn cli seed --reset
 *   yarn cli seed -e [email protected] -p demo12345 -y Kakamega --reset
 */
@Command({
  name: 'seed',
  description: 'Seed a demo agent + sample farmers/visits and build the queue',
})
export class SeedCommand extends CommandRunner {
  private readonly logger = new Logger(SeedCommand.name);

  constructor(
    private readonly agents: AgentsService,
    private readonly neo4j: Neo4jService,
    private readonly farmers: FarmersRepository,
    private readonly visits: VisitsRepository,
    private readonly recs: RecommendationsRepository,
    private readonly ai: AiClientService,
  ) {
    super();
  }

  async run(
    _params: string[],
    options: SeedCommandOptions = {},
  ): Promise<void> {
    const email = (options.email ?? '[email protected]').trim().toLowerCase();
    const password = options.password ?? 'demo12345';
    const name = (options.name ?? 'Demo Agent').trim();
    const county = (options.county ?? 'Kakamega').trim();

    // 1. Demo agent (reuse if present).
    const existing = (await this.agents.findByEmail(email)) as {
      id: string;
    } | null;
    let agentId: string;
    if (existing) {
      agentId = existing.id;
      this.logger.log(`Reusing existing agent <${email}>`);
    } else {
      const passwordHash = await bcrypt.hash(password, 10);
      const created = await this.agents.create({
        id: uuid(),
        name,
        email,
        passwordHash,
        county,
        role: Role.agent,
      });
      agentId = created.id;
      this.logger.log(`Created demo agent <${email}>`);
    }

    // 2. Reset or skip-if-already-seeded.
    if (options.reset) {
      await this.wipe(agentId);
      this.logger.log('Wiped existing demo data for this agent.');
    } else {
      const count = await this.farmerCount(agentId);
      if (count > 0) {
        this.logger.warn(
          `Agent already has ${count} farmer(s). Re-run with --reset to wipe & reseed.`,
        );
        return;
      }
    }

    // 3. Farmers + enterprises + backdated visits.
    for (const f of SAMPLE_FARMERS) {
      const farmerId = `seed-${f.key}`;
      await this.farmers.createForAgent(
        agentId,
        {
          name: f.name,
          phone: f.phone,
          gps: f.gps,
          enterprises: f.enterprises,
        },
        { farmerId },
      );

      if (f.createdDaysAgo) {
        await this.neo4j.write(
          `MATCH (f:Farmer {id: $farmerId})
           SET f.createdAt = datetime() - duration({days: ${Math.trunc(f.createdDaysAgo)}})`,
          { farmerId },
        );
      }

      if (f.visit) {
        const enterpriseIds = await this.enterpriseIds(farmerId);
        await this.visits.createForAgent({
          agentId,
          farmerId,
          date: daysAgoIso(f.visit.daysAgo),
          enterpriseIds,
          observations: f.visit.observations,
          notes: f.visit.notes,
          issues: f.visit.issues,
        });
      }

      this.logger.log(`  + ${f.name}`);
    }

    // 4. Build the prioritisation queue (deterministic candidates -> AI
    //    bounded re-rank, which falls back deterministically if AI is down).
    const candidates = await this.recs.generateCandidates(agentId);
    const ranked = await this.ai.rankRecommendations(candidates);
    const { created, skipped } = await this.recs.upsert(agentId, ranked);
    this.logger.log(
      `Queue built: ${created} recommendation(s) created, ${skipped} skipped, from ${candidates.length} candidate(s).`,
    );

    this.logger.log('--------------------------------------------------');
    this.logger.log(`Seed complete. Log in with:`);
    this.logger.log(`  email:    ${email}`);
    this.logger.log(`  password: ${password}`);
    this.logger.log('--------------------------------------------------');
  }

  private async enterpriseIds(farmerId: string): Promise<string[]> {
    const records = await this.neo4j.read(
      `MATCH (:Farmer {id: $farmerId})-[:RUNS]->(e:Enterprise) RETURN e.id AS id`,
      { farmerId },
    );
    return records.map((r) => r.get('id') as string);
  }

  private async farmerCount(agentId: string): Promise<number> {
    const records = await this.neo4j.read(
      `MATCH (:Agent {id: $agentId})-[:MANAGES]->(f:Farmer) RETURN count(f) AS n`,
      { agentId },
    );
    return records.length === 0 ? 0 : Number(records[0].get('n'));
  }

  /** Delete the agent's farmer subgraph + recommendations (keeps the agent). */
  private async wipe(agentId: string): Promise<void> {
    await this.neo4j.write(
      `MATCH (a:Agent {id: $agentId})
       OPTIONAL MATCH (a)-[:HAS_RECOMMENDATION]->(r:Recommendation)
       DETACH DELETE r
       WITH a
       OPTIONAL MATCH (a)-[:MANAGES]->(f:Farmer)
       OPTIONAL MATCH (f)-[:RUNS]->(e:Enterprise)
       OPTIONAL MATCH (e)-[:HAS_ASSET]->(asset)
       OPTIONAL MATCH (f)-[:HAD_VISIT]->(v:Visit)
       OPTIONAL MATCH (v)-[:CAPTURED]->(o:Observation)
       OPTIONAL MATCH (o)-[:FLAGS]->(i:Issue)
       OPTIONAL MATCH (f)-[:HAS_SENSOR]->(s:Sensor)
       OPTIONAL MATCH (s)-[:RECORDED]->(rd:Reading)
       DETACH DELETE f, e, asset, v, o, i, s, rd`,
      { agentId },
    );
  }

  @Option({ flags: '-e, --email <email>', description: 'Demo agent email' })
  parseEmail(v: string) {
    return v;
  }

  @Option({
    flags: '-p, --password <password>',
    description: 'Demo agent password',
  })
  parsePassword(v: string) {
    return v;
  }

  @Option({
    flags: '-n, --name <name>',
    description: 'Demo agent display name',
  })
  parseName(v: string) {
    return v;
  }

  @Option({ flags: '-y, --county <county>', description: 'County' })
  parseCounty(v: string) {
    return v;
  }

  @Option({
    flags: '-r, --reset',
    description: 'Wipe this agent’s existing farmers/visits/recs first',
  })
  parseReset() {
    return true;
  }
}

/** Full ISO-8601 timestamp for a date `days` before now (UTC). */
function daysAgoIso(days: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - Math.trunc(days));
  return d.toISOString();
}
