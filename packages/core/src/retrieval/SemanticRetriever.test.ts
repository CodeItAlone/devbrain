import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { SQLiteVectorStore } from '../index/SQLiteVectorStore.js';
import { SemanticRetriever } from './SemanticRetriever.js';
import { ContextBuilder } from './ContextBuilder.js';
import { RankingEngine } from './RankingEngine.js';
import { EmbeddingProvider } from '../embeddings/EmbeddingProvider.js';
import { VectorChunk } from '../index/VectorStore.js';

class MockEmbeddingProvider implements EmbeddingProvider {
  async generateEmbedding(text: string): Promise<number[]> {
    return [1, 0, 0];
  }
  async generateEmbeddings(texts: string[]): Promise<number[][]> {
    return texts.map(() => [1, 0, 0]);
  }
}

describe('SemanticRetriever & ContextBuilder', () => {
  let tempDir: string;
  let dbPath: string;
  let store: SQLiteVectorStore;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'devbrain-retriever-test-'));
    dbPath = join(tempDir, 'vectors.db');
    store = new SQLiteVectorStore(dbPath);
  });

  afterEach(async () => {
    store.close();
    await rm(tempDir, { recursive: true, force: true });
  });

  it('should retrieve relevant memories and build prompt context correctly', async () => {
    store.initialize();

    const parentSection: VectorChunk = {
      id: 'section-auth',
      memoryId: 'PROJECT_MEMORY.md',
      parentId: null,
      level: 'section',
      text: '## Authentication\nAuthentication uses JWT stored in cookies.',
      textHash: 'h-sec',
      embedding: [1, 0, 0],
      metadata: JSON.stringify({ title: 'Authentication' })
    };

    const bullet1: VectorChunk = {
      id: 'bullet-jwt',
      memoryId: 'PROJECT_MEMORY.md',
      parentId: 'section-auth',
      level: 'bullet',
      text: 'JWT cookies are stored locally.',
      textHash: 'h-b1',
      embedding: [1, 0, 0],
      metadata: JSON.stringify({ sectionTitle: 'Authentication' })
    };

    await store.upsertChunks([parentSection, bullet1]);

    const mockEmbed = new MockEmbeddingProvider();
    const rankingEngine = new RankingEngine({
      version: '0.2.0',
      project: { name: 'Test' },
      scanner: { ignore: [], followSymlinks: false, respectGitignore: true },
      memory: { format: 'markdown', directory: 'memory' }
    });
    
    const retriever = new SemanticRetriever(store, mockEmbed, rankingEngine);
    const builder = new ContextBuilder();

    const results = await retriever.searchRelevantMemories('how does login work', 2);
    expect(results.length).toBe(2);
    
    const contextText = builder.buildContext('how does login work', results);
    expect(contextText).toContain('# DEVBRAIN AI CONTEXT (SEMANTIC SEARCH)');
    expect(contextText).toContain('Query: "how does login work"');
    expect(contextText).toContain('JWT cookies are stored locally.');
  });
});
