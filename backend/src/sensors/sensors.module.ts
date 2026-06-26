import { Module } from '@nestjs/common';
import { SensorsController } from './sensors.controller';
import { SensorsService } from './sensors.service';
import { SensorTokenGuard } from '../common/guards/sensor-token.guard';

@Module({
  controllers: [SensorsController],
  providers: [SensorsService, SensorTokenGuard],
  exports: [SensorsService],
})
export class SensorsModule {}
