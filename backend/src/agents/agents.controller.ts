import { Body, Controller, Get, Param, Patch } from '@nestjs/common';
import {
  ApiBearerAuth,
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
  AgentProfileDto,
  PublicAgentDto,
} from '../common/dto/public-agent.dto';

@ApiTags('agents')
@ApiBearerAuth()
@Controller('agents')
export class AgentsController {
  constructor(private readonly agents: AgentsService) {}

  @Get()
  @Roles(Role.admin)
  @ApiOperation({ summary: 'List all agents. Admin only.' })
  @ApiOkResponse({ type: PublicAgentDto, isArray: true })
  list() {
    return this.agents.listAll();
  }

  @Get(':id')
  @Roles(Role.admin)
  @ApiOperation({ summary: 'Get an agent profile + caseload size. Admin only.' })
  @ApiOkResponse({ type: AgentProfileDto })
  @ApiNotFoundResponse({ description: 'Agent not found' })
  findOne(@Param('id') id: string) {
    return this.agents.profile(id);
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
