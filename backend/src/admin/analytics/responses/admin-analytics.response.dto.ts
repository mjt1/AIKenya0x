import { ApiProperty } from '@nestjs/swagger';
import { Role } from '../../../common/types/rbac.types';

export class PlatformOverviewResponseDto {
  @ApiProperty() totalAgents!: number;
  @ApiProperty() totalFarmers!: number;
  @ApiProperty() totalVisits!: number;
  @ApiProperty() visitsThisWeek!: number;
  @ApiProperty() visitsThisMonth!: number;
  @ApiProperty() totalRecommendations!: number;
  @ApiProperty() recsAccepted!: number;
  @ApiProperty() recsApplied!: number;
  @ApiProperty({
    description: '(recsAccepted + recsApplied) / totalRecommendations',
    minimum: 0,
    maximum: 1,
  })
  adoptionRate!: number;
  @ApiProperty() totalKbDocuments!: number;
}

export class AgentRollupRowDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty() name!: string;
  @ApiProperty({ format: 'email' }) email!: string;
  @ApiProperty({ enum: Role }) role!: Role;
  @ApiProperty() caseloadSize!: number;
  @ApiProperty() totalVisits!: number;
  @ApiProperty() visitsLast30d!: number;
}

export class DemandRowDto {
  @ApiProperty() name!: string;
  @ApiProperty({ example: 'fertiliser' }) type!: string;
  @ApiProperty() quantity!: number;
}
