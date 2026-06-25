import { Body, Controller, Get, HttpCode, Post } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { AuthTokenResponseDto } from './dto/responses/auth-token.response.dto';
import { AgentProfileDto } from '../common/dto/public-agent.dto';
import { Public } from '../common/decorators/public.decorator';
import {
  CurrentAgent,
  type AuthenticatedAgent,
} from '../common/decorators/current-agent.decorator';
import { AgentsService } from '../agents/agents.service';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly agents: AgentsService,
  ) {}

  @Public()
  @Post('register')
  @ApiOperation({ summary: 'Register a new extension agent (sprint 1: open).' })
  @ApiCreatedResponse({ type: AuthTokenResponseDto })
  @ApiConflictResponse({ description: 'Email already registered' })
  register(@Body() dto: RegisterDto) {
    return this.auth.register(dto);
  }

  @Public()
  @Post('login')
  @HttpCode(200)
  @ApiOperation({ summary: 'Log in and receive a JWT access token.' })
  @ApiOkResponse({ type: AuthTokenResponseDto })
  @ApiUnauthorizedResponse({ description: 'Invalid credentials' })
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto);
  }

  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get the current agent profile + caseload size.' })
  @ApiOkResponse({ type: AgentProfileDto })
  me(@CurrentAgent() agent: AuthenticatedAgent) {
    return this.agents.profile(agent.id);
  }
}
