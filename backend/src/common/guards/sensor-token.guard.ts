import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { SensorsRepository } from '../../repository/sensors.repository';
import { hashSensorToken } from '../../sensors/sensor-token.util';
import type { AuthenticatedSensor } from '../decorators/current-sensor.decorator';

/**
 * Authenticates the sensor webhook by its bearer token instead of an agent JWT.
 * Pair with @Public() so the global JwtAuthGuard is skipped; this guard hashes
 * the incoming token, resolves the active Sensor, and attaches it to the
 * request for @CurrentSensor().
 */
@Injectable()
export class SensorTokenGuard implements CanActivate {
  constructor(private readonly sensors: SensorsRepository) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<{
      headers: Record<string, string | string[] | undefined>;
      sensor?: AuthenticatedSensor;
    }>();
    const header = req.headers['authorization'];
    const raw = Array.isArray(header) ? header[0] : header;
    const match = /^Bearer\s+(.+)$/i.exec((raw ?? '').trim());
    const token = match?.[1]?.trim();
    if (!token) {
      throw new UnauthorizedException('Missing sensor token');
    }
    const sensor = await this.sensors.findActiveByTokenHash(
      hashSensorToken(token),
    );
    if (!sensor) {
      throw new UnauthorizedException('Invalid or revoked sensor token');
    }
    req.sensor = sensor;
    return true;
  }
}
