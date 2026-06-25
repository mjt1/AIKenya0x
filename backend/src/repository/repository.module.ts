import { Global, Module } from '@nestjs/common';
import { Neo4jModule } from '../neo4j/neo4j.module';
import { AgentsRepository } from './agents.repository';
import { CooperativesRepository } from './cooperatives.repository';
import { FarmersRepository } from './farmers.repository';
import { VisitsRepository } from './visits.repository';
import { SyncRepository } from './sync.repository';
import { AnalyticsRepository } from './analytics.repository';
import { RecommendationsRepository } from './recommendations.repository';

@Global()
@Module({
  imports: [Neo4jModule],
  providers: [
    AgentsRepository,
    CooperativesRepository,
    FarmersRepository,
    VisitsRepository,
    SyncRepository,
    AnalyticsRepository,
    RecommendationsRepository,
  ],
  exports: [
    AgentsRepository,
    CooperativesRepository,
    FarmersRepository,
    VisitsRepository,
    SyncRepository,
    AnalyticsRepository,
    RecommendationsRepository,
  ],
})
export class RepositoryModule {}
