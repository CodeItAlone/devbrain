import { describe, it, expect } from 'vitest';
import { RankingEngine } from './RankingEngine.js';
import { VectorChunk } from '../index/VectorStore.js';
import { DevBrainConfig } from '@devbrain/shared';

describe('RankingEngine', () => {
  const mockConfig: DevBrainConfig = {
    version: '0.2.0',
    project: { name: 'Test' },
    scanner: { ignore: [], followSymlinks: false, respectGitignore: true },
    memory: { format: 'markdown', directory: 'memory' },
    semanticSearch: {
      topK: 5,
      weights: { semantic: 0.7, recency: 0.15, importance: 0.1, gitFrequency: 0.05 },
      boosts: {
        pinned: 1.8,
        authentication: 1.25,
        database: 1.15
      }
    }
  };

  it('should score authentication sections and pinned bullets correctly', () => {
    const engine = new RankingEngine(mockConfig);

    const chunk1: VectorChunk = {
      id: 'c1',
      memoryId: 'test.md',
      parentId: null,
      level: 'section',
      text: 'Authentication protocols',
      textHash: 'h1',
      embedding: [],
      metadata: JSON.stringify({ title: 'Authentication', similarity: 0.8 })
    };

    const chunk2: VectorChunk = {
      id: 'c2',
      memoryId: 'test.md',
      parentId: 'c1',
      level: 'bullet',
      text: 'JWT cookies are HttpOnly',
      textHash: 'h2',
      embedding: [],
      metadata: JSON.stringify({ sectionTitle: 'Authentication', similarity: 0.8, pinned: true })
    };

    const score1 = engine.calculateScore(chunk1);
    const score2 = engine.calculateScore(chunk2);

    expect(score1).toBe(1.00);
    expect(score2).toBe(1.80);
  });
});
