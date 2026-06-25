import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class CreateCooperativeDto {
  @ApiProperty({ example: 'Mumias Sugar Cooperative' })
  @IsString()
  @MinLength(2)
  name!: string;

  @ApiProperty({ example: 'Kakamega' })
  @IsString()
  county!: string;
}
