import { DevBrainConfig } from '@devbrain/shared';
import { VectorChunk } from '../index/VectorStore.js';

export interface GitCommitInfo {
  hash: string;
  message: string;
}

export const CATEGORY_WEIGHTS: Record<string, number> = {
  authentication: 1.25,
  architecture: 1.20,
  database: 1.15,
  api: 1.20,
  deployment: 1.10,
  features: 1.05,
  rules: 1.05,
  techstack: 1.05,
  patterns: 1.10,
  workflows: 1.05,
  general: 1.00,
  metadata: 0.30
};

export class RankingEngine {
  private config: DevBrainConfig;

  constructor(config: DevBrainConfig) {
    this.config = config;
  }

  getCategory(chunk: VectorChunk): string {
    let meta: any = {};
    try {
      meta = JSON.parse(chunk.metadata);
    } catch {}

    const title = (meta.sectionTitle || meta.title || 'General').toLowerCase();
    const filePath = (meta.filePath || '').toLowerCase();

    if (
      title.includes('folder structure') || 
      title.includes('repository structure') || 
      title.includes('recent changes') ||
      title.includes('commit log') ||
      title.includes('git metrics') ||
      filePath.includes('timeline.md') ||
      title.includes('file inventory')
    ) {
      return 'metadata';
    }

    if (title.includes('auth') || title.includes('login') || title.includes('security') || title.includes('session') || title.includes('oauth') || title.includes('jwt')) {
      return 'authentication';
    }
    if (title.includes('arch') || title.includes('structure') || title.includes('design') || filePath.includes('architecture.md')) {
      return 'architecture';
    }
    if (title.includes('database') || title.includes('db') || title.includes('model') || title.includes('schema') || title.includes('entity')) {
      return 'database';
    }
    if (title.includes('api') || title.includes('route') || title.includes('endpoint') || title.includes('http') || title.includes('controller')) {
      return 'api';
    }
    if (title.includes('deploy') || title.includes('docker') || title.includes('ci') || title.includes('cd') || title.includes('github actions')) {
      return 'deployment';
    }
    if (title.includes('feature') || title.includes('product') || filePath.includes('features.md')) {
      return 'features';
    }
    if (title.includes('rule') || title.includes('convention') || title.includes('standard') || title.includes('style') || filePath.includes('rules.md')) {
      return 'rules';
    }
    if (title.includes('stack') || title.includes('tech') || title.includes('package') || filePath.includes('stack.md')) {
      return 'techstack';
    }
    if (title.includes('pattern') || title.includes('practice')) {
      return 'patterns';
    }
    if (title.includes('workflow') || title.includes('lifecycle')) {
      return 'workflows';
    }

    return 'general';
  }

  calculateScore(chunk: VectorChunk, recentCommits: GitCommitInfo[] = []): number {
    const searchConfig = this.config.semanticSearch || {};
    const configBoosts = searchConfig.boosts || {};

    // 1. Base Semantic similarity
    let meta: any = {};
    try {
      meta = JSON.parse(chunk.metadata);
    } catch {}

    const similarity = meta.similarity !== undefined ? meta.similarity : 0.0;
    const baseScore = Math.max(0.001, similarity);

    // 2. Category Weight
    const category = this.getCategory(chunk);
    let categoryWeight = CATEGORY_WEIGHTS[category] ?? 1.00;
    if (configBoosts[category] !== undefined && typeof configBoosts[category] === 'number') {
      categoryWeight = configBoosts[category];
    }

    // 3. Importance Boost
    let importanceMultiplier = 1.0;
    if (meta.importance && typeof meta.importance === 'number') {
      importanceMultiplier = meta.importance;
    }

    // 4. Pinned Boost
    let pinMultiplier = 1.0;
    if (meta.pinned === true || meta.pinned === 'true') {
      pinMultiplier = configBoosts['pinned'] ?? 1.8;
    }

    // 5. Git Relevance Boost
    let gitFrequencyMultiplier = 1.0;
    if (recentCommits.length > 0) {
      const sectionTitle = (meta.sectionTitle || meta.title || 'General').toLowerCase();
      const words = sectionTitle.split(/\s+/).filter((w: string) => w.length > 3);
      if (words.length > 0) {
        let matchCount = 0;
        for (const commit of recentCommits) {
          const msg = commit.message.toLowerCase();
          if (words.some((word: string) => msg.includes(word))) {
            matchCount++;
          }
        }
        const ratio = matchCount / recentCommits.length;
        const maxGitBoost = 0.25;
        gitFrequencyMultiplier = 1.0 + (ratio * maxGitBoost);
      }
    }

    // 6. Recency Boost
    let recencyMultiplier = 1.0;
    if (meta.recent === true) {
      recencyMultiplier = 1.15;
    }

    // Multiplicative composite score
    const finalScore = baseScore * categoryWeight * importanceMultiplier * pinMultiplier * gitFrequencyMultiplier * recencyMultiplier;
    return parseFloat(finalScore.toFixed(6));
  }
}
