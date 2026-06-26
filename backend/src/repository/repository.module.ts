import { Global, Module } from '@nestjs/common';
import { Neo4jModule } from '../neo4j/neo4j.module';
import { AgentsRepository } from './agents.repository';
import { FarmersRepository } from './farmers.repository';
import { VisitsRepository } from './visits.repository';
import { SyncRepository } from './sync.repository';
import { AnalyticsRepository } from './analytics.repository';
import { RecommendationsRepository } from './recommendations.repository';
import { SensorsRepository } from './sensors.repository';

@Global()
@Module({
  imports: [Neo4jModule],
  providers: [
    AgentsRepository,
    FarmersRepository,
    VisitsRepository,
    SyncRepository,
    AnalyticsRepository,
    RecommendationsRepository,
    SensorsRepository,
  ],
  exports: [
    AgentsRepository,
    FarmersRepository,
    VisitsRepository,
    SyncRepository,
    AnalyticsRepository,
    RecommendationsRepository,
    SensorsRepository,
  ],
})
export class RepositoryModule {}
