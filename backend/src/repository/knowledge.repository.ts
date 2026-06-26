import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { Neo4jService } from '../neo4j/neo4j.service';
import { EMBEDDING_DIM } from '../ai-client/ai-client.service';

export interface KnowledgeDocumentRow {
  id: string;
  title: string;
  source: string;
  enterprise: string | null;
  chunkCount: number;
  createdAt: string | null;
}

export interface ManualChunkRow {
  id: string;
  text: string;
  source: string;
  title: string | null;
  enterprise: string | null;
  ordinal: number;
}

export interface ManualChunkHit extends ManualChunkRow {
  score: number;
}

export interface ChunkInput {
  id: string;
  text: string;
  embedding: number[];
  ordinal: number;
}

/**
 * Clamp a vector-search score into [0,1]. Neo4j normalises cosine scores to
 * that range, but floating-point can nudge an exact match a hair past 1.0,
 * and the AI service rejects similarity_score > 1 (Pydantic le=1.0).
 */
function clampScore(value: unknown): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

@Injectable()
export class KnowledgeRepository implements OnApplicationBootstrap {
  private readonly logger = new Logger(KnowledgeRepository.name);
  constructor(private readonly neo4j: Neo4jService) {}

  async onApplicationBootstrap() {
    // Best-effort vector index — Aura / Neo4j 5+. Don't crash boot if the
    // server is older or vector support is disabled.
    try {
      await this.neo4j.write(
        `CREATE VECTOR INDEX manual_chunk_embedding IF NOT EXISTS
         FOR (m:ManualChunk) ON (m.embedding)
         OPTIONS { indexConfig: {
           \`vector.dimensions\`: ${EMBEDDING_DIM},
           \`vector.similarity_function\`: 'cosine'
         } }`,
      );
      await this.neo4j.write(
        `CREATE CONSTRAINT knowledge_document_id_unique IF NOT EXISTS
         FOR (d:KnowledgeDocument) REQUIRE d.id IS UNIQUE`,
      );
      await this.neo4j.write(
        `CREATE CONSTRAINT manual_chunk_id_unique IF NOT EXISTS
         FOR (m:ManualChunk) REQUIRE m.id IS UNIQUE`,
      );
    } catch (err) {
      this.logger.warn(
        `Knowledge index/constraint bootstrap skipped: ${(err as Error).message}`,
      );
    }
  }

  async createDocument(doc: {
    id: string;
    title: string;
    source: string;
    enterprise: string | null;
    uploadedBy: string;
  }) {
    await this.neo4j.write(
      `MERGE (d:KnowledgeDocument {id: $id})
       ON CREATE SET d.title = $title, d.source = $source,
                     d.enterprise = $enterprise,
                     d.uploadedBy = $uploadedBy,
                     d.createdAt = datetime()
       ON MATCH SET  d.title = $title, d.source = $source,
                     d.enterprise = $enterprise,
                     d.updatedAt = datetime()`,
      doc,
    );
  }

  async appendChunks(documentId: string, chunks: ChunkInput[]) {
    if (chunks.length === 0) return;
    await this.neo4j.write(
      `MATCH (d:KnowledgeDocument {id: $documentId})
       UNWIND $chunks AS c
       MERGE (m:ManualChunk {id: c.id})
       SET m.text = c.text,
           m.embedding = c.embedding,
           m.ordinal = c.ordinal,
           m.source = d.source,
           m.title = d.title,
           m.enterprise = d.enterprise,
           m.updatedAt = datetime()
       MERGE (m)-[:CHUNK_OF]->(d)`,
      { documentId, chunks },
    );
  }

  async listDocuments(): Promise<KnowledgeDocumentRow[]> {
    const records = await this.neo4j.read(
      `MATCH (d:KnowledgeDocument)
       OPTIONAL MATCH (m:ManualChunk)-[:CHUNK_OF]->(d)
       WITH d, count(m) AS chunkCount
       RETURN d, chunkCount
       ORDER BY d.createdAt DESC`,
    );
    return records.map((r) => {
      const d = r.get('d').properties as Record<string, unknown>;
      return {
        id: String(d.id),
        title: String(d.title ?? ''),
        source: String(d.source ?? ''),
        enterprise: (d.enterprise as string) ?? null,
        chunkCount: Number(r.get('chunkCount')),
        createdAt: d.createdAt ? String(d.createdAt) : null,
      };
    });
  }

  async listChunks(documentId: string): Promise<ManualChunkRow[]> {
    const records = await this.neo4j.read(
      `MATCH (m:ManualChunk)-[:CHUNK_OF]->(:KnowledgeDocument {id: $documentId})
       RETURN m ORDER BY m.ordinal ASC`,
      { documentId },
    );
    return records.map((r) => this.chunkFrom(r.get('m').properties));
  }

  async deleteDocument(documentId: string): Promise<number> {
    const records = await this.neo4j.write(
      `MATCH (d:KnowledgeDocument {id: $documentId})
       OPTIONAL MATCH (m:ManualChunk)-[:CHUNK_OF]->(d)
       WITH d, collect(m) AS chunks, count(m) AS n
       FOREACH (m IN chunks | DETACH DELETE m)
       DETACH DELETE d
       RETURN n`,
      { documentId },
    );
    return records.length === 0 ? 0 : Number(records[0].get('n'));
  }

  async vectorSearch(
    query: number[],
    k: number,
    enterprise: string | null = null,
  ): Promise<ManualChunkHit[]> {
    // NOTE: the Neo4j driver serialises JS numbers as Float, but
    // db.index.vector.queryNodes and LIMIT require an INTEGER — so every use of
    // $k is wrapped in toInteger() to avoid "Expected INTEGER, but was FLOAT".
    try {
      const records = await this.neo4j.read(
        `CALL db.index.vector.queryNodes('manual_chunk_embedding', toInteger($k), $query)
         YIELD node, score
         WHERE $enterprise IS NULL OR node.enterprise = $enterprise OR node.enterprise IS NULL
         RETURN node AS m, score
         ORDER BY score DESC
         LIMIT toInteger($k)`,
        { query, k, enterprise },
      );
      return records.map((r) => ({
        ...this.chunkFrom(r.get('m').properties),
        score: clampScore(r.get('score')),
      }));
    } catch (err) {
      this.logger.warn(
        `Vector search unavailable (${(err as Error).message}); falling back to recent chunks.`,
      );
      const records = await this.neo4j.read(
        `MATCH (m:ManualChunk)
         WHERE $enterprise IS NULL OR m.enterprise = $enterprise OR m.enterprise IS NULL
         RETURN m ORDER BY m.updatedAt DESC LIMIT toInteger($k)`,
        { k, enterprise },
      );
      return records.map((r) => ({
        ...this.chunkFrom(r.get('m').properties),
        score: 0,
      }));
    }
  }

  private chunkFrom(props: Record<string, unknown>): ManualChunkRow {
    return {
      id: String(props.id),
      text: String(props.text ?? ''),
      source: String(props.source ?? ''),
      title: (props.title as string) ?? null,
      enterprise: (props.enterprise as string) ?? null,
      ordinal: Number(props.ordinal ?? 0),
    };
  }
}
