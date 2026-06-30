import { join } from 'node:path';
import {
  CommandContext,
  ValidationError,
  DEVBRAIN_DIR_NAME,
  CONFIG_FILE_NAME,
  CommitHistoryEntry,
} from '@devbrain/shared';
import {
  GitService,
  LockManager,
  LoggerService,
  HistoryManager,
  DependencyResolver,
  MemoryEngine,
  MemoryService,
  ContextService,
  RepositoryScanner,
} from '@devbrain/core';
import { CommandPipeline } from '../pipeline/command.pipeline.js';
import ora from 'ora';

interface LearnArgs {
  force?: boolean;
  silent?: boolean;
  respectGitignore?: boolean;
}

/**
 * Command pipeline for "devbrain learn".
 */
export class LearnCommand extends CommandPipeline<LearnArgs> {
  private lockManager!: LockManager;
  private loggerService!: LoggerService;
  private gitService!: GitService;
  private historyManager!: HistoryManager;
  private memoryEngine!: MemoryEngine;
  private memoryService!: MemoryService;
  private contextService!: ContextService;
  private stats = {
    strategy: 'full',
    filesCount: 0,
    commitMessage: '',
    commitHash: '',
  };

  protected async validate(context: CommandContext, _args: LearnArgs): Promise<void> {
    const configPath = join(context.cwd, DEVBRAIN_DIR_NAME, CONFIG_FILE_NAME);
    if (!(await this.fsService.exists(configPath))) {
      throw new ValidationError(
        'DevBrain is not initialized in this repository.',
        'Configuration file config.json not found.',
        'Run "devbrain init" before executing "devbrain learn".',
      );
    }
  }

  protected async createContext(context: CommandContext, _args: LearnArgs): Promise<void> {
    this.lockManager = new LockManager(context.cwd, this.fsService);
    this.loggerService = new LoggerService(context.cwd, this.fsService);
    this.gitService = new GitService(context.cwd, this.fsService);
    this.historyManager = new HistoryManager(context.cwd, this.fsService);
    this.memoryEngine = new MemoryEngine(context.cwd, context.config!, this.fsService);
    this.memoryService = new MemoryService(this.fsService);
    this.contextService = new ContextService(this.fsService);
  }

  async execute(cwd: string, debug: boolean, args: LearnArgs): Promise<void> {
    // Override execute method to gracefully handle lock and hook errors without throwing
    const isSilent = !!args.silent;
    try {
      await super.execute(cwd, debug, args);
    } catch (error: any) {
      // Log errors in silent hook mode instead of exiting with 1
      const logService = new LoggerService(cwd, this.fsService);
      await logService.error(`Execution error: ${error.message || error}`, 'git-hook.log');

      if (isSilent) {
        console.error(`DevBrain Hook error logged: ${error.message || error}`);
        process.exit(0); // Never interrupt Git commit!
      } else {
        this.handleError(error, debug);
        process.exit(1);
      }
    }
  }

