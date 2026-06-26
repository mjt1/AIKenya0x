import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiHeader,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { SensorsService } from './sensors.service';
import { CreateSensorDto } from './dto/create-sensor.dto';
import { IngestReadingsDto } from './dto/ingest-readings.dto';
import {
  IngestResultDto,
  ReadingDto,
  RegenerateTokenDto,
  RemoveSensorDto,
  SensorCreatedDto,
  SensorDto,
} from './dto/responses/sensor.response.dto';
import { Public } from '../common/decorators/public.decorator';
import { SensorTokenGuard } from '../common/guards/sensor-token.guard';
import {
  CurrentAgent,
  type AuthenticatedAgent,
} from '../common/decorators/current-agent.decorator';
import {
  CurrentSensor,
  type AuthenticatedSensor,
} from '../common/decorators/current-sensor.decorator';

@ApiTags('sensors')
@Controller()
export class SensorsController {
  constructor(private readonly sensors: SensorsService) {}

  // ── Agent-facing (JWT, caseload-scoped) ──────────────────────────────────

  @Post('farmers/:farmerId/sensors')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Register a sensor on a farmer; returns the token ONCE.',
  })
  @ApiCreatedResponse({ type: SensorCreatedDto })
  @ApiNotFoundResponse({ description: 'Farmer not in your caseload' })
  create(
    @CurrentAgent() agent: AuthenticatedAgent,
    @Param('farmerId') farmerId: string,
    @Body() dto: CreateSensorDto,
  ) {
    return this.sensors.create(agent.id, farmerId, dto);
  }

  @Get('farmers/:farmerId/sensors')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List a farmer\'s sensors.' })
  @ApiOkResponse({ type: SensorDto, isArray: true })
  list(
    @CurrentAgent() agent: AuthenticatedAgent,
    @Param('farmerId') farmerId: string,
  ) {
    return this.sensors.list(agent.id, farmerId);
  }

  @Post('sensors/:sensorId/token')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Regenerate a sensor token (invalidates the old one).' })
  @ApiCreatedResponse({ type: RegenerateTokenDto })
  @ApiNotFoundResponse({ description: 'Sensor not found' })
  regenerate(
    @CurrentAgent() agent: AuthenticatedAgent,
    @Param('sensorId') sensorId: string,
  ) {
    return this.sensors.regenerateToken(agent.id, sensorId);
  }

  @Delete('sensors/:sensorId')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Remove a sensor and its readings.' })
  @ApiOkResponse({ type: RemoveSensorDto })
  @ApiNotFoundResponse({ description: 'Sensor not found' })
  remove(
    @CurrentAgent() agent: AuthenticatedAgent,
    @Param('sensorId') sensorId: string,
  ) {
    return this.sensors.remove(agent.id, sensorId);
  }

  @Get('sensors/:sensorId/readings')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List recent readings for a sensor.' })
  @ApiOkResponse({ type: ReadingDto, isArray: true })
  @ApiNotFoundResponse({ description: 'Sensor not found' })
  readings(
    @CurrentAgent() agent: AuthenticatedAgent,
    @Param('sensorId') sensorId: string,
    @Query('metric') metric?: string,
    @Query('limit') limit?: string,
  ) {
    return this.sensors.listReadings(
      agent.id,
      sensorId,
      metric,
      Number(limit ?? 50),
    );
  }

  // ── Device-facing webhook (token-authed, NOT a JWT route) ────────────────

  @Post('sensors/ingest')
  @Public()
  @UseGuards(SensorTokenGuard)
  @ApiHeader({
    name: 'Authorization',
    description: 'Bearer <sensor token>',
    required: true,
  })
  @ApiOperation({
    summary: 'Ingest sensor readings (device webhook, authenticated by token).',
  })
  @ApiCreatedResponse({ type: IngestResultDto })
  ingest(
    @CurrentSensor() sensor: AuthenticatedSensor,
    @Body() dto: IngestReadingsDto,
  ) {
    return this.sensors.ingest(sensor, dto);
  }
}
