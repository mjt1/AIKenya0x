import { Injectable, NotFoundException, ConflictException, ForbiddenException } from '@nestjs/common';
import { FarmersRepository } from '../repository/farmers.repository';
import type { CreateFarmerDto, EnterpriseInput } from './dto/create-farmer.dto';
import type { UpdateFarmerDto } from './dto/update-farmer.dto';
import { Role } from '../common/types/rbac.types';

@Injectable()
export class FarmersService {
  constructor(private readonly repo: FarmersRepository) {}

  async create(
    agentId: string,
    dto: CreateFarmerDto,
    opts: { farmerId?: string; clientUpdatedAt?: string } = {},
  ) {
    const { id } = await this.repo.createForAgent(agentId, dto, opts);
    return this.findOne(agentId, id);
  }

  list(agentId: string) {
    return this.repo.listForAgent(agentId);
  }

  async findOne(agentId: string, farmerId: string) {
    const farmer = await this.repo.findOneForAgent(agentId, farmerId);
    if (!farmer) throw new NotFoundException('Farmer not found');
    return farmer;
  }

  async update(
    agentId: string,
    farmerId: string,
    patch: UpdateFarmerDto,
    clientUpdatedAt?: string,
  ) {
    const outcome = await this.repo.updateForAgent(
      agentId,
      farmerId,
      patch,
      clientUpdatedAt,
    );
    if (outcome.status === 'notfound') {
      throw new NotFoundException('Farmer not found');
    }
    if (outcome.status === 'conflict') {
      throw new ConflictException(
        'Server has a newer version of this farmer; pull before retrying.',
      );
    }
    return this.findOne(agentId, farmerId);
  }

  async addEnterprise(
    agentId: string,
    farmerId: string,
    input: EnterpriseInput,
    opts: { enterpriseId?: string; clientUpdatedAt?: string } = {},
  ) {
    try {
      const { id } = await this.repo.addEnterpriseForAgent(
        agentId,
        farmerId,
        input,
        opts,
      );
      return { id };
    } catch (err) {
      if ((err as Error).message === 'FARMER_NOT_FOUND') {
        throw new NotFoundException('Farmer not found');
      }
      throw err;
    }
  }

  async reassign(
    farmerId: string,
    toAgentId: string,
    callerRole: Role,
    scope: { cooperativeId: string | null },
  ) {
    const preview = await this.repo.reassignPreview(farmerId, toAgentId);
    if (!preview.farmerExists) {
      throw new NotFoundException('Farmer not found');
    }
    if (!preview.targetAgentExists) {
      throw new NotFoundException('Target agent not found');
    }
    if (
      callerRole === Role.supervisor &&
      (preview.fromCooperativeId !== scope.cooperativeId ||
        preview.toCooperativeId !== scope.cooperativeId)
    ) {
      throw new ForbiddenException(
        'Supervisors may only reassign farmers within their cooperative',
      );
    }
    const result = await this.repo.reassign(farmerId, toAgentId);
    return { status: 'ok' as const, ...preview, ...result };
  }
}
