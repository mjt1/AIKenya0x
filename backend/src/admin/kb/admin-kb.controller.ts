import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { AdminKbService } from './admin-kb.service';
import { UploadDocumentDto } from './upload-document.dto';
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
  @ApiOperation({ summary: 'Upload a reference doc; server chunks + embeds it.' })
  @ApiCreatedResponse({ type: KbUploadResponseDto })
  upload(
    @CurrentAgent() admin: AuthenticatedAgent,
    @Body() dto: UploadDocumentDto,
  ) {
    return this.kb.upload(dto, admin.id);
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
