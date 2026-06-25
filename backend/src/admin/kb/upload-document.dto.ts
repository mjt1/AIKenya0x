import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, MinLength } from 'class-validator';

export class UploadDocumentDto {
  @ApiProperty({ description: 'Display title shown in citations.' })
  @IsString()
  title!: string;

  @ApiProperty({ description: 'Source label (e.g. "KALRO Sugarcane Manual, 2019").' })
  @IsString()
  source!: string;

  @ApiProperty({ description: 'Full document body. Server chunks + embeds.' })
  @IsString()
  @MinLength(20)
  text!: string;

  @ApiPropertyOptional({ enum: ['dairy', 'sugarcane'] })
  @IsOptional()
  @IsIn(['dairy', 'sugarcane'])
  enterprise?: 'dairy' | 'sugarcane';
}
