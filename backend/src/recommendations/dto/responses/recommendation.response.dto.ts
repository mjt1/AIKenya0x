import { ApiProperty } from '@nestjs/swagger';
import {
  RECOMMENDATION_KINDS,
  RECOMMENDATION_STATUSES,
} from '../../../common/types/recommendations.types';

export class RecommendationFarmerDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty() name!: string;
  @ApiProperty({ nullable: true, type: String }) phone!: string | null;
}

export class RecommendationDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ enum: RECOMMENDATION_KINDS }) kind!: string;
  @ApiProperty({
    description: 'Rule-based human-readable reason this rec was generated.',
    example: 'Last visit was 42 days ago',
  })
  reason!: string;
  @ApiProperty({
    description: 'One-line AI rationale enriching the rule-based reason.',
  })
  rationale!: string;
  @ApiProperty({ example: 85, description: '0-100, higher = more urgent' })
  priority!: number;
  @ApiProperty({ enum: RECOMMENDATION_STATUSES }) status!: string;
  @ApiProperty({
    description: 'Stable key used for dedup against existing pending recs.',
  })
  dedupeKey!: string;
  @ApiProperty({ format: 'date-time' }) createdAt!: string;
  @ApiProperty({ format: 'date-time' }) updatedAt!: string;
  @ApiProperty({ type: RecommendationFarmerDto }) farmer!: RecommendationFarmerDto;
}

export class GenerateRecommendationsResponseDto {
  @ApiProperty({ description: 'Total ranked candidates produced this run.' })
  generated!: number;
  @ApiProperty({ description: 'New recommendations persisted (deduped).' })
  created!: number;
  @ApiProperty({ description: 'Candidates skipped because a pending dup exists.' })
  skipped!: number;
  @ApiProperty({ type: [RecommendationDto] })
  queue!: RecommendationDto[];
}
