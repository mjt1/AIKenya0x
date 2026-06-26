import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/** Sensor identity attached to the request by SensorTokenGuard. */
export interface AuthenticatedSensor {
  id: string;
  farmerId: string;
  name: string;
  metric: string;
  unit: string | null;
}

export const CurrentSensor = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthenticatedSensor => {
    const request = ctx.switchToHttp().getRequest();
    return request.sensor as AuthenticatedSensor;
  },
);
