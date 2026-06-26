import { Controller, Get } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { AdminAnalyticsService } from './admin-analytics.service';
import {
  AgentRollupRowDto,
  PlatformOverviewResponseDto,
} from './responses/admin-analytics.response.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/types/rbac.types';

/**
 * US-19 — Platform-wide analytics across agents (admin only). Per-agent
 * personal analytics still live under `/analytics`.
 */
@ApiTags('admin')
@ApiBearerAuth()
@Roles(Role.admin)
@Controller('admin/analytics')
export class AdminAnalyticsController {
  constructor(private readonly svc: AdminAnalyticsService) {}

  @Get('overview')
  @ApiOperation({
    summary: 'Platform totals: agents, farmers, visits, KB docs, adoption.',
  })
  @ApiOkResponse({ type: PlatformOverviewResponseDto })
  overview() {
    return this.svc.platformOverview();
  }

  @Get('agents')
  @ApiOperation({ summary: 'Per-agent caseload + visit volumes for ranking.' })
  @ApiOkResponse({ type: AgentRollupRowDto, isArray: true })
  byAgent() {
    return this.svc.byAgent();
  }
}
