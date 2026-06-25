import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  NotFoundException,
  Param,
  Patch,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { AgentsService } from './agents.service';
import { UpdateRoleDto } from './dto/update-role.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/types/rbac.types';
import {
  CurrentAgent,
  type AuthenticatedAgent,
} from '../common/decorators/current-agent.decorator';
import {
  AgentProfileDto,
  PublicAgentDto,
} from '../common/dto/public-agent.dto';

@ApiTags('agents')
@ApiBearerAuth()
@Controller('agents')
export class AgentsController {
  constructor(private readonly agents: AgentsService) {}

  @Get()
  @Roles(Role.admin, Role.supervisor)
  @ApiOperation({
    summary: 'List agents. Admin: all. Supervisor: scoped to own cooperative.',
  })
  @ApiOkResponse({ type: PublicAgentDto, isArray: true })
  @ApiForbiddenResponse({ description: 'Supervisor without cooperative scope.' })
  async list(@CurrentAgent() me: AuthenticatedAgent) {
    if (me.role === Role.admin) return this.agents.listAll();
    if (!me.cooperativeId) {
      throw new ForbiddenException(
        'Supervisor account is not assigned to a cooperative',
      );
    }
    return this.agents.listByCooperative(me.cooperativeId);
  }

  @Get(':id')
  @Roles(Role.admin, Role.supervisor)
  @ApiOperation({ summary: 'Get an agent profile + caseload size.' })
  @ApiOkResponse({ type: AgentProfileDto })
  @ApiNotFoundResponse({ description: 'Agent not found' })
  @ApiForbiddenResponse({ description: 'Agent is outside your cooperative.' })
  async findOne(
    @CurrentAgent() me: AuthenticatedAgent,
    @Param('id') id: string,
  ) {
    const profile = await this.agents.profile(id);
    if (
      me.role === Role.supervisor &&
      profile.agent.cooperativeId !== me.cooperativeId
    ) {
      throw new ForbiddenException('Agent is in another cooperative');
    }
    if (!profile) throw new NotFoundException('Agent not found');
    return profile;
  }

  @Patch(':id/role')
  @Roles(Role.admin)
  @ApiOperation({ summary: 'Change an agent role. Admin only.' })
  @ApiOkResponse({ type: PublicAgentDto })
  @ApiNotFoundResponse({ description: 'Agent not found' })
  updateRole(@Param('id') id: string, @Body() dto: UpdateRoleDto) {
    return this.agents.updateRole(id, dto.role);
  }
}
