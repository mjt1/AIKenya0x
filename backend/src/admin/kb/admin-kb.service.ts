import { Injectable, NotFoundException } from '@nestjs/common';
import { v4 as uuid } from 'uuid';
import {
  KnowledgeRepository,
  type ChunkInput,
} from '../../repository/knowledge.repository';
import { AiClientService } from '../../ai-client/ai-client.service';
import type { UploadDocumentDto } from './upload-document.dto';

const CHUNK_SIZE = 800;
const CHUNK_OVERLAP = 120;

@Injectable()
export class AdminKbService {
  constructor(
    private readonly kb: KnowledgeRepository,
    private readonly ai: AiClientService,
  ) {}

  async upload(dto: UploadDocumentDto, uploadedBy: string) {
    const documentId = uuid();
    await this.kb.createDocument({
      id: documentId,
      title: dto.title,
      source: dto.source,
      enterprise: dto.enterprise ?? null,
      uploadedBy,
    });

    const pieces = chunk(dto.text, CHUNK_SIZE, CHUNK_OVERLAP);
    const chunks: ChunkInput[] = [];
    for (let i = 0; i < pieces.length; i++) {
      const text = pieces[i];
      const embedding = await this.ai.embed(text);
      chunks.push({ id: uuid(), text, embedding, ordinal: i });
    }
    await this.kb.appendChunks(documentId, chunks);

    return { id: documentId, chunkCount: chunks.length };
  }

  list() {
    return this.kb.listDocuments();
  }

  chunks(documentId: string) {
    return this.kb.listChunks(documentId);
  }

  async remove(documentId: string) {
    const docs = await this.kb.listDocuments();
    if (!docs.some((d) => d.id === documentId)) {
      throw new NotFoundException('Document not found');
    }
    const removed = await this.kb.deleteDocument(documentId);
    return { id: documentId, deletedChunks: removed };
  }
}

/** Greedy sentence-aware chunker with character overlap. */
function chunk(text: string, size: number, overlap: number): string[] {
  const clean = text.replace(/\r\n?/g, '\n').trim();
  if (clean.length <= size) return [clean];
  const out: string[] = [];
  let start = 0;
  while (start < clean.length) {
    let end = Math.min(start + size, clean.length);
    if (end < clean.length) {
      const slice = clean.slice(start, end);
      const lastBreak = Math.max(
        slice.lastIndexOf('. '),
        slice.lastIndexOf('\n'),
      );
      if (lastBreak > size * 0.5) end = start + lastBreak + 1;
    }
    out.push(clean.slice(start, end).trim());
    if (end >= clean.length) break;
    start = Math.max(end - overlap, start + 1);
  }
  return out.filter((s) => s.length > 0);
}
