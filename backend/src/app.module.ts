import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { Neo4jModule } from './neo4j/neo4j.module';
import { RepositoryModule } from './repository/repository.module';
import { AuthModule } from './auth/auth.module';
import { AgentsModule } from './agents/agents.module';
import { FarmersModule } from './farmers/farmers.module';
import { VisitsModule } from './visits/visits.module';
import { SyncModule } from './sync/sync.module';
import { AiClientModule } from './ai-client/ai-client.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { RecommendationsModule } from './recommendations/recommendations.module';
import { AdminModule } from './admin/admin.module';
import { AdvisoryModule } from './advisory/advisory.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { HealthController } from './health/health.controller';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    Neo4jModule,
    RepositoryModule,
    AiClientModule,
    AgentsModule,
    AuthModule,
    FarmersModule,
    VisitsModule,
    SyncModule,
    AnalyticsModule,
    RecommendationsModule,
    AdminModule,
    AdvisoryModule,
  ],
  controllers: [HealthController],
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
