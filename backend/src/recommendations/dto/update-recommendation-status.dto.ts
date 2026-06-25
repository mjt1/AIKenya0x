import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import {
  RECOMMENDATION_STATUSES,
  type RecommendationStatus,
} from '../../common/types/recommendations.types';

export class UpdateRecommendationStatusDto {
  @ApiProperty({ enum: RECOMMENDATION_STATUSES })
  @IsIn(RECOMMENDATION_STATUSES as readonly string[])
  status!: RecommendationStatus;

  @ApiPropertyOptional({
    description:
      'Optional free-text outcome note. Encouraged when the outcome is partly_done or not_done.',
    maxLength: 1000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string;
}
