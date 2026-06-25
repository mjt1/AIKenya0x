import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class AssignCooperativeDto {
  @ApiProperty() @IsString() cooperative!: string;
  @ApiProperty() @IsString() county!: string;
}
