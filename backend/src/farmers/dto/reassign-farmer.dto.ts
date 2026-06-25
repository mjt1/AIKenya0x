import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class ReassignFarmerDto {
  @ApiProperty({
    example: 'b1f0d2a4-...',
    description: 'ID of the agent who should now manage this farmer.',
  })
  @IsString()
  toAgentId!: string;
}
