import { ApiProperty } from '@nestjs/swagger';
import {
  SYNC_OP_KINDS,
  SYNC_OP_STATUSES,
} from '../../../common/types/sync.types';

export class SyncOpResultDto {
  @ApiProperty({ description: 'Echo of the clientId from the request op.' })
  clientId!: string;
  @ApiProperty({ enum: SYNC_OP_KINDS }) kind!: string;
  @ApiProperty({
    enum: SYNC_OP_STATUSES,
    description:
      'applied = first-time write; duplicate = idempotent replay; conflict = newer server version; rejected = validation/scope failure.',
  })
  status!: string;
  @ApiProperty({ required: false, format: 'uuid' }) serverId?: string;
  @ApiProperty({ required: false, format: 'date-time' }) serverUpdatedAt?: string;
  @ApiProperty({ required: false }) reason?: string;
}

export class SyncPushResponseDto {
  @ApiProperty({ type: [SyncOpResultDto] })
  results!: SyncOpResultDto[];
}

export class SyncPullResponseDto {
  @ApiProperty({
    format: 'date-time',
    description: 'Use as the next ?since= cursor.',
  })
  cursor!: string;
  @ApiProperty({
    type: 'array',
    items: { type: 'object', additionalProperties: true },
    description: 'Farmer rows modified since the cursor.',
  })
  farmers!: Record<string, unknown>[];
  @ApiProperty({
    type: 'array',
    items: { type: 'object', additionalProperties: true },
    description: 'Enterprise rows modified since the cursor.',
  })
  enterprises!: Record<string, unknown>[];
  @ApiProperty({
    type: 'array',
    items: { type: 'object', additionalProperties: true },
    description: 'Visit rows modified since the cursor.',
  })
  visits!: Record<string, unknown>[];
  @ApiProperty({
    type: 'array',
    items: { type: 'object', additionalProperties: true },
    description: 'Observation rows modified since the cursor.',
  })
  observations!: Record<string, unknown>[];
}

export class SyncStatusResponseDto {
  @ApiProperty({ format: 'date-time' }) serverTime!: string;
  @ApiProperty() caseloadCount!: number;
  @ApiProperty({ nullable: true, type: String, format: 'date-time' })
  lastWriteAt!: string | null;
}
