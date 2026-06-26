import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString } from 'class-validator';

/**
 * US-18 — metadata that rides alongside a multipart file upload.
 *
 * Unlike {@link UploadDocumentDto}, there is no `text` field: the document
 * body IS the uploaded file (PDF or plain text). The server extracts the
 * text, then chunks + embeds it through the same pipeline.
 */
export class UploadDocumentFileDto {
  @ApiProperty({ description: 'Display title shown in citations.' })
  @IsString()
  title!: string;

  @ApiProperty({
    description: 'Source label (e.g. "KALRO Sugarcane Manual, 2019").',
  })
  @IsString()
  source!: string;

  @ApiPropertyOptional({ enum: ['dairy', 'sugarcane'] })
  @IsOptional()
  @IsIn(['dairy', 'sugarcane'])
  enterprise?: 'dairy' | 'sugarcane';
}
