import { Injectable } from '@nestjs/common';
import { AnalyticsRepository } from '../repository/analytics.repository';

@Injectable()
export class AnalyticsService {
  constructor(private readonly repo: AnalyticsRepository) {}

  overview(agentId: string) {
    return this.repo.overview(agentId);
  }

  visitCadence(agentId: string, days: number) {
    return this.repo.visitCadence(agentId, days);
  }

  observationTrends(agentId: string, days: number) {
    return this.repo.observationTrends(agentId, days);
  }

  farmerHealth(agentId: string) {
    return this.repo.farmerHealth(agentId);
  }
}
