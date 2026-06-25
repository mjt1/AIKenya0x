import { ApiProperty } from '@nestjs/swagger';

export class KbUploadResponseDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ description: 'Number of chunks created from the text.' })
  chunkCount!: number;
}

export class KbDocumentDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty() title!: string;
  @ApiProperty({ description: 'Source citation, e.g. "KALRO Sugarcane Manual 2022".' })
  source!: string;
  @ApiProperty({
    nullable: true,
    type: String,
    enum: ['Dairy', 'Sugarcane', null],
  })
  enterprise!: string | null;
  @ApiProperty() chunkCount!: number;
  @ApiProperty({ nullable: true, type: String, format: 'date-time' })
  createdAt!: string | null;
}

export class KbChunkDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty() text!: string;
  @ApiProperty() source!: string;
  @ApiProperty({ nullable: true, type: String }) title!: string | null;
  @ApiProperty({ nullable: true, type: String }) enterprise!: string | null;
  @ApiProperty({ description: 'Ordinal index within the parent document.' })
  ordinal!: number;
}

export class KbDeleteResponseDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ description: 'Number of chunks deleted alongside the document.' })
  deletedChunks!: number;
}
