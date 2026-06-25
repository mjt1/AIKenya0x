import { Injectable, NotFoundException } from '@nestjs/common';
import { VisitsRepository } from '../repository/visits.repository';
import type { CreateVisitDto } from './dto/create-visit.dto';
import { AiClientService } from '../ai-client/ai-client.service';

@Injectable()
export class VisitsService {
  constructor(
    private readonly repo: VisitsRepository,
    private readonly ai: AiClientService,
  ) {}

  async create(
    agentId: string,
    farmerId: string,
    dto: CreateVisitDto,
    clientUpdatedAt?: string,
  ) {
    const provided = dto.observations ?? [];
    const structured =
      provided.length > 0 ? provided : await this.ai.structureNote(dto.notes);

    const outcome = await this.repo.createForAgent({
      agentId,
      farmerId,
      visitId: dto.visitId,
      date: dto.date,
      enterpriseIds: dto.enterpriseIds,
      notes: dto.notes,
      observations: structured,
      clientUpdatedAt,
    });
    if (outcome.status === 'notfound' || !outcome.id) {
      throw new NotFoundException(
        'Farmer or enterprise not found in your caseload',
      );
    }
    return this.findOne(agentId, outcome.id);
  }

  list(agentId: string, farmerId: string) {
    return this.repo.listForFarmer(agentId, farmerId);
  }

  async findOne(agentId: string, visitId: string) {
    const visit = await this.repo.findOneForAgent(agentId, visitId);
    if (!visit) throw new NotFoundException('Visit not found');
    return visit;
  }
}
