import { ApiProperty, ApiExtraModels } from '@nestjs/swagger';

/**
 * Animal or Field asset. Properties beyond `id` vary by enterprise type
 * (animals: breed/lactationStage; fields: areaHa/variety/ratoonCycle).
 */
export class AssetDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  // Extra fields are documented via `additionalProperties: true` in the
  // wrapping schemas below; we don't enumerate them here.
}

export class EnterpriseSummaryDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ enum: ['Dairy', 'Sugarcane'] }) type!: string;
  @ApiProperty({
    type: 'array',
    required: false,
    items: { type: 'object', additionalProperties: true },
  })
  animals?: Record<string, unknown>[];
  @ApiProperty({
    type: 'array',
    required: false,
    items: { type: 'object', additionalProperties: true },
  })
  fields?: Record<string, unknown>[];
}

@ApiExtraModels(EnterpriseSummaryDto, AssetDto)
export class FarmerResponseDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty() name!: string;
  @ApiProperty({ nullable: true, type: String, example: '-0.2827,34.7519' })
  gps!: string | null;
  @ApiProperty({ example: '+254700000000' }) phone!: string;
  @ApiProperty({ nullable: true, type: String, format: 'date-time' })
  lastVisitedAt!: string | null;
  @ApiProperty({ required: false, nullable: true, type: String, format: 'date-time' })
  createdAt?: string | null;
  @ApiProperty({ required: false, nullable: true, type: String, format: 'date-time' })
  updatedAt?: string | null;
  @ApiProperty({ type: [EnterpriseSummaryDto] })
  enterprises!: EnterpriseSummaryDto[];
}

export class FarmerListItemDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty() name!: string;
  @ApiProperty({ nullable: true, type: String }) gps!: string | null;
  @ApiProperty() phone!: string;
  @ApiProperty({ nullable: true, type: String, format: 'date-time' })
  lastVisitedAt!: string | null;
}

/** Most-severe open issue surfaced on the map tooltip. */
export class MapTopIssueDto {
  @ApiProperty() text!: string;
  @ApiProperty({ nullable: true, type: String, enum: ['low', 'medium', 'high'] })
  severity!: string | null;
  @ApiProperty() contagious!: boolean;
}

/** Latest field observation surfaced on the map tooltip. */
export class MapLatestObservationDto {
  @ApiProperty({ enum: ['observation', 'issue', 'advice'] }) kind!: string;
  @ApiProperty() text!: string;
  @ApiProperty({ nullable: true, type: String, format: 'date-time' })
  capturedAt!: string | null;
}

@ApiExtraModels(MapTopIssueDto, MapLatestObservationDto)
export class FarmerMapSummaryDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty() name!: string;
  @ApiProperty() phone!: string;
  @ApiProperty({ nullable: true, type: String, example: '-0.2827,34.7519' })
  gps!: string | null;
  @ApiProperty({ nullable: true, type: String, format: 'date-time' })
  lastVisitedAt!: string | null;
  @ApiProperty({ type: [String], example: ['Dairy', 'Sugarcane'] })
  enterprises!: string[];
  @ApiProperty() openIssueCount!: number;
  @ApiProperty({ type: MapTopIssueDto, nullable: true })
  topIssue!: MapTopIssueDto | null;
  @ApiProperty({ type: MapLatestObservationDto, nullable: true })
  latestObservation!: MapLatestObservationDto | null;
}

export class EnterpriseCreatedResponseDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
}

export class ReassignFarmerResponseDto {
  @ApiProperty({ enum: ['ok'] }) status!: 'ok';
  @ApiProperty() farmerExists!: boolean;
  @ApiProperty() targetAgentExists!: boolean;
  @ApiProperty({ nullable: true, type: String }) fromAgentId!: string | null;
  @ApiProperty({ required: false }) reassignedAt?: string;
}
