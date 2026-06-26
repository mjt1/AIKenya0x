import { Injectable, Logger } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { FarmersRepository } from '../repository/farmers.repository';
import { VisitsRepository } from '../repository/visits.repository';
import { SyncRepository } from '../repository/sync.repository';
import { AiClientService } from '../ai-client/ai-client.service';
import {
  CreateFarmerDto,
  EnterpriseInput,
} from '../farmers/dto/create-farmer.dto';
import { UpdateFarmerDto } from '../farmers/dto/update-farmer.dto';
import { CreateVisitDto } from '../visits/dto/create-visit.dto';
import type {
  SyncOpKind,
  SyncOpResult,
  SyncPullResponse,
  SyncStatusResponse,
} from '../common/types/sync.types';
import type { SyncOperationDto, SyncPushDto } from './dto/sync.dto';

const CLOCK_SKEW_MS = 24 * 60 * 60 * 1000;

@Injectable()
export class SyncService {
  private readonly logger = new Logger(SyncService.name);

  constructor(
    private readonly farmersRepo: FarmersRepository,
    private readonly visitsRepo: VisitsRepository,
    private readonly syncRepo: SyncRepository,
    private readonly ai: AiClientService,
  ) {}

  async push(agentId: string, body: SyncPushDto): Promise<{ results: SyncOpResult[] }> {
    const results: SyncOpResult[] = [];
    for (const op of body.operations) {
      const result = await this.handle(agentId, op);
      results.push(result);
      try {
        await this.syncRepo.logOperation(agentId, result, op.clientUpdatedAt);
      } catch (err) {
        this.logger.warn(
          `Failed to log sync op ${op.clientId}: ${(err as Error).message}`,
        );
      }
    }
    return { results };
  }

  async pull(agentId: string, since?: string): Promise<SyncPullResponse> {
    const cursor = new Date().toISOString();
    const [farmers, enterprises, visits, observations] = await Promise.all([
      this.farmersRepo.deltaForAgent(agentId, since),
      this.farmersRepo.enterpriseDelta(agentId, since),
      this.visitsRepo.deltaForAgent(agentId, since),
      this.visitsRepo.observationDelta(agentId, since),
    ]);
    return { cursor, farmers, enterprises, visits, observations };
  }

  async status(agentId: string): Promise<SyncStatusResponse> {
    const { caseloadCount, lastWriteAt } = await this.syncRepo.status(agentId);
    return {
      serverTime: new Date().toISOString(),
      caseloadCount,
      lastWriteAt,
    };
  }

  private async handle(
    agentId: string,
    op: SyncOperationDto,
  ): Promise<SyncOpResult> {
    // Clock-skew guard.
    const clientTs = Date.parse(op.clientUpdatedAt);
    if (clientTs - Date.now() > CLOCK_SKEW_MS) {
      return this.reject(op, 'clientUpdatedAt too far in the future');
    }

    // Idempotency: replay prior result if we already saw this clientId.
    const prior = await this.syncRepo.findOperation(agentId, op.clientId);
    if (prior) {
      return { ...prior, status: 'duplicate' };
    }

    try {
      switch (op.kind) {
        case 'farmer.create':
          return await this.farmerCreate(agentId, op);
        case 'farmer.update':
          return await this.farmerUpdate(agentId, op);
        case 'enterprise.create':
          return await this.enterpriseCreate(agentId, op);
        case 'visit.create':
          return await this.visitCreate(agentId, op);
        default:
          return this.reject(op, `Unknown op kind: ${op.kind as string}`);
      }
    } catch (err) {
      this.logger.error(
        `Sync op ${op.clientId} (${op.kind}) failed: ${(err as Error).message}`,
      );
      return this.reject(op, (err as Error).message);
    }
  }

  // --- per-kind handlers ---------------------------------------------------

  private async farmerCreate(
    agentId: string,
    op: SyncOperationDto,
  ): Promise<SyncOpResult> {
    const dto = await this.validatePayload(CreateFarmerDto, op.payload);
    if (!dto) return this.reject(op, 'Invalid farmer.create payload');
    const desiredId = (op.payload as { id?: string }).id;
    const { id, created } = await this.farmersRepo.createForAgent(
      agentId,
      dto,
      { farmerId: desiredId, clientUpdatedAt: op.clientUpdatedAt },
    );
    return this.ok(op, created ? 'applied' : 'duplicate', id);
  }