  protected async executeService(context: CommandContext, args: LearnArgs): Promise<any> {
    const isSilent = !!args.silent;
    const forceFull = !!args.force;

    // 1. Acquire Lock
    const acquired = await this.lockManager.acquireLock();
    if (!acquired) {
      const msg = 'Another learning process is currently active or lock file exists.';
      await this.loggerService.warn(msg, isSilent ? 'git-hook.log' : 'devbrain.log');
      if (isSilent) {
        return { skipped: true, reason: 'locked' };
      }
      throw new Error(msg + ' Ensure no other devbrain command is running, or remove .devbrain/.lock manually.');
    }

    const spinner = isSilent ? null : ora('DevBrain is updating project memory...').start();

    try {
      // 2. Fetch Git Metadata
      const isGitRepo = await this.gitService.isGitRepository();
      const lastCommit = isGitRepo ? await this.historyManager.getLastProcessedCommit() : null;
      const currentCommit = isGitRepo ? await this.gitService.getCurrentCommitHash() : null;

      if (currentCommit) {
        this.stats.commitHash = currentCommit;
        this.stats.commitMessage = await this.gitService.getCommitMessage(currentCommit);
      }

      // Check if memory.json exists
      const memoryExists = await this.fsService.exists(join(context.cwd, DEVBRAIN_DIR_NAME, 'memory.json'));

      let analysis;

      // 3. Determine Incremental vs Full
      if (forceFull || !isGitRepo || !lastCommit || !memoryExists) {
        // Run Full Scan
        this.stats.strategy = 'full';
        if (spinner) spinner.text = 'Scanning entire project (full scan)...';
        analysis = await this.memoryEngine.runFullScan();
      } else {
        // Check if HEAD has actually changed
        if (lastCommit === currentCommit) {
          if (spinner) {
            spinner.succeed('Project memory is already up to date with HEAD commit.');
          }
          await this.lockManager.releaseLock();
          return { skipped: true, reason: 'up-to-date' };
        }

        // Run Incremental Scan
        this.stats.strategy = 'incremental';
        if (spinner) spinner.text = 'Running incremental git-diff analysis...';

        const changes = await this.gitService.getChangedFiles(lastCommit, currentCommit || 'HEAD');
        
        // Scan directory files for context mapping
        const scanner = new RepositoryScanner(this.fsService);
        const allFiles = await scanner.scan(context.cwd, {
          ignore: context.config?.scanner.ignore,
          followSymlinks: context.config?.scanner.followSymlinks,
          respectGitignore: args.respectGitignore ?? context.config?.scanner.respectGitignore,
        });

        const allChanged = [
          ...changes.modified,
          ...changes.deleted,
          ...changes.renamed.map((r: { from: string; to: string }) => r.to),
          ...changes.renamed.map((r: { from: string; to: string }) => r.from),
        ];
        
        // Resolve blast radius dependencies
        const resolver = new DependencyResolver();
        const { resolvedFiles, isFullScan } = resolver.resolveBlastRadius(allChanged, allFiles);

        if (isFullScan) {
          this.stats.strategy = 'full (config change)';
          if (spinner) spinner.text = 'Core config changed: scanning entire project...';
          analysis = await this.memoryEngine.runFullScan();
        } else {
          if (spinner) spinner.text = `Analyzing ${resolvedFiles.length} files in blast radius...`;
          analysis = await this.memoryEngine.incrementalLearn(
            resolvedFiles,
            changes.deleted,
            changes.renamed,
          );
        }
      }

      this.stats.filesCount = analysis.files.length;

      // 4. Update documentation formats if enabled
      const memoryDir = join(context.cwd, context.config!.memory.directory);
      if (context.config!.documentation_generation !== false) {
        if (spinner) spinner.text = 'Regenerating project memory documentation...';
        await this.memoryService.generateMemory(analysis, memoryDir);
      }

      if (context.config!.context_generation !== false) {
        if (spinner) spinner.text = 'Regenerating AI context payload...';
        await this.contextService.generateContext(analysis, memoryDir);
      }

      // 5. Append commit entry to history
      if (isGitRepo && currentCommit) {
        const historyEntry: CommitHistoryEntry = {
          commitHash: currentCommit,
          timestamp: new Date().toISOString(),
          status: 'success',
          filesAnalyzed: this.stats.strategy.startsWith('full') ? ['*'] : [],
          commitMessage: this.stats.commitMessage,
        };
        await this.historyManager.addCommitEntry(historyEntry);
      }

      if (spinner) {
        spinner.succeed(`Successfully learned changes (${this.stats.strategy} scan, ${this.stats.filesCount} files).`);
      }
      await this.loggerService.success(`Completed learning session: ${this.stats.strategy} scan.`, isSilent ? 'git-hook.log' : 'devbrain.log');
    } finally {
      // 6. Release Lock
      await this.lockManager.releaseLock();
    }
  }

  protected async writeOutput(
    _context: CommandContext,
    _output: any,
    _args: LearnArgs,
  ): Promise<void> {
    // Handled in services
  }

  protected async reportResult(
    context: CommandContext,
    output: any,
    args: LearnArgs,
  ): Promise<void> {
    if (args.silent || (output && output.skipped)) return;
    this.logger.success(
      `Documentation and context regenerated at ${join(context.cwd, DEVBRAIN_DIR_NAME)}`,
    );
  }
}
