import { Injectable, NotFoundException } from '@nestjs/common';
import { RecommendationsRepository } from '../repository/recommendations.repository';
import { AiClientService } from '../ai-client/ai-client.service';
import type { RecommendationStatus } from '../common/types/recommendations.types';

@Injectable()
export class RecommendationsService {
  constructor(
    private readonly repo: RecommendationsRepository,
    private readonly ai: AiClientService,
  ) {}

  /**
   * Run the rule-based candidate query, send candidates through the AI ranker,
   * persist any new ones (dedup against pending/snoozed records), and return
   * the current pending queue.
   */
  async generate(agentId: string) {
    const candidates = await this.repo.generateCandidates(agentId);
    const ranked = await this.ai.rankRecommendations(candidates);
    // Sort by priority desc so persist order matches expected display order.
    ranked.sort((a, b) => b.priority - a.priority);
    const { created, skipped } = await this.repo.upsert(agentId, ranked);
    const queue = await this.repo.listForAgent(agentId, 'pending');
    return { generated: ranked.length, created, skipped, queue };
  }

  list(agentId: string, status?: RecommendationStatus) {
    return this.repo.listForAgent(agentId, status);
  }

  async updateStatus(
    agentId: string,
    id: string,
    status: RecommendationStatus,
    note?: string,
  ) {
    const updated = await this.repo.updateStatus(agentId, id, status, note);
    if (!updated) throw new NotFoundException('Recommendation not found');
    return updated;
  }
}
