import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { AgentsService } from '../../agents/agents.service';
import { AdminAgentsService } from './admin-agents.service';
import { CreateAgentDto } from '../dto/create-agent.dto';
import { AssignCooperativeDto } from '../dto/assign-cooperative.dto';
import { UpdateRoleDto } from '../../agents/dto/update-role.dto';
import {
  AgentProfileDto,
  PublicAgentDto,
} from '../../common/dto/public-agent.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/types/rbac.types';

/**
 * Admin-only agent + caseload management (US-17). Mirrors the supervisor
 * surface on `/agents` but with admin-wide reach and write operations.
 */
@ApiTags('admin')
@ApiBearerAuth()
@Roles(Role.admin)
@Controller('admin/agents')
export class AdminAgentsController {
  constructor(
    private readonly agents: AgentsService,
    private readonly adminAgents: AdminAgentsService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List every agent on the platform.' })
  @ApiOkResponse({ type: PublicAgentDto, isArray: true })
  list() {
    return this.agents.listAll();
  }

  @Post()
  @ApiOperation({ summary: 'Create an agent (admin, supervisor, or agent).' })
  @ApiCreatedResponse({ type: PublicAgentDto })
  @ApiConflictResponse({ description: 'Email already registered' })
  create(@Body() dto: CreateAgentDto) {
    return this.adminAgents.createAgent(dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get an agent profile + caseload size.' })
  @ApiOkResponse({ type: AgentProfileDto })
  @ApiNotFoundResponse({ description: 'Agent not found' })
  profile(@Param('id') id: string) {
    return this.agents.profile(id);
  }

  @Patch(':id/role')
  @ApiOperation({ summary: 'Change an agent role.' })
  @ApiOkResponse({ type: PublicAgentDto })
  @ApiNotFoundResponse({ description: 'Agent not found' })
  updateRole(@Param('id') id: string, @Body() dto: UpdateRoleDto) {
    return this.agents.updateRole(id, dto.role);
  }

  @Patch(':id/cooperative')
  @ApiOperation({ summary: 'Reassign an agent to a different cooperative.' })
  @ApiOkResponse({ type: PublicAgentDto })
  @ApiNotFoundResponse({ description: 'Agent not found' })
  assignCoop(@Param('id') id: string, @Body() dto: AssignCooperativeDto) {
    return this.agents.assignCooperative(id, dto.cooperative, dto.county);
  }
}
