import { ApiProperty } from '@nestjs/swagger';

export class SensorDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ format: 'uuid' }) farmerId!: string;
  @ApiProperty() name!: string;
  @ApiProperty({ example: 'soil_moisture' }) metric!: string;
  @ApiProperty({ nullable: true, type: String, example: '%' })
  unit!: string | null;
  @ApiProperty({ enum: ['active', 'revoked'] }) status!: string;
  @ApiProperty({ description: 'Display-safe token prefix.', example: 'slh_sk_ab12cd' })
  tokenPrefix!: string;
  @ApiProperty({ nullable: true, type: String, format: 'date-time' })
  lastReadingAt!: string | null;
  @ApiProperty({ nullable: true, type: String, format: 'date-time' })
  createdAt!: string | null;
  @ApiProperty({ nullable: true, type: String, format: 'date-time' })
  updatedAt!: string | null;
}

/** Returned ONCE on creation/regeneration — contains the plaintext token. */
export class SensorCreatedDto {
  @ApiProperty({ type: SensorDto }) sensor!: SensorDto;
  @ApiProperty({
    description: 'Plaintext token — shown once. The device sends it as a Bearer token.',
    example: 'slh_sk_xxxxxxxxxxxxxxxxxxxxxxxx',
  })
  token!: string;
  @ApiProperty({
    description: 'Path the device POSTs readings to.',
    example: '/sensors/ingest',
  })
  ingestPath!: string;
}

export class RegenerateTokenDto {
  @ApiProperty() token!: string;
  @ApiProperty({ example: 'slh_sk_ab12cd' }) tokenPrefix!: string;
}

export class RemoveSensorDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty() deletedReadings!: number;
}

export class ReadingDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ example: 'soil_moisture' }) metric!: string;
  @ApiProperty({
    description: 'Number when the value is numeric, otherwise a string.',
    oneOf: [{ type: 'number' }, { type: 'string' }],
  })
  value!: number | string;
  @ApiProperty({ enum: ['number', 'string'] }) valueType!: string;
  @ApiProperty({ nullable: true, type: String }) unit!: string | null;
  @ApiProperty({ type: String, format: 'date-time' }) ts!: string;
  @ApiProperty({ enum: ['webhook', 'manual'] }) source!: string;
}

export class IngestResultDto {
  @ApiProperty({ description: 'Number of Reading nodes created.' })
  accepted!: number;
}
