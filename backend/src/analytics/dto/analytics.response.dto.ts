import { ApiProperty } from '@nestjs/swagger';

export class ObservationKindCountDto {
  @ApiProperty() kind!: string;
  @ApiProperty() count!: number;
}

export class AnalyticsOverviewResponseDto {
  @ApiProperty() totalFarmers!: number;
  @ApiProperty() visitedLast30d!: number;
  @ApiProperty() overdue!: number;
  @ApiProperty() neverVisited!: number;
  @ApiProperty() visitsThisWeek!: number;
  @ApiProperty() visitsThisMonth!: number;
  @ApiProperty({ type: [ObservationKindCountDto] })
  observationsByKind!: ObservationKindCountDto[];
}

export class VisitCadencePointDto {
  @ApiProperty({ format: 'date', example: '2026-06-21' }) date!: string;
  @ApiProperty() visits!: number;
}

export class ObservationTrendPointDto {
  @ApiProperty({ format: 'date', example: '2026-06-15' }) weekStart!: string;
  @ApiProperty() kind!: string;
  @ApiProperty() count!: number;
}

export class FarmerHealthRowDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty() name!: string;
  @ApiProperty() phone!: string;
  @ApiProperty({ nullable: true, type: String, format: 'date-time' })
  lastVisitedAt!: string | null;
  @ApiProperty({ nullable: true, type: Number })
  daysSinceVisit!: number | null;
  @ApiProperty({ enum: ['active', 'stale', 'overdue', 'never'] })
  status!: 'active' | 'stale' | 'overdue' | 'never';
  @ApiProperty() observationCount!: number;
}
