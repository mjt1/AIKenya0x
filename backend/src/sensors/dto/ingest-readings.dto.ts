import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsObject, IsOptional, IsString } from 'class-validator';

/**
 * Webhook body a sensor (e.g. a Raspberry Pi) POSTs to /sensors/ingest.
 * The sensor is identified by its bearer token, not by anything in the body.
 *
 * `readings` is the abstract key->value bag: each key is a metric and each
 * value a number or string. The service coerces + fans each entry into a
 * Reading node. Deeper per-value validation happens in the service.
 */
export class IngestReadingsDto {
  @ApiProperty({
    description: 'Map of metric -> value (number or string).',
    example: { soil_moisture: 28.4, soil_ph: 6.3 },
    type: 'object',
    additionalProperties: true,
  })
  @IsObject()
  readings!: Record<string, string | number>;

  @ApiPropertyOptional({
    description: 'ISO timestamp for the batch. Defaults to server time.',
    format: 'date-time',
  })
  @IsOptional()
  @IsString()
  ts?: string;
}
