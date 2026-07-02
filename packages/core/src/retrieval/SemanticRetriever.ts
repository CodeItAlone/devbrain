import { VectorStore, VectorChunk } from '../index/VectorStore.js';
import { EmbeddingProvider } from '../embeddings/EmbeddingProvider.js';
import { RankingEngine, GitCommitInfo } from './RankingEngine.js';

import { DevBrainConfig } from '@devbrain/shared';

export interface RetrievedMemory {
  chunk: VectorChunk;
  score: number;
  parentSection: VectorChunk | null;
}

export class SemanticRetriever {
  constructor(
    private readonly vectorStore: VectorStore,
    private readonly embeddingProvider: EmbeddingProvider,
    private readonly rankingEngine: RankingEngine,
    private readonly config?: DevBrainConfig
  ) {}

  async searchRelevantMemories(
    query: string,
    topK: number = 8,
    recentCommits: GitCommitInfo[] = []
  ): Promise<RetrievedMemory[]> {
    this.vectorStore.initialize();

    // 1. Generate query embedding
    const queryEmbedding = await this.embeddingProvider.generateEmbedding(query);

    // 2. Perform cosine similarity search
    const matches = await this.vectorStore.search(queryEmbedding);

    // 3. Filter by minSimilarity and compute composite score rankings
    const minSimilarity = this.config?.semanticSearch?.minSimilarity ?? 0.30;
    const scoredMatches: RetrievedMemory[] = [];
    
    for (const chunk of matches) {
      let meta: any = {};
      try {
        meta = JSON.parse(chunk.metadata);
      } catch {}

      const similarity = meta.similarity !== undefined ? meta.similarity : 0.0;
      if (similarity < minSimilarity) {
        continue;
      }

      const score = this.rankingEngine.calculateScore(chunk, recentCommits);
      
      let parentSection: VectorChunk | null = null;
      if (chunk.level === 'bullet' && chunk.parentId) {
        parentSection = await this.vectorStore.getChunkById(chunk.parentId);
      }

      scoredMatches.push({
        chunk,
        score,
        parentSection
      });
    }

    // 4. Sort by the calculated final ranking score
    scoredMatches.sort((a, b) => b.score - a.score);

    // 5. Return topK results
    return scoredMatches.slice(0, topK);
  }
}
