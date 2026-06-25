import { Body, Controller, Post } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { AdvisoryService } from './advisory.service';
import { AskAdvisoryDto } from './dto/ask-advisory.dto';
import { AdvisoryAnswerResponseDto } from './dto/responses/advisory.response.dto';
import {
  CurrentAgent,
  type AuthenticatedAgent,
} from '../common/decorators/current-agent.decorator';

/**
 * Feature 6 — GraphRAG Advisory Assistant (US-12).
 * `POST /advisory/ask` embeds the question, vector-searches `:ManualChunk`s,
 * loads the farmer subgraph if provided, asks the AI service for a grounded
 * synthesis, and persists the citation trail as
 * `(:AdvisoryInquiry)-[:GROUNDED_IN]->(:ManualChunk)`.
 */
@ApiTags('advisory')
@ApiBearerAuth()
@Controller('advisory')
export class AdvisoryController {
  constructor(private readonly svc: AdvisoryService) {}

  @Post('ask')
  @ApiOperation({
    summary:
      'Ask a grounded, cited question. Optionally scoped to a farmer subgraph.',
  })
  @ApiOkResponse({ type: AdvisoryAnswerResponseDto })
  ask(
    @CurrentAgent() agent: AuthenticatedAgent,
    @Body() dto: AskAdvisoryDto,
  ) {
    return this.svc.ask(dto, agent);
  }
}
