import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength } from 'class-validator';

export class RegisterDto {
  @ApiProperty({ example: 'Asha Wanjiru' })
  @IsString()
  name!: string;

  @ApiProperty({ example: 'asha@digicow.co.ke' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'changeme123', minLength: 8 })
  @IsString()
  @MinLength(8)
  password!: string;

  @ApiProperty({ example: 'Kakamega' })
  @IsString()
  county!: string;
}
