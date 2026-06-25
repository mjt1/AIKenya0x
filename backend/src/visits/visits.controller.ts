import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { VisitsService } from './visits.service';
import { CreateVisitDto } from './dto/create-visit.dto';
import { VisitResponseDto } from './dto/responses/visit.response.dto';
import {
  CurrentAgent,
  type AuthenticatedAgent,
} from '../common/decorators/current-agent.decorator';

@ApiTags('visits')
@ApiBearerAuth()
@Controller()
export class VisitsController {
  constructor(private readonly visits: VisitsService) {}

  @Post('farmers/:id/visits')
  @ApiOperation({
    summary:
      'Capture a visit (idempotent if visitId is supplied for offline sync).',
  })
  @ApiCreatedResponse({ type: VisitResponseDto })
  @ApiNotFoundResponse({
    description: 'Farmer or enterprise not in your caseload',
  })
  create(
    @CurrentAgent() agent: AuthenticatedAgent,
    @Param('id') farmerId: string,
    @Body() dto: CreateVisitDto,
  ) {
    return this.visits.create(agent.id, farmerId, dto);
  }

  @Get('farmers/:id/visits')
  @ApiOperation({ summary: 'List visits for a farmer.' })
  @ApiOkResponse({ type: VisitResponseDto, isArray: true })
  list(
    @CurrentAgent() agent: AuthenticatedAgent,
    @Param('id') farmerId: string,
  ) {
    return this.visits.list(agent.id, farmerId);
  }

  @Get('visits/:id')
  @ApiOperation({ summary: 'Get a single visit by id.' })
  @ApiOkResponse({ type: VisitResponseDto })
  @ApiNotFoundResponse({ description: 'Visit not found' })
  findOne(@CurrentAgent() agent: AuthenticatedAgent, @Param('id') id: string) {
    return this.visits.findOne(agent.id, id);
  }
}
