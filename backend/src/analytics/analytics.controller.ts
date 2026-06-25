import {
  Controller,
  DefaultValuePipe,
  Get,
  ParseIntPipe,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';
import {
  AnalyticsOverviewResponseDto,
  FarmerHealthRowDto,
  ObservationTrendPointDto,
  VisitCadencePointDto,
} from './dto/analytics.response.dto';
import {
  CurrentAgent,
  type AuthenticatedAgent,
} from '../common/decorators/current-agent.decorator';

@ApiTags('analytics')
@ApiBearerAuth()
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analytics: AnalyticsService) {}

  @Get('overview')
  @ApiOperation({ summary: 'Caseload totals, visit cadence, observation counts.' })
  @ApiOkResponse({ type: AnalyticsOverviewResponseDto })
  overview(@CurrentAgent() agent: AuthenticatedAgent) {
    return this.analytics.overview(agent.id);
  }

  @Get('visit-cadence')
  @ApiOperation({ summary: 'Daily visit counts over the window (default 90 days).' })
  @ApiQuery({ name: 'days', required: false, schema: { type: 'integer', default: 90, minimum: 1, maximum: 365 } })
  @ApiOkResponse({ type: VisitCadencePointDto, isArray: true })
  visitCadence(
    @CurrentAgent() agent: AuthenticatedAgent,
    @Query('days', new DefaultValuePipe(90), ParseIntPipe) days: number,
  ) {
    return this.analytics.visitCadence(agent.id, days);
  }

  @Get('observation-trends')
  @ApiOperation({ summary: 'Weekly observation counts grouped by kind.' })
  @ApiQuery({ name: 'days', required: false, schema: { type: 'integer', default: 90, minimum: 7, maximum: 365 } })
  @ApiOkResponse({ type: ObservationTrendPointDto, isArray: true })
  observationTrends(
    @CurrentAgent() agent: AuthenticatedAgent,
    @Query('days', new DefaultValuePipe(90), ParseIntPipe) days: number,
  ) {
    return this.analytics.observationTrends(agent.id, days);
  }

  @Get('farmer-health')
  @ApiOperation({
    summary:
      'Per-farmer status: active (≤14d), stale (15–30d), overdue (>30d), never.',
  })
  @ApiOkResponse({ type: FarmerHealthRowDto, isArray: true })
  farmerHealth(@CurrentAgent() agent: AuthenticatedAgent) {
    return this.analytics.farmerHealth(agent.id);
  }
}
