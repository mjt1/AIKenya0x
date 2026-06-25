import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { SyncService } from './sync.service';
import { SyncPullQueryDto, SyncPushDto } from './dto/sync.dto';
import {
  SyncPullResponseDto,
  SyncPushResponseDto,
  SyncStatusResponseDto,
} from './dto/responses/sync.response.dto';
import {
  CurrentAgent,
  type AuthenticatedAgent,
} from '../common/decorators/current-agent.decorator';

@ApiTags('sync')
@ApiBearerAuth()
@Controller('sync')
export class SyncController {
  constructor(private readonly sync: SyncService) {}

  @Post('push')
  @ApiOperation({
    summary:
      'Push a batch of queued offline operations. Returns a per-op result with status: applied | duplicate | conflict | rejected.',
  })
  @ApiOkResponse({ type: SyncPushResponseDto })
  push(
    @CurrentAgent() agent: AuthenticatedAgent,
    @Body() body: SyncPushDto,
  ) {
    return this.sync.push(agent.id, body);
  }

  @Get('pull')
  @ApiOperation({
    summary:
      'Pull every farmer/enterprise/visit/observation in the caseload modified since the given cursor.',
  })
  @ApiOkResponse({ type: SyncPullResponseDto })
  pull(
    @CurrentAgent() agent: AuthenticatedAgent,
    @Query() query: SyncPullQueryDto,
  ) {
    return this.sync.pull(agent.id, query.since);
  }

  @Get('status')
  @ApiOperation({
    summary:
      'Lightweight server-time + caseload counters used to bootstrap the mobile client.',
  })
  @ApiOkResponse({ type: SyncStatusResponseDto })
  status(@CurrentAgent() agent: AuthenticatedAgent) {
    return this.sync.status(agent.id);
  }
}
