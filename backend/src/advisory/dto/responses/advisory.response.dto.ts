import { ApiProperty } from '@nestjs/swagger';

export class AdvisoryCitationDto {
  @ApiProperty({ format: 'uuid', description: 'ManualChunk id grounding the answer.' })
  chunkId!: string;
  @ApiProperty({ description: 'Original source document citation.' })
  source!: string;
  @ApiProperty({ nullable: true, type: String }) title!: string | null;
  @ApiProperty({ description: 'First 240 chars of the grounded chunk.' })
  snippet!: string;
  @ApiProperty({
    description: 'Cosine similarity score from the vector search (higher = closer).',
  })
  score!: number;
}

export class AdvisoryFarmerStubDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty() name!: string;
}

export class AdvisoryAnswerResponseDto {
  @ApiProperty({ format: 'uuid' }) inquiryId!: string;
  @ApiProperty() question!: string;
  @ApiProperty({
    description:
      'Grounded synthesis from the AI service. If `deferred=true`, this is a referral message instead of an answer.',
  })
  answer!: string;
  @ApiProperty({
    description:
      'True when confidence is low or the issue is high-risk; the assistant defers to a vet/agronomist (PRD F6).',
  })
  deferred!: boolean;
  @ApiProperty({
    nullable: true,
    type: String,
    description: 'One-line rationale describing how the answer was composed.',
  })
  rationale!: string | null;
  @ApiProperty({ type: [AdvisoryCitationDto] })
  citations!: AdvisoryCitationDto[];
  @ApiProperty({
    nullable: true,
    type: AdvisoryFarmerStubDto,
    description: 'Present when the question was scoped to a farmer.',
  })
  farmer!: AdvisoryFarmerStubDto | null;
}
