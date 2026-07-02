import { join } from 'node:path';
import {
  CommandContext,
  ValidationError,
  DEVBRAIN_DIR_NAME,
  CONFIG_FILE_NAME,
} from '@devbrain/shared';
import { ContextService } from '@devbrain/core';
import { CommandPipeline } from '../pipeline/command.pipeline.js';

interface ContextArgs {
  raw?: boolean;
  query?: string;
}

/**
 * Command pipeline for "devbrain context".
 */
export class ContextCommand extends CommandPipeline<ContextArgs> {
  protected async validate(context: CommandContext, _args: ContextArgs): Promise<void> {
    const configPath = join(context.cwd, DEVBRAIN_DIR_NAME, CONFIG_FILE_NAME);
    if (!(await this.fsService.exists(configPath))) {
      throw new ValidationError(
        'DevBrain is not initialized.',
        'Configuration file config.json not found.',
        'Run "devbrain init" before executing "devbrain context".',
      );
    }
  }

  protected async createContext(_context: CommandContext, _args: ContextArgs): Promise<void> {
    // No-op: context built from memory files
  }

  protected async executeService(context: CommandContext, args: ContextArgs): Promise<string> {
    if (args.query) {
      const dbPath = join(context.cwd, DEVBRAIN_DIR_NAME, 'vectors.db');
      
      // Fallback if vectors.db doesn't exist yet
      if (!(await this.fsService.exists(dbPath))) {
        this.logger.warn('Vector store database not found. Returning full repository context. Run "devbrain learn" to initialize the vector database.');
        const memoryDir = join(context.cwd, context.config!.memory.directory);
        const contextService = new ContextService(this.fsService);
        return await contextService.buildContext(memoryDir);
      }

      // Initialize retriever components
      const { SQLiteVectorStore, TransformersProvider, RankingEngine, SemanticRetriever, ContextBuilder } = await import('@devbrain/core');
      const vectorStore = new SQLiteVectorStore(dbPath);
      try {
        const embeddingProvider = new TransformersProvider();
        const rankingEngine = new RankingEngine(context.config!);
        const retriever = new SemanticRetriever(vectorStore, embeddingProvider, rankingEngine, context.config!);
        const contextBuilder = new ContextBuilder();

        // Retrieve recent commits from history
        let recentCommits: any[] = [];
        try {
          const { HistoryManager } = await import('@devbrain/core');
          const historyManager = new HistoryManager(context.cwd, this.fsService);
          const history = await historyManager.loadHistory();
          if (history && history.commits) {
            recentCommits = history.commits.map(c => ({ hash: c.commitHash, message: c.commitMessage }));
          }
        } catch {}

        const topK = context.config?.semanticSearch?.topK ?? 8;
        const results = await retriever.searchRelevantMemories(args.query, topK, recentCommits);
        
        return contextBuilder.buildContext(args.query, results);
      } finally {
        vectorStore.close();
      }
    } else {
      const memoryDir = join(context.cwd, context.config!.memory.directory);
      const contextService = new ContextService(this.fsService);
      return await contextService.buildContext(memoryDir);
    }
  }

  protected async writeOutput(
    _context: CommandContext,
    output: string,
    _args: ContextArgs,
  ): Promise<void> {
    // Output prompt directly to stdout so it can be piped or copied
    console.log(output);
  }

  protected async reportResult(
    _context: CommandContext,
    output: string,
    args: ContextArgs,
  ): Promise<void> {
    if (!args.raw) {
      const lineCount = output.split('\n').length;
      const charCount = output.length;
      const approximateTokens = Math.ceil(charCount / 4);

      this.logger.debug(
        `Consolidated AI Context Details: ${lineCount} lines, ${charCount} chars, ~${approximateTokens} tokens.`,
      );
    }
  }
}
