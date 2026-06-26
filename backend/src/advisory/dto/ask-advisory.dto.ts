import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class AskAdvisoryDto {
  @ApiProperty({
    description: 'Free-text question from the agent (5-1000 chars).',
    minLength: 5,
    maxLength: 1000,
  })
  @IsString()
  // Bounds mirror the AI service's AdvisoryRequest.query (min 5 / max 1000) so a
  // too-short/long question fails here with a clear 400 instead of a 422 from
  // the AI service after the embed round-trip.
  @MinLength(5)
  @MaxLength(1000)
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
