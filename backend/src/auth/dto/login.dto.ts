import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'asha@digicow.co.ke' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'changeme123' })
  @IsString()
  password!: string;
}
