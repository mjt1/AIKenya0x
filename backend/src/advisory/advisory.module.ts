import { Module } from '@nestjs/common';
import { AiClientModule } from '../ai-client/ai-client.module';
import { AdminModule } from '../admin/admin.module';
import { AdvisoryController } from './advisory.controller';
import { AdvisoryService } from './advisory.service';

@Module({
  imports: [AiClientModule, AdminModule],
  controllers: [AdvisoryController],
  providers: [AdvisoryService],
})
export class AdvisoryModule {}
