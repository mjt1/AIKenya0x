import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { Role } from '../../common/types/rbac.types';

export class UpdateRoleDto {
  @ApiProperty({ enum: Role, example: Role.supervisor })
  @IsEnum(Role)
  role!: Role;
}
