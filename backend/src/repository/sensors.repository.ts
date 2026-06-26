import { Injectable } from '@nestjs/common';
import { Neo4jService } from '../neo4j/neo4j.service';
import { serializeNeo4j } from '../neo4j/serialize';

export interface SensorRow {
  id: string;
  farmerId: string;
  name: string;
  metric: string;
  unit: string | null;
  status: string;
  tokenPrefix: string;
  lastReadingAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

/** Minimal sensor identity resolved from a webhook token (no agent scope). */
export interface SensorIdentity {
  id: string;
  farmerId: string;
  name: string;
  metric: string;
  unit: string | null;
}

export interface CreateSensorRow {
  id: string;
  name: string;
  metric: string;
  unit: string | null;
  tokenHash: string;
  tokenPrefix: string;
}

export interface ReadingInput {
  id: string;
  metric: string;
  value: number | string;
  valueType: 'number' | 'string';
  unit: string | null;
  ts: string;
}

/** Projection returned to the agent — never includes tokenHash. */
const SENSOR_PROJECTION =
  's { .id, .name, .metric, .unit, .status, .tokenPrefix, .lastReadingAt, .createdAt, .updatedAt, farmerId: f.id }';

@Injectable()
export class SensorsRepository {
  constructor(private readonly neo4j: Neo4jService) {}

  /** Register a sensor on a farmer the agent manages. Null if not in caseload. */
  async createForFarmer(
    agentId: string,
    farmerId: string,
    s: CreateSensorRow,
  ): Promise<SensorRow | null> {
    const records = await this.neo4j.write(
      `MATCH (a:Agent {id: $agentId})-[:MANAGES]->(f:Farmer {id: $farmerId})
       CREATE (s:Sensor {
         id: $id, name: $name, metric: $metric, unit: $unit,
         status: 'active', tokenHash: $tokenHash, tokenPrefix: $tokenPrefix,
         createdAt: datetime(), updatedAt: datetime(), lastReadingAt: null
       })
       MERGE (f)-[:HAS_SENSOR]->(s)
       RETURN ${SENSOR_PROJECTION} AS sensor`,
      {
        agentId,
        farmerId,
        id: s.id,
        name: s.name,
        metric: s.metric,
        unit: s.unit,
        tokenHash: s.tokenHash,
        tokenPrefix: s.tokenPrefix,
      },
    );
    return records.length === 0
      ? null
      : serializeNeo4j<SensorRow>(records[0].get('sensor'));
  }

  async listForFarmer(agentId: string, farmerId: string): Promise<SensorRow[]> {
    const records = await this.neo4j.read(
      `MATCH (a:Agent {id: $agentId})-[:MANAGES]->(f:Farmer {id: $farmerId})-[:HAS_SENSOR]->(s:Sensor)
       RETURN ${SENSOR_PROJECTION} AS sensor
       ORDER BY s.createdAt DESC`,
      { agentId, farmerId },
    );
    return records.map((r) => serializeNeo4j<SensorRow>(r.get('sensor')));
  }

  /** Replace a sensor's token (regenerate). Null if not owned by the agent. */
  async setTokenHash(
    agentId: string,
    sensorId: string,
    tokenHash: string,
    tokenPrefix: string,
  ): Promise<SensorRow | null> {
    const records = await this.neo4j.write(
      `MATCH (a:Agent {id: $agentId})-[:MANAGES]->(f:Farmer)-[:HAS_SENSOR]->(s:Sensor {id: $sensorId})
       SET s.tokenHash = $tokenHash, s.tokenPrefix = $tokenPrefix,
           s.status = 'active', s.updatedAt = datetime()
       RETURN ${SENSOR_PROJECTION} AS sensor`,
      { agentId, sensorId, tokenHash, tokenPrefix },
    );
    return records.length === 0
      ? null
      : serializeNeo4j<SensorRow>(records[0].get('sensor'));
  }

  /** Delete a sensor + its readings. Null if not owned; else count removed. */
  async removeForAgent(
    agentId: string,
    sensorId: string,
  ): Promise<number | null> {
    const records = await this.neo4j.write(
      `MATCH (a:Agent {id: $agentId})-[:MANAGES]->(f:Farmer)-[:HAS_SENSOR]->(s:Sensor {id: $sensorId})
       OPTIONAL MATCH (s)-[:RECORDED]->(rd:Reading)
       WITH s, collect(rd) AS readings, count(rd) AS n
       FOREACH (r IN readings | DETACH DELETE r)
       DETACH DELETE s
       RETURN n AS deletedReadings`,
      { agentId, sensorId },
    );
    return records.length === 0 ? null : Number(records[0].get('deletedReadings'));
  }

  /** Resolve an ACTIVE sensor from its token hash (webhook path, no agent). */
  async findActiveByTokenHash(
    tokenHash: string,
  ): Promise<SensorIdentity | null> {
    const records = await this.neo4j.read(
      `MATCH (f:Farmer)-[:HAS_SENSOR]->(s:Sensor {tokenHash: $tokenHash})
       WHERE s.status = 'active'
       RETURN s { .id, .name, .metric, .unit, farmerId: f.id } AS sensor
       LIMIT 1`,
      { tokenHash },
    );
    return records.length === 0
      ? null
      : serializeNeo4j<SensorIdentity>(records[0].get('sensor'));
  }

  /** Append readings to a sensor and bump lastReadingAt. */
  async appendReadings(
    sensorId: string,
    readings: ReadingInput[],
    ts: string,
  ): Promise<number> {
    if (readings.length === 0) return 0;
    const records = await this.neo4j.write(
      `MATCH (s:Sensor {id: $sensorId})
       SET s.lastReadingAt = datetime($ts), s.updatedAt = datetime()
       WITH s
       UNWIND $readings AS rd
       CREATE (r:Reading {
         id: rd.id, metric: rd.metric, value: rd.value, valueType: rd.valueType,
         unit: rd.unit, ts: datetime($ts), source: 'webhook'
       })
       MERGE (s)-[:RECORDED]->(r)
       RETURN count(r) AS created`,
      { sensorId, readings, ts },
    );
    return records.length === 0 ? 0 : Number(records[0].get('created'));
  }

  /** Readings for a sensor the agent owns. */
  async listReadings(
    agentId: string,
    sensorId: string,
    metric: string | null,
    limit: number,
  ): Promise<unknown[] | null> {
    const owns = await this.neo4j.read(
      `MATCH (a:Agent {id: $agentId})-[:MANAGES]->(f:Farmer)-[:HAS_SENSOR]->(s:Sensor {id: $sensorId})
       RETURN s.id AS id`,
      { agentId, sensorId },
    );
    if (owns.length === 0) return null;
    const records = await this.neo4j.read(
      `MATCH (:Sensor {id: $sensorId})-[:RECORDED]->(r:Reading)
       WHERE $metric IS NULL OR r.metric = $metric
       RETURN r { .id, .metric, .value, .valueType, .unit, .ts, .source } AS reading
       ORDER BY r.ts DESC
       LIMIT toInteger($limit)`,
      { sensorId, metric, limit },
    );
    return records.map((r) => serializeNeo4j(r.get('reading')));
  }
}
