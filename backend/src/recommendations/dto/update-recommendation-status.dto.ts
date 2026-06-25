import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';
import {
  RECOMMENDATION_STATUSES,
  type RecommendationStatus,
} from '../../common/types/recommendations.types';

export class UpdateRecommendationStatusDto {
  @ApiProperty({ enum: RECOMMENDATION_STATUSES })
  @IsIn(RECOMMENDATION_STATUSES as readonly string[])
  status!: RecommendationStatus;
}
