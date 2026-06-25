import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class UpdateFarmerDto {
  @ApiPropertyOptional({ example: 'John Otieno' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: '0.2827,34.7519' })
  @IsOptional()
  @IsString()
  gps?: string;

  @ApiPropertyOptional({ example: '+254700000000' })
  @IsOptional()
  @IsString()
  phone?: string;
}
