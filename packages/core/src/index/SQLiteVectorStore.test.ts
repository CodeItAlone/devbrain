import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { SQLiteVectorStore } from './SQLiteVectorStore.js';
import { VectorChunk } from './VectorStore.js';

describe('SQLiteVectorStore', () => {
  let tempDir: string;
  let dbPath: string;
  let store: SQLiteVectorStore;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'devbrain-vector-db-'));
    dbPath = join(tempDir, 'vectors.db');
    store = new SQLiteVectorStore(dbPath);
  });

  afterEach(async () => {
    store.close();
    await rm(tempDir, { recursive: true, force: true });
  });

  it('should initialize and write chunks, then search successfully', async () => {
    store.initialize();

    const chunk1: VectorChunk = {
      id: 'chunk-1',
      memoryId: 'test.md',
      parentId: null,
      level: 'section',
      text: 'Authentication uses JWT stored in cookies',
      textHash: 'hash-1',
      embedding: [1, 0, 0],
      metadata: JSON.stringify({ title: 'Authentication' })
    };

    const chunk2: VectorChunk = {
      id: 'chunk-2',
      memoryId: 'test.md',
      parentId: 'chunk-1',
      level: 'bullet',
      text: 'JWT cookies are HttpOnly',
      textHash: 'hash-2',
      embedding: [0, 1, 0],
      metadata: JSON.stringify({ sectionTitle: 'Authentication' })
    };

    await store.upsertChunks([chunk1, chunk2]);

    // Check getting chunks by hash
    const hashes = await store.getChunksByHash(['chunk-1', 'chunk-2', 'chunk-nonexistent']);
    expect(hashes.get('chunk-1')).toBe('hash-1');
    expect(hashes.get('chunk-2')).toBe('hash-2');
    expect(hashes.has('chunk-nonexistent')).toBe(false);

    // Get all chunks for a file
    const all = await store.getAllChunksForMemory('test.md');
    expect(all.length).toBe(2);
    expect(all.find(c => c.id === 'chunk-1')?.textHash).toBe('hash-1');

    // Test Search Similarity
    const query = [1, 0, 0];
    const results = await store.search(query);
    expect(results.length).toBe(2);
    expect(results[0].id).toBe('chunk-1');
    
    // Check get chunk by id
    const c1 = await store.getChunkById('chunk-1');
    expect(c1).not.toBeNull();
    expect(c1?.text).toBe(chunk1.text);

    // Test Delete
    await store.deleteChunks(['chunk-1']);
    const afterDelete = await store.getAllChunksForMemory('test.md');
    expect(afterDelete.length).toBe(1);
    expect(afterDelete[0].id).toBe('chunk-2');
  });
});
