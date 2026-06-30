import { join } from 'node:path';
import { CommandContext, DEVBRAIN_DIR_NAME, CONFIG_FILE_NAME, VERSION_FILE_NAME, VersionSchema } from '@devbrain/shared';
import { GitService, LockManager, HistoryManager } from '@devbrain/core';
import { CommandPipeline } from '../pipeline/command.pipeline.js';
import chalk from 'chalk';

export class StatusCommand extends CommandPipeline {
  private gitService!: GitService;
  private lockManager!: LockManager;
  private historyManager!: HistoryManager;

  protected async validate(context: CommandContext, _args: any): Promise<void> {
    const configPath = join(context.cwd, DEVBRAIN_DIR_NAME, CONFIG_FILE_NAME);
    if (!(await this.fsService.exists(configPath))) {
      throw new Error('DevBrain is not initialized. Run "devbrain init" first.');
    }
  }

  protected async createContext(context: CommandContext, _args: any): Promise<void> {
    this.gitService = new GitService(context.cwd, this.fsService);
    this.lockManager = new LockManager(context.cwd, this.fsService);
    this.historyManager = new HistoryManager(context.cwd, this.fsService);
  }

  protected async executeService(context: CommandContext, _args: any): Promise<any> {
    const isGitRepo = await this.gitService.isGitRepository();
    const isHookInstalled = isGitRepo ? await this.gitService.isHookInstalled('post-commit') : false;
    const isLocked = await this.lockManager.isLocked();

    const versionPath = join(context.cwd, DEVBRAIN_DIR_NAME, VERSION_FILE_NAME);
    let versionInfo: VersionSchema | null = null;
    if (await this.fsService.exists(versionPath)) {
      try {
        versionInfo = await this.fsService.readJson<VersionSchema>(versionPath);
      } catch {
        // Fallback
      }
    }

    const history = await this.historyManager.loadHistory();
    const lastCommit = history.lastProcessedCommit || 'none';

    // Count tracked files in memory.json
    const memoryPath = join(context.cwd, DEVBRAIN_DIR_NAME, 'memory.json');
    let filesCount = 0;
    if (await this.fsService.exists(memoryPath)) {
      try {
        const memoryData = await this.fsService.readJson<any>(memoryPath);
        filesCount = memoryData.files?.length || 0;
      } catch {
        // Ignore
      }
    }

    return {
      isGitRepo,
      isHookInstalled,
      isLocked,
      versionInfo,
      lastCommit,
      filesCount,
      config: context.config,
    };
  }

  protected async writeOutput(_context: CommandContext, _output: any, _args: any): Promise<void> {
    // No-op
  }

  protected async reportResult(context: CommandContext, status: any, _args: any): Promise<void> {
    this.logger.header('DevBrain Status Board');

    console.log(`- Version: ${chalk.green(status.versionInfo?.version || '0.1.0')}`);
    console.log(`- Memory Schema: ${chalk.cyan(status.versionInfo?.memorySchema || '1')}`);
    console.log(`- Last Processed Commit: ${chalk.yellow(status.lastCommit)}`);
    console.log(`- Files Tracked in Memory: ${chalk.blue(status.filesCount)}`);
    console.log('');

    console.log(chalk.bold('Integrations & Processes:'));
    console.log(`- Git Repository: ${status.isGitRepo ? chalk.green('Yes') : chalk.red('No')}`);
    console.log(`- Post-commit Git Hook Installed: ${status.isHookInstalled ? chalk.green('Yes') : chalk.yellow('No')}`);
    console.log(`- Lock Active: ${status.isLocked ? chalk.red('Yes') : chalk.green('No (Idle)')}`);
    console.log('');

    console.log(chalk.bold('Configuration Parameters:'));
    console.log(`- Auto Update: ${status.config.auto_update !== false ? chalk.green('Enabled') : chalk.yellow('Disabled')}`);
    console.log(`- Documentation Gen: ${status.config.documentation_generation !== false ? chalk.green('Enabled') : chalk.yellow('Disabled')}`);
    console.log(`- AI Context Gen: ${status.config.context_generation !== false ? chalk.green('Enabled') : chalk.yellow('Disabled')}`);
    console.log(`- Safe Mode: ${status.config.safe_mode !== false ? chalk.green('Enabled') : chalk.yellow('Disabled')}`);
    console.log('');
  }
}
