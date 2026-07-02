import { DatabaseSync } from 'node:sqlite';
import { VectorChunk, VectorStore } from './VectorStore.js';
import path from 'node:path';
import fs from 'node:fs';

export class SQLiteVectorStore implements VectorStore {
  private db: any = null;
  private dbPath: string;

  constructor(dbPath: string) {
    this.dbPath = dbPath;
  }

  initialize(): void {
    if (this.db) return;

    const dir = path.dirname(this.dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    try {
      this.db = new DatabaseSync(this.dbPath);
      
      // Create table
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS memory_vectors (
          id TEXT PRIMARY KEY,
          memory_id TEXT NOT NULL,
          parent_id TEXT,
          level TEXT NOT NULL,
          text TEXT NOT NULL,
          text_hash TEXT NOT NULL,
          embedding BLOB NOT NULL,
          metadata TEXT,
          created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
          updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
        )
      `);

      this.db.exec(`
        CREATE INDEX IF NOT EXISTS idx_memory_vectors_memory_id ON memory_vectors(memory_id)
      `);
    } catch (error: any) {
      throw new Error(`Failed to initialize SQLite vector database at ${this.dbPath}: ${error.message}`);
    }
  }

  private ensureInitialized(): void {
    if (!this.db) {
      this.initialize();
    }
  }

  async upsertChunks(chunks: VectorChunk[]): Promise<void> {
    this.ensureInitialized();
    if (chunks.length === 0) return;

    const insertStmt = this.db.prepare(`
      INSERT OR REPLACE INTO memory_vectors (
        id, memory_id, parent_id, level, text, text_hash, embedding, metadata, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
    `);

    this.db.exec('BEGIN TRANSACTION');
    try {
      for (const chunk of chunks) {
        const floatArray = new Float32Array(chunk.embedding);
        const buffer = Buffer.from(floatArray.buffer, floatArray.byteOffset, floatArray.byteLength);

        insertStmt.run(
          chunk.id,
          chunk.memoryId,
          chunk.parentId,
          chunk.level,
          chunk.text,
          chunk.textHash,
          buffer,
          chunk.metadata
        );
      }
      this.db.exec('COMMIT');
    } catch (error) {
      this.db.exec('ROLLBACK');
      throw error;
    }
  }

  async deleteChunks(ids: string[]): Promise<void> {
    this.ensureInitialized();
    if (ids.length === 0) return;

    const deleteStmt = this.db.prepare(`
      DELETE FROM memory_vectors WHERE id = ?
    `);

    this.db.exec('BEGIN TRANSACTION');
    try {
      for (const id of ids) {
        deleteStmt.run(id);
      }
      this.db.exec('COMMIT');
    } catch (error) {
      this.db.exec('ROLLBACK');
      throw error;
    }
  }

  async getChunksByHash(ids: string[]): Promise<Map<string, string>> {
    this.ensureInitialized();
    const result = new Map<string, string>();
    if (ids.length === 0) return result;

    const queryStmt = this.db.prepare(`
      SELECT text_hash FROM memory_vectors WHERE id = ?
    `);

    for (const id of ids) {
      const row = queryStmt.get(id) as { text_hash: string } | undefined;
      if (row) {
        result.set(id, row.text_hash);
      }
    }

    return result;
  }

  async getAllChunksForMemory(memoryId: string): Promise<{ id: string; textHash: string }[]> {
    this.ensureInitialized();
    const queryStmt = this.db.prepare(`
      SELECT id, text_hash FROM memory_vectors WHERE memory_id = ?
    `);
    const rows = queryStmt.all(memoryId) as { id: string; text_hash: string }[];
    return rows.map(r => ({ id: r.id, textHash: r.text_hash }));
  }

  async search(queryEmbedding: number[]): Promise<VectorChunk[]> {
    this.ensureInitialized();
    
    const queryStmt = this.db.prepare(`
      SELECT id, memory_id, parent_id, level, text, text_hash, embedding, metadata FROM memory_vectors
    `);
    
    const rows = queryStmt.all() as {
      id: string;
      memory_id: string;
      parent_id: string | null;
      level: string;
      text: string;
      text_hash: string;
      embedding: Buffer;
      metadata: string;
    }[];

    const results: (VectorChunk & { similarity: number })[] = [];
    const qLength = queryEmbedding.length;

    for (const row of rows) {
      // Use buffer slicing to construct a perfectly aligned Float32Array
      const buffer = row.embedding;
      const alignedBuffer = buffer.buffer.slice(
        buffer.byteOffset,
        buffer.byteOffset + buffer.byteLength
      );
      const floatArray = new Float32Array(alignedBuffer);
      
      let dotProduct = 0;
      const minLen = Math.min(qLength, floatArray.length);
      for (let i = 0; i < minLen; i++) {
        dotProduct += queryEmbedding[i] * floatArray[i];
      }

      results.push({
        id: row.id,
        memoryId: row.memory_id,
        parentId: row.parent_id,
        level: row.level as 'section' | 'bullet',
        text: row.text,
        textHash: row.text_hash,
        embedding: Array.from(floatArray),
        metadata: row.metadata,
        similarity: dotProduct
      });
    }

    // Sort by similarity descending
    results.sort((a, b) => b.similarity - a.similarity);

    return results.map(r => {
      let metaObj: any = {};
      try {
        metaObj = JSON.parse(r.metadata);
      } catch {}
      metaObj.similarity = r.similarity;
      r.metadata = JSON.stringify(metaObj);
      return r;
    });
  }

  async getChunkById(id: string): Promise<VectorChunk | null> {
    this.ensureInitialized();
    const queryStmt = this.db.prepare(`
      SELECT id, memory_id, parent_id, level, text, text_hash, embedding, metadata FROM memory_vectors WHERE id = ?
    `);
    const row = queryStmt.get(id) as {
      id: string;
      memory_id: string;
      parent_id: string | null;
      level: string;
      text: string;
      text_hash: string;
      embedding: Buffer;
      metadata: string;
    } | undefined;

    if (!row) return null;

    const buffer = row.embedding;
    const alignedBuffer = buffer.buffer.slice(
      buffer.byteOffset,
      buffer.byteOffset + buffer.byteLength
    );
    const floatArray = new Float32Array(alignedBuffer);

    return {
      id: row.id,
      memoryId: row.memory_id,
      parentId: row.parent_id,
      level: row.level as 'section' | 'bullet',
      text: row.text,
      textHash: row.text_hash,
      embedding: Array.from(floatArray),
      metadata: row.metadata
    };
  }

  async clearAll(): Promise<void> {
    this.ensureInitialized();
    this.db.exec(`DELETE FROM memory_vectors`);
  }

  close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }
}
