import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsIn,
  IsISO8601,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  ValidateNested,
} from 'class-validator';
import { SYNC_OP_KINDS, type SyncOpKind } from '../../common/types/sync.types';

export class SyncOperationDto {
  @ApiProperty({
    description: 'Client-generated UUID identifying this operation for idempotency.',
  })
  @IsUUID()
  clientId!: string;

  @ApiProperty({ enum: SYNC_OP_KINDS })
  @IsIn(SYNC_OP_KINDS as unknown as string[])
  kind!: SyncOpKind;

  @ApiProperty({
    description: 'ISO 8601 timestamp from the client at the moment the op was queued.',
  })
  @IsISO8601()
  clientUpdatedAt!: string;

  @ApiPropertyOptional({
    description: 'Target farmer id (required for enterprise.create, visit.create, farmer.update).',
  })
  @IsOptional()
  @IsUUID()
  farmerId?: string;

  @ApiProperty({
    description:
      'Operation-specific payload. Schema matches the corresponding direct endpoint DTO.',
    type: Object,
  })
  @IsObject()
  payload!: Record<string, unknown>;
}

export class SyncPushDto {
  @ApiProperty({ type: [SyncOperationDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(200)
  @ValidateNested({ each: true })
  @Type(() => SyncOperationDto)
  operations!: SyncOperationDto[];
}

export class SyncPullQueryDto {
  @ApiPropertyOptional({
    description: 'ISO 8601 cursor. Omit to pull the entire caseload.',
    example: '2026-06-20T00:00:00.000Z',
  })
  @IsOptional()
  @IsISO8601()
  since?: string;
}
