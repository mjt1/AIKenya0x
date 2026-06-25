import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsISO8601,
  IsOptional,
  IsString,
  IsUUID,
  ValidateNested,
} from 'class-validator';

export enum ObservationKind {
  observation = 'observation',
  issue = 'issue',
  advice = 'advice',
}

export class ObservationInput {
  @ApiProperty({ enum: ObservationKind })
  @IsEnum(ObservationKind)
  kind!: ObservationKind;

  @ApiProperty()
  @IsString()
  text!: string;
}

export class CreateVisitDto {
  @ApiPropertyOptional({
    description:
      'Optional client-generated UUID to make the request idempotent for offline sync.',
  })
  @IsOptional()
  @IsUUID()
  visitId?: string;

  @ApiPropertyOptional({ example: '2026-06-24T08:30:00Z' })
  @IsOptional()
  @IsISO8601()
  date?: string;

  @ApiProperty({ type: [String], description: 'Enterprises this visit covered.' })
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  enterpriseIds!: string[];

  @ApiProperty({ example: 'Cow off feed for 2 days; milk yield down ~20%.' })
  @IsString()
  notes!: string;

  @ApiPropertyOptional({ type: [ObservationInput] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ObservationInput)
  observations?: ObservationInput[];
}
