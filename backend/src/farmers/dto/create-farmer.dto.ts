import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

export enum EnterpriseType {
  Dairy = 'Dairy',
  Sugarcane = 'Sugarcane',
}

export class AnimalInput {
  @ApiProperty() @IsString() breed!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() lactationStage?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() lastBreedingDate?: string;
}

export class FieldInput {
  @ApiProperty() @IsNumber() areaHa!: number;
  @ApiProperty() @IsString() variety!: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() ratoonCycle?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() plantingDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() lastTopDressedAt?: string;
}

export class EnterpriseInput {
  @ApiProperty({ enum: EnterpriseType })
  @IsEnum(EnterpriseType)
  type!: EnterpriseType;

  @ApiPropertyOptional({ type: [AnimalInput] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AnimalInput)
  animals?: AnimalInput[];

  @ApiPropertyOptional({ type: [FieldInput] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FieldInput)
  fields?: FieldInput[];
}

export class CreateFarmerDto {
  @ApiProperty({ example: 'John Otieno' })
  @IsString()
  name!: string;

  @ApiPropertyOptional({ example: '0.2827,34.7519' })
  @IsOptional()
  @IsString()
  gps?: string;

  @ApiProperty({ example: '+254700000000' })
  @IsString()
  phone!: string;

  @ApiProperty({ type: [EnterpriseInput] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => EnterpriseInput)
  enterprises!: EnterpriseInput[];
}
