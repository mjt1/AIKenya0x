import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateSensorDto {
  @ApiProperty({ example: 'North plot moisture probe' })
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  name!: string;

  @ApiProperty({
    description:
      'What the sensor measures. Pick from the controlled list (soil_moisture, soil_ph, milk_yield, ...) or a custom string for "other".',
    example: 'soil_moisture',
  })
  @IsString()
  @MinLength(1)
  @MaxLength(40)
  metric!: string;

  @ApiPropertyOptional({
    description: 'Unit of measure. Defaults from the metric when omitted.',
    example: '%',
  })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  unit?: string;
}
