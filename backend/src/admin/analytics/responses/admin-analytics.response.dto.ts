import { ApiProperty } from '@nestjs/swagger';
import { Role } from '../../../common/types/rbac.types';

export class PlatformOverviewResponseDto {
  @ApiProperty() totalAgents!: number;
  @ApiProperty() totalFarmers!: number;
  @ApiProperty() totalVisits!: number;
  @ApiProperty() visitsThisWeek!: number;
  @ApiProperty() visitsThisMonth!: number;
  @ApiProperty() totalRecommendations!: number;
  @ApiProperty({ description: 'Recommendations resolved as done.' })
  recsDone!: number;
  @ApiProperty({ description: 'Recommendations resolved as partly done.' })
  recsPartlyDone!: number;
  @ApiProperty({
    description: '(recsDone + recsPartlyDone) / totalRecommendations',
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
