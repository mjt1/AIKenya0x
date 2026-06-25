import { ApiProperty } from '@nestjs/swagger';
import { PublicAgentDto } from '../../../common/dto/public-agent.dto';

export class AuthTokenResponseDto {
  @ApiProperty({
    description: 'JWT bearer token. Send as `Authorization: Bearer <token>`.',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  access_token!: string;

  @ApiProperty({ type: PublicAgentDto })
  agent!: PublicAgentDto;
}
