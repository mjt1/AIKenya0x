import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, MinLength } from 'class-validator';

export class AskAdvisoryDto {
  @ApiProperty({ description: 'Free-text question from the agent.' })
  @IsString()
  @MinLength(3)
  question!: string;

  @ApiPropertyOptional({ description: 'Scope the answer to a farmer subgraph.' })
  @IsOptional()
  @IsString()
  farmerId?: string;

  @ApiPropertyOptional({ enum: ['dairy', 'sugarcane'] })
  @IsOptional()
  @IsIn(['dairy', 'sugarcane'])
  enterprise?: 'dairy' | 'sugarcane';
}
