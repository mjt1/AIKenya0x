import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { v4 as uuid } from 'uuid';
import pdf from 'pdf-parse';
import {
  KnowledgeRepository,
  type ChunkInput,
} from '../../repository/knowledge.repository';
import { AiClientService } from '../../ai-client/ai-client.service';
import type { UploadDocumentDto } from './upload-document.dto';
import type { UploadDocumentFileDto } from './upload-document-file.dto';

const CHUNK_SIZE = 800;
const CHUNK_OVERLAP = 120;
/** Mirror of UploadDocumentDto's @MinLength(20) — reject near-empty extracts. */
const MIN_TEXT_LENGTH = 20;

/**
 * Structural shape of an uploaded file we care about. Matches
 * `Express.Multer.File` (buffer + mimetype + originalname) so the controller
 * can pass a multer file straight through, while keeping this service free of
 * an Express type dependency.
 */
export interface UploadedDocFile {
  buffer: Buffer;
  mimetype: string;
  originalname: string;
}

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

  /**
   * US-18 — ingest an uploaded file. Extracts text (PDF via pdf-parse, or
   * utf-8 for plain-text formats) then defers to {@link upload} for the
   * chunk + embed pipeline. Lets admins feed a 100-page manual without
   * pasting it.
   */
  async uploadFile(
    file: UploadedDocFile,
    meta: UploadDocumentFileDto,
    uploadedBy: string,
  ) {
    let text: string;
    try {
      text = await extractText(file);
    } catch {
      throw new BadRequestException(
        'Could not read that file. Upload a text-based PDF, .txt, .md, or .csv \u2014 scanned/image PDFs are not supported.',
      );
    }

    if (text.length < MIN_TEXT_LENGTH) {
      throw new BadRequestException(
        'Extracted too little text from the file (a scanned or image-only PDF?). Paste the text instead, or upload a text-based file.',
      );
    }

    return this.upload(
      {
        title: meta.title,
        source: meta.source,
        text,
        enterprise: meta.enterprise,
      },
      uploadedBy,
    );
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

/** Pull plain text out of an uploaded file. PDF -> pdf-parse, else utf-8. */
async function extractText(file: UploadedDocFile): Promise<string> {
  const name = (file.originalname ?? '').toLowerCase();
  const isPdf = file.mimetype === 'application/pdf' || name.endsWith('.pdf');
  if (isPdf) {
    const parsed = await pdf(file.buffer);
    return (parsed.text ?? '').trim();
  }
  return file.buffer.toString('utf-8').trim();
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
