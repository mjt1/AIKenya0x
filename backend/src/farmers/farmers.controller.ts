import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { FarmersService } from './farmers.service';
import { CreateFarmerDto, EnterpriseInput } from './dto/create-farmer.dto';
import { UpdateFarmerDto } from './dto/update-farmer.dto';
import { ReassignFarmerDto } from './dto/reassign-farmer.dto';
import {
  EnterpriseCreatedResponseDto,
  FarmerListItemDto,
  FarmerResponseDto,
  ReassignFarmerResponseDto,
} from './dto/responses/farmer.response.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/types/rbac.types';
import {
  CurrentAgent,
  type AuthenticatedAgent,
} from '../common/decorators/current-agent.decorator';

@ApiTags('farmers')
@ApiBearerAuth()
@Controller('farmers')
export class FarmersController {
  constructor(private readonly farmers: FarmersService) {}

  @Post()
  @ApiOperation({ summary: 'Register a farmer + enterprises in the agent caseload.' })
  @ApiCreatedResponse({ type: FarmerResponseDto })
  create(
    @CurrentAgent() agent: AuthenticatedAgent,
    @Body() dto: CreateFarmerDto,
  ) {
    return this.farmers.create(agent.id, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List the agent caseload (oldest visited first).' })
  @ApiOkResponse({ type: FarmerListItemDto, isArray: true })
  list(@CurrentAgent() agent: AuthenticatedAgent) {
    return this.farmers.list(agent.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a farmer with enterprises + assets.' })
  @ApiOkResponse({ type: FarmerResponseDto })
  @ApiNotFoundResponse({ description: 'Farmer not in your caseload' })
  findOne(
    @CurrentAgent() agent: AuthenticatedAgent,
    @Param('id') id: string,
  ) {
    return this.farmers.findOne(agent.id, id);
  }

  @Patch(':id')
  @ApiOperation({
    summary:
      'Update farmer profile fields. Conflicts (409) if a newer server version exists.',
  })
  @ApiOkResponse({ type: FarmerResponseDto })
  @ApiNotFoundResponse({ description: 'Farmer not in your caseload' })
  @ApiConflictResponse({ description: 'Newer server version exists' })
  update(
    @CurrentAgent() agent: AuthenticatedAgent,
    @Param('id') id: string,
    @Body() dto: UpdateFarmerDto,
  ) {
    return this.farmers.update(agent.id, id, dto);
  }

  @Post(':id/enterprises')
  @ApiOperation({ summary: 'Add an enterprise to an existing farmer.' })
  @ApiCreatedResponse({ type: EnterpriseCreatedResponseDto })
  @ApiNotFoundResponse({ description: 'Farmer not in your caseload' })
  addEnterprise(
    @CurrentAgent() agent: AuthenticatedAgent,
    @Param('id') id: string,
    @Body() dto: EnterpriseInput,
  ) {
    return this.farmers.addEnterprise(agent.id, id, dto);
  }

  @Post(':id/reassign')
  @Roles(Role.admin, Role.supervisor)
  @ApiOperation({
    summary:
      'Reassign a farmer to a different agent. Admin: any. Supervisor: same cooperative only.',
  })
  @ApiOkResponse({ type: ReassignFarmerResponseDto })
  @ApiNotFoundResponse({ description: 'Farmer or target agent not found' })
  @ApiForbiddenResponse({
    description: 'Supervisor scope violation (cross-cooperative reassignment).',
  })
  async reassign(
    @CurrentAgent() me: AuthenticatedAgent,
    @Param('id') farmerId: string,
    @Body() dto: ReassignFarmerDto,
  ) {
    const scope =
      me.role === Role.supervisor
        ? { cooperativeId: me.cooperativeId }
        : { cooperativeId: null };
    if (me.role === Role.supervisor && !scope.cooperativeId) {
      throw new ForbiddenException(
        'Supervisor account is not assigned to a cooperative',
      );
    }
    return this.farmers.reassign(farmerId, dto.toAgentId, me.role, scope);
  }
}
