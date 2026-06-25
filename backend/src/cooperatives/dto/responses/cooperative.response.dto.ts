import { ApiProperty } from '@nestjs/swagger';
import { PublicAgentDto } from '../../../common/dto/public-agent.dto';

export class CooperativeDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty() name!: string;
  @ApiProperty({ example: 'Kakamega' }) county!: string;
  @ApiProperty({ required: false, format: 'date-time' }) createdAt?: string;
}

export class CooperativeListItemDto extends CooperativeDto {
  @ApiProperty({ description: 'Number of agents currently in this cooperative.' })
  agentCount!: number;
}

export class CooperativeAgentsResponseDto {
  @ApiProperty({ type: CooperativeDto }) cooperative!: CooperativeDto;
  @ApiProperty({ type: PublicAgentDto, isArray: true })
  agents!: PublicAgentDto[];
}
