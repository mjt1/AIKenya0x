import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsOptional, IsString, MinLength } from 'class-validator';
import { Role } from '../../common/types/rbac.types';

export class CreateAgentDto {
  @ApiProperty() @IsString() name!: string;
  @ApiProperty() @IsEmail() email!: string;
  @ApiProperty({ minLength: 8 }) @IsString() @MinLength(8) password!: string;
  @ApiProperty() @IsString() county!: string;
  @ApiProperty() @IsString() cooperative!: string;
  @ApiPropertyOptional({ enum: Role, default: Role.agent })
  @IsOptional()
  @IsEnum(Role)
  role?: Role;
}
