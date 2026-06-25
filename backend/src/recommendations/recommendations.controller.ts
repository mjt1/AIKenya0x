import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { RecommendationsService } from './recommendations.service';
import { UpdateRecommendationStatusDto } from './dto/update-recommendation-status.dto';
import {
  GenerateRecommendationsResponseDto,
  RecommendationDto,
} from './dto/responses/recommendation.response.dto';
import {
  CurrentAgent,
  type AuthenticatedAgent,
} from '../common/decorators/current-agent.decorator';
import {
  RECOMMENDATION_STATUSES,
  type RecommendationStatus,
} from '../common/types/recommendations.types';

@ApiTags('recommendations')
@ApiBearerAuth()
@Controller('recommendations')
export class RecommendationsController {
  constructor(private readonly recommendations: RecommendationsService) {}

  @Get()
  @ApiOperation({
    summary: 'List recommendations for the agent. Defaults to pending.',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: [...RECOMMENDATION_STATUSES, 'all'],
  })
  @ApiOkResponse({ type: RecommendationDto, isArray: true })
  @ApiBadRequestResponse({ description: 'Unknown status filter.' })
  list(
    @CurrentAgent() agent: AuthenticatedAgent,
    @Query('status') status?: string,
  ) {
    if (
      status &&
      status !== 'all' &&
      !RECOMMENDATION_STATUSES.includes(status as RecommendationStatus)
    ) {
      throw new BadRequestException(
        `status must be one of: ${[...RECOMMENDATION_STATUSES, 'all'].join(', ')}`,
      );
    }
    const resolved: RecommendationStatus | undefined =
      !status || status === 'all'
        ? status === 'all'
          ? undefined
          : 'pending'
        : (status as RecommendationStatus);
    return this.recommendations.list(agent.id, resolved);
  }

  @Post('generate')
  @ApiOperation({
    summary:
      'Regenerate the recommendation queue. Runs rule-based candidates, AI-ranks them, persists new ones.',
  })
  @ApiOkResponse({ type: GenerateRecommendationsResponseDto })
  generate(@CurrentAgent() agent: AuthenticatedAgent) {
    return this.recommendations.generate(agent.id);
  }

  @Patch(':id/status')
  @ApiOperation({
    summary:
      'Record a recommendation outcome: done / partly_done / not_done / dismissed / snoozed / pending, with an optional free-text outcome note.',
  })
  @ApiOkResponse({ type: RecommendationDto })
  @ApiNotFoundResponse({ description: 'Recommendation not found' })
  updateStatus(
    @CurrentAgent() agent: AuthenticatedAgent,
    @Param('id') id: string,
    @Body() dto: UpdateRecommendationStatusDto,
  ) {
    return this.recommendations.updateStatus(agent.id, id, dto.status, dto.note);
  }
}
