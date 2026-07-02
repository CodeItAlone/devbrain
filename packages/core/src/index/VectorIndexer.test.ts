import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { VectorIndexer } from './VectorIndexer.js';
import { SQLiteVectorStore } from './SQLiteVectorStore.js';
import { EmbeddingProvider } from '../embeddings/EmbeddingProvider.js';

class MockEmbeddingProvider implements EmbeddingProvider {
  async generateEmbedding(text: string): Promise<number[]> {
    return [0.1, 0.2, 0.3];
  }
  async generateEmbeddings(texts: string[]): Promise<number[][]> {
    return texts.map(() => [0.1, 0.2, 0.3]);
  }
}

describe('VectorIndexer', () => {
  let tempDir: string;
  let markdownPath: string;
  let dbPath: string;
  let store: SQLiteVectorStore;
  let indexer: VectorIndexer;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'devbrain-indexer-test-'));
    markdownPath = join(tempDir, 'test.md');
    dbPath = join(tempDir, 'vectors.db');
    
    store = new SQLiteVectorStore(dbPath);
    const mockEmbed = new MockEmbeddingProvider();
    indexer = new VectorIndexer(store, mockEmbed);
  });

  afterEach(async () => {
    store.close();
    await rm(tempDir, { recursive: true, force: true });
  });

  it('should parse markdown file into hierarchical chunks', async () => {
    const mdContent = [
      '# Project Memory',
      '',
      '## Tech Stack',
      '- Node.js',
      '- TypeScript',
      '',
      '## Authentication',
      'This project uses JWT token credentials.',
      '- Cookies are HttpOnly.',
    ].join('\n');

    await writeFile(markdownPath, mdContent, 'utf-8');

    const chunks = indexer.parseMarkdown(markdownPath, 'test.md');
    
    expect(chunks.length).toBeGreaterThan(4);

    const sections = chunks.filter(c => c.level === 'section');
    const bullets = chunks.filter(c => c.level === 'bullet');

    expect(sections.some(s => s.metadata.title.includes('Tech Stack'))).toBe(true);
    expect(sections.some(s => s.metadata.title.includes('Authentication'))).toBe(true);

    expect(bullets.some(b => b.text.includes('Node.js'))).toBe(true);
    expect(bullets.some(b => b.text.includes('Cookies are HttpOnly'))).toBe(true);
    
    // Test indexing
    await indexer.indexMemory(markdownPath, 'test.md');
    
    const dbChunks = await store.getAllChunksForMemory('test.md');
    expect(dbChunks.length).toBe(chunks.length);
  });

  it('should index all Markdown files in a directory hierarchy', async () => {
    const memoryDir = join(tempDir, 'memory');
    const { mkdir, writeFile } = await import('node:fs/promises');
    await mkdir(memoryDir, { recursive: true });

    await writeFile(join(memoryDir, 'architecture.md'), '## System Architecture\n- Monorepo design.', 'utf-8');
    await writeFile(join(memoryDir, 'stack.md'), '## Tech Stack\n- TypeScript\n- Node.js.', 'utf-8');

    await indexer.indexMemory(join(memoryDir, 'architecture.md'), 'memory/architecture.md');
    await indexer.indexMemory(join(memoryDir, 'stack.md'), 'memory/stack.md');

    const dbChunks = await store.getAllChunksForMemory('memory/architecture.md');
    expect(dbChunks.length).toBeGreaterThan(0);

    const dbChunks2 = await store.getAllChunksForMemory('memory/stack.md');
    expect(dbChunks2.length).toBeGreaterThan(0);
  });
});
