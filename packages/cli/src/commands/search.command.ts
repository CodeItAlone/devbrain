import { join } from 'node:path';
import {
  CommandContext,
  ValidationError,
  DEVBRAIN_DIR_NAME,
  CONFIG_FILE_NAME,
} from '@devbrain/shared';
import {
  SQLiteVectorStore,
  TransformersProvider,
  RankingEngine,
  SemanticRetriever,
  HistoryManager
} from '@devbrain/core';
import { CommandPipeline } from '../pipeline/command.pipeline.js';
import chalk from 'chalk';

interface SearchArgs {
  query: string;
  top?: number;
}

export class SearchCommand extends CommandPipeline<SearchArgs> {
  protected async validate(context: CommandContext, _args: SearchArgs): Promise<void> {
    const configPath = join(context.cwd, DEVBRAIN_DIR_NAME, CONFIG_FILE_NAME);
    if (!(await this.fsService.exists(configPath))) {
      throw new ValidationError(
        'DevBrain is not initialized.',
        'Configuration file config.json not found.',
        'Run "devbrain init" before executing "devbrain search".',
      );
    }
  }

  protected async createContext(_context: CommandContext, _args: SearchArgs): Promise<void> {
    // No-op
  }

  protected async executeService(context: CommandContext, args: SearchArgs): Promise<any[]> {
    const dbPath = join(context.cwd, DEVBRAIN_DIR_NAME, 'vectors.db');
    if (!(await this.fsService.exists(dbPath))) {
      throw new ValidationError(
        'Vector database not found.',
        'No vectors.db file present in .devbrain.',
        'Please run "devbrain learn" to scan your repository and initialize the vector store.'
      );
    }

    const vectorStore = new SQLiteVectorStore(dbPath);
    try {
      const embeddingProvider = new TransformersProvider();
      const rankingEngine = new RankingEngine(context.config!);
      const retriever = new SemanticRetriever(vectorStore, embeddingProvider, rankingEngine, context.config!);

      // Retrieve recent commits from history
      let recentCommits: any[] = [];
      try {
        const historyManager = new HistoryManager(context.cwd, this.fsService);
        const history = await historyManager.loadHistory();
        if (history && history.commits) {
          recentCommits = history.commits.map(c => ({ hash: c.commitHash, message: c.commitMessage }));
        }
      } catch {}

      const topK = args.top ?? context.config?.semanticSearch?.topK ?? 8;
      return await retriever.searchRelevantMemories(args.query, topK, recentCommits);
    } finally {
      vectorStore.close();
    }
  }

  protected async writeOutput(
    _context: CommandContext,
    output: any[],
    args: SearchArgs,
  ): Promise<void> {
    console.log(chalk.bold(`\nDevBrain Semantic Search Results for: "${chalk.cyan(args.query)}"\n`));

    if (output.length === 0) {
      console.log(chalk.yellow('No matching memories found.'));
      return;
    }

    for (let i = 0; i < output.length; i++) {
      const match = output[i];
      const chunk = match.chunk;
      let meta: any = {};
      try {
        meta = JSON.parse(chunk.metadata);
      } catch {}
      const similarity = meta.similarity !== undefined ? meta.similarity : 0.0;

      let parentTitle = 'General';
      if (match.parentSection) {
        try {
          const parentMeta = JSON.parse(match.parentSection.metadata);
          parentTitle = parentMeta.title || 'General';
        } catch {}
      } else {
        parentTitle = meta.sectionTitle || meta.title || 'General';
      }

      console.log(
        `${chalk.green(`[#${i + 1}]`)} ${chalk.bold(parentTitle)}`
      );
      console.log(`  Similarity: ${similarity.toFixed(4)} (Score: ${match.score.toFixed(4)})`);
      console.log(`  Type: ${chunk.level}`);
      console.log(`  Source: ${chunk.memoryId}`);
      
      if (chunk.level === 'bullet') {
        console.log(`  Matched Concept: ${chalk.white(chunk.text)}`);
      } else {
        const snippet = chunk.text.split('\n').slice(0, 3).map((l: string) => `    ${l}`).join('\n');
        console.log(`  Matched Concept:\n${chalk.dim(snippet)}`);
        if (chunk.text.split('\n').length > 3) {
          console.log(chalk.dim('    ...'));
        }
      }
      console.log();
    }
  }

  protected async reportResult(
    _context: CommandContext,
    output: any[],
    _args: SearchArgs,
  ): Promise<void> {
    this.logger.debug(`Displayed ${output.length} semantic search matches.`);
  }
}
