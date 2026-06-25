import { ApiProperty } from '@nestjs/swagger';
import { Role } from '../types/rbac.types';

export class PublicAgentDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty() name!: string;
  @ApiProperty({ format: 'email' }) email!: string;
  @ApiProperty({ example: 'Kakamega' }) county!: string;
  @ApiProperty({ enum: Role }) role!: Role;
}

export class AgentProfileDto {
  @ApiProperty({ type: PublicAgentDto }) agent!: PublicAgentDto;
  @ApiProperty({ example: 47, description: 'Number of farmers in caseload' })
  caseloadSize!: number;
}
