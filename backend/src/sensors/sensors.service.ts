import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { v4 as uuid } from 'uuid';
import {
  SensorsRepository,
  type ReadingInput,
} from '../repository/sensors.repository';
import type { CreateSensorDto } from './dto/create-sensor.dto';
import type { IngestReadingsDto } from './dto/ingest-readings.dto';
import type { AuthenticatedSensor } from '../common/decorators/current-sensor.decorator';
import { defaultUnitFor } from './sensor-metrics';
import { generateSensorToken } from './sensor-token.util';

/** Hard cap on metrics per webhook call — guards against abuse / fat payloads. */
const MAX_READINGS_PER_CALL = 50;

@Injectable()
export class SensorsService {
  constructor(private readonly repo: SensorsRepository) {}

  async create(agentId: string, farmerId: string, dto: CreateSensorDto) {
    const { token, tokenHash, tokenPrefix } = generateSensorToken();
    const metric = dto.metric.trim();
    const unit = dto.unit?.trim() || defaultUnitFor(metric);
    const sensor = await this.repo.createForFarmer(agentId, farmerId, {
      id: uuid(),
      name: dto.name.trim(),
      metric,
      unit: unit ?? null,
      tokenHash,
      tokenPrefix,
    });
    if (!sensor) {
      throw new NotFoundException('Farmer not in your caseload');
    }
    // Plaintext token is returned ONCE here and never persisted.
    return { sensor, token, ingestPath: '/sensors/ingest' };
  }

  list(agentId: string, farmerId: string) {
    return this.repo.listForFarmer(agentId, farmerId);
  }

  async regenerateToken(agentId: string, sensorId: string) {
    const { token, tokenHash, tokenPrefix } = generateSensorToken();
    const sensor = await this.repo.setTokenHash(
      agentId,
      sensorId,
      tokenHash,
      tokenPrefix,
    );
    if (!sensor) throw new NotFoundException('Sensor not found');
    return { token, tokenPrefix };
  }

  async remove(agentId: string, sensorId: string) {
    const deletedReadings = await this.repo.removeForAgent(agentId, sensorId);
    if (deletedReadings === null) throw new NotFoundException('Sensor not found');
    return { id: sensorId, deletedReadings };
  }

  /** Webhook ingest — sensor already resolved + authed by SensorTokenGuard. */
  async ingest(sensor: AuthenticatedSensor, dto: IngestReadingsDto) {
    const entries = Object.entries(dto.readings ?? {}).filter(
      ([k]) => k.trim().length > 0,
    );
    if (entries.length === 0) {
      throw new BadRequestException('No readings provided');
    }
    if (entries.length > MAX_READINGS_PER_CALL) {
      throw new BadRequestException(
        `Too many metrics in one call (max ${MAX_READINGS_PER_CALL})`,
      );
    }
    const ts = this.resolveTs(dto.ts);

    const readings: ReadingInput[] = entries.map(([metric, raw]) => {
      const m = metric.trim();
      const { value, valueType } = coerceValue(raw);
      const unit = m === sensor.metric ? sensor.unit : defaultUnitFor(m);
      return { id: uuid(), metric: m, value, valueType, unit: unit ?? null, ts };
    });

    const accepted = await this.repo.appendReadings(sensor.id, readings, ts);
    return { accepted };
  }

  async listReadings(
    agentId: string,
    sensorId: string,
    metric: string | undefined,
    limit: number,
  ) {
    const safeLimit = Math.max(1, Math.min(500, Math.floor(limit) || 50));
    const rows = await this.repo.listReadings(
      agentId,
      sensorId,
      metric?.trim() || null,
      safeLimit,
    );
    if (rows === null) throw new NotFoundException('Sensor not found');
    return rows;
  }

  private resolveTs(ts?: string): string {
    if (!ts) return new Date().toISOString();
    const parsed = new Date(ts);
    if (Number.isNaN(parsed.getTime())) {
      throw new BadRequestException('Invalid ts (expected ISO datetime)');
    }
    return parsed.toISOString();
  }
}

/** Coerce a raw reading value into a number when possible, else a string. */
function coerceValue(raw: unknown): {
  value: number | string;
  valueType: 'number' | 'string';
} {
  if (typeof raw === 'number' && Number.isFinite(raw)) {
    return { value: raw, valueType: 'number' };
  }
  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (trimmed !== '' && !Number.isNaN(Number(trimmed))) {
      return { value: Number(trimmed), valueType: 'number' };
    }
    return { value: trimmed, valueType: 'string' };
  }
  if (typeof raw === 'boolean') {
    return { value: raw ? 'true' : 'false', valueType: 'string' };
  }
  return { value: String(raw), valueType: 'string' };
}