  private async farmerUpdate(
    agentId: string,
    op: SyncOperationDto,
  ): Promise<SyncOpResult> {
    if (!op.farmerId) return this.reject(op, 'farmerId is required for farmer.update');
    const dto = await this.validatePayload(UpdateFarmerDto, op.payload);
    if (!dto) return this.reject(op, 'Invalid farmer.update payload');
    const outcome = await this.farmersRepo.updateForAgent(
      agentId,
      op.farmerId,
      dto,
      op.clientUpdatedAt,
    );
    if (outcome.status === 'notfound') return this.reject(op, 'Farmer not found');
    if (outcome.status === 'conflict') {
      return {
        clientId: op.clientId,
        kind: op.kind,
        status: 'conflict',
        serverId: op.farmerId,
        reason: 'Server version is newer; pull and retry',
      };
    }
    return this.ok(op, 'applied', op.farmerId, outcome.serverUpdatedAt);
  }

  private async enterpriseCreate(
    agentId: string,
    op: SyncOperationDto,
  ): Promise<SyncOpResult> {
    if (!op.farmerId)
      return this.reject(op, 'farmerId is required for enterprise.create');
    const dto = await this.validatePayload(EnterpriseInput, op.payload);
    if (!dto) return this.reject(op, 'Invalid enterprise.create payload');
    const desiredId = (op.payload as { id?: string }).id;
    try {
      const { id, created } = await this.farmersRepo.addEnterpriseForAgent(
        agentId,
        op.farmerId,
        dto,
        { enterpriseId: desiredId, clientUpdatedAt: op.clientUpdatedAt },
      );
      return this.ok(op, created ? 'applied' : 'duplicate', id);
    } catch (err) {
      if ((err as Error).message === 'FARMER_NOT_FOUND') {
        return this.reject(op, 'Farmer not found');
      }
      throw err;
    }
  }

  private async visitCreate(
    agentId: string,
    op: SyncOperationDto,
  ): Promise<SyncOpResult> {
    if (!op.farmerId)
      return this.reject(op, 'farmerId is required for visit.create');
    const dto = await this.validatePayload(CreateVisitDto, op.payload);
    if (!dto) return this.reject(op, 'Invalid visit.create payload');

    const provided = dto.observations ?? [];
    const structured =
      provided.length > 0
        ? null
        : await this.ai.structureNote({
            rawNote: dto.notes,
            farmerId: op.farmerId,
          });
    const observations = structured ? structured.observations : provided;
    const issues = structured ? structured.issues : [];

    const outcome = await this.visitsRepo.createForAgent({
      agentId,
      farmerId: op.farmerId,
      visitId: dto.visitId,
      date: dto.date,
      enterpriseIds: dto.enterpriseIds,
      notes: dto.notes,
      observations,
      issues,
      clientUpdatedAt: op.clientUpdatedAt,
    });
    if (outcome.status === 'notfound')
      return this.reject(op, 'Farmer or enterprise not in caseload');
    return this.ok(
      op,
      outcome.status === 'applied' ? 'applied' : 'duplicate',
      outcome.id!,
      outcome.serverUpdatedAt ?? undefined,
    );
  }

  // --- helpers -------------------------------------------------------------

  private ok(
    op: SyncOperationDto,
    status: 'applied' | 'duplicate',
    serverId: string,
    serverUpdatedAt?: string | null,
  ): SyncOpResult {
    return {
      clientId: op.clientId,
      kind: op.kind as SyncOpKind,
      status,
      serverId,
      serverUpdatedAt: serverUpdatedAt ?? undefined,
    };
  }

  private reject(op: SyncOperationDto, reason: string): SyncOpResult {
    return {
      clientId: op.clientId,
      kind: op.kind as SyncOpKind,
      status: 'rejected',
      reason,
    };
  }

  private async validatePayload<T extends object>(
    Cls: new () => T,
    payload: unknown,
  ): Promise<T | null> {
    const instance = plainToInstance(Cls, payload ?? {});
    const errors = await validate(instance as object, {
      whitelist: true,
      forbidNonWhitelisted: false,
    });
    return errors.length === 0 ? instance : null;
  }
}
