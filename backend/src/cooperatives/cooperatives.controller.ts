import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Post,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CooperativesService } from './cooperatives.service';
import { CreateCooperativeDto } from './dto/create-cooperative.dto';
import {
  CooperativeAgentsResponseDto,
  CooperativeDto,
  CooperativeListItemDto,
} from './dto/responses/cooperative.response.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/types/rbac.types';
import {
  CurrentAgent,
  type AuthenticatedAgent,
} from '../common/decorators/current-agent.decorator';

@ApiTags('cooperatives')
@ApiBearerAuth()
@Controller('cooperatives')
export class CooperativesController {
  constructor(private readonly svc: CooperativesService) {}

  @Get()
  @ApiOperation({ summary: 'List all cooperatives (any authenticated user).' })
  @ApiOkResponse({ type: CooperativeListItemDto, isArray: true })
  list() {
    return this.svc.list();
  }

  @Post()
  @Roles(Role.admin)
  @ApiOperation({ summary: 'Create a cooperative. Admin only.' })
  @ApiCreatedResponse({ type: CooperativeDto })
  create(@Body() dto: CreateCooperativeDto) {
    return this.svc.create(dto.name, dto.county);
  }

  @Get(':id/agents')
  @Roles(Role.admin, Role.supervisor)
  @ApiOperation({
    summary:
      'List agents in a cooperative. Admin: any. Supervisor: own cooperative only.',
  })
  @ApiOkResponse({ type: CooperativeAgentsResponseDto })
  @ApiNotFoundResponse({ description: 'Cooperative not found' })
  @ApiForbiddenResponse({
    description: 'Supervisor cannot view another cooperative.',
  })
  agents(
    @Param('id') id: string,
    @CurrentAgent() agent: AuthenticatedAgent,
  ) {
    if (agent.role === Role.supervisor && agent.cooperativeId !== id) {
      throw new ForbiddenException(
        'Supervisors may only view their own cooperative',
      );
    }
    return this.svc.agentsInCooperative(id);
  }
}
