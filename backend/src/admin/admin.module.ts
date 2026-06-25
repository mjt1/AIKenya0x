import { Module } from '@nestjs/common';
import { AgentsModule } from '../agents/agents.module';
import { AiClientModule } from '../ai-client/ai-client.module';
import { AdminAgentsController } from './agents/admin-agents.controller';
import { AdminAgentsService } from './agents/admin-agents.service';
import { AdminKbController } from './kb/admin-kb.controller';
import { AdminKbService } from './kb/admin-kb.service';
import { AdminAnalyticsController } from './analytics/admin-analytics.controller';
import { AdminAnalyticsService } from './analytics/admin-analytics.service';
import { KnowledgeRepository } from '../repository/knowledge.repository';

/**
 * Bundles every admin-only surface under `/admin/*`:
 *   - `/admin/agents`      — US-17 agent + caseload management
 *   - `/admin/kb`          — US-18 knowledge-base ingestion (powers GraphRAG)
 *   - `/admin/analytics`   — US-19 cross-agent rollups
 *
 * Endpoints are all gated by `@Roles(Role.admin)` at the controller level.
 */
@Module({
  imports: [AgentsModule, AiClientModule],
  controllers: [
    AdminAgentsController,
    AdminKbController,
    AdminAnalyticsController,
  ],
  providers: [
    AdminAgentsService,
    AdminKbService,
    AdminAnalyticsService,
    KnowledgeRepository,
  ],
  exports: [KnowledgeRepository],
})
export class AdminModule {}
