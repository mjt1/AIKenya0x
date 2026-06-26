import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { AdminKbService } from './admin-kb.service';
import { UploadDocumentDto } from './upload-document.dto';
import { UploadDocumentFileDto } from './upload-document-file.dto';
import {
  KbChunkDto,
  KbDeleteResponseDto,
  KbDocumentDto,
  KbUploadResponseDto,
} from './responses/kb.response.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/types/rbac.types';
import {
  CurrentAgent,
  type AuthenticatedAgent,
} from '../../common/decorators/current-agent.decorator';
import multer from 'multer';

/** 20 MB cap — generous for a multi-hundred-page manual PDF, safe for memory. */
const MAX_UPLOAD_BYTES = 20 * 1024 * 1024;

/**
 * US-18 — Knowledge-Base management. Admin uploads/curates reference
 * documents; ingestion chunks and embeds them for GraphRAG; each chunk
 * retains a source citation.
 */
@ApiTags('admin')
@ApiBearerAuth()
@Roles(Role.admin)
@Controller('admin/kb/documents')
export class AdminKbController {
  constructor(private readonly kb: AdminKbService) {}

  @Post()
  @ApiOperation({
    summary: 'Upload a reference doc; server chunks + embeds it.',
  })
  @ApiCreatedResponse({ type: KbUploadResponseDto })
  upload(
    @CurrentAgent() admin: AuthenticatedAgent,
    @Body() dto: UploadDocumentDto,
  ) {
    return this.kb.upload(dto, admin.id);
  }

  @Post('file')
  @ApiOperation({
    summary:
      'Upload a reference file (PDF or text); server extracts, chunks + embeds it.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file', 'title', 'source'],
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'PDF or text file (.pdf, .txt, .md, .csv).',
        },
        title: { type: 'string' },
        source: { type: 'string' },
        enterprise: { type: 'string', enum: ['dairy', 'sugarcane'] },
      },
    },
  })
  @ApiCreatedResponse({ type: KbUploadResponseDto })
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: MAX_UPLOAD_BYTES } }),
  )
  uploadFile(
    @CurrentAgent() admin: AuthenticatedAgent,
    @UploadedFile() file: Express.Multer.File,
    @Body() meta: UploadDocumentFileDto,
  ) {
    if (!file) {
      throw new BadRequestException(
        'No file uploaded. Attach a PDF or text file under the "file" field.',
      );
    }
    return this.kb.uploadFile(file, meta, admin.id);
  }

  @Get()
  @ApiOperation({ summary: 'List uploaded documents with chunk counts.' })
  @ApiOkResponse({ type: KbDocumentDto, isArray: true })
  list() {
    return this.kb.list();
  }

  @Get(':id/chunks')
  @ApiOperation({ summary: 'List the chunks created for a document.' })
  @ApiOkResponse({ type: KbChunkDto, isArray: true })
  chunks(@Param('id') id: string) {
    return this.kb.chunks(id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a document and its chunks.' })
  @ApiOkResponse({ type: KbDeleteResponseDto })
  @ApiNotFoundResponse({ description: 'Document not found' })
  remove(@Param('id') id: string) {
    return this.kb.remove(id);
  }
}
