import { join } from 'node:path';
import { CommandContext, DEVBRAIN_DIR_NAME, CONFIG_FILE_NAME, VERSION_FILE_NAME, VersionSchema } from '@devbrain/shared';
import { HistoryManager } from '@devbrain/core';
import { CommandPipeline } from '../pipeline/command.pipeline.js';
import chalk from 'chalk';

export class HistoryCommand extends CommandPipeline {
  private historyManager!: HistoryManager;

  protected async validate(context: CommandContext, _args: any): Promise<void> {
    const configPath = join(context.cwd, DEVBRAIN_DIR_NAME, CONFIG_FILE_NAME);
    if (!(await this.fsService.exists(configPath))) {
      throw new Error('DevBrain is not initialized. Run "devbrain init" first.');
    }
  }

  protected async createContext(context: CommandContext, _args: any): Promise<void> {
    this.historyManager = new HistoryManager(context.cwd, this.fsService);
  }

  protected async executeService(context: CommandContext, _args: any): Promise<any> {
    const history = await this.historyManager.loadHistory();

    const versionPath = join(context.cwd, DEVBRAIN_DIR_NAME, VERSION_FILE_NAME);
    let versionInfo: VersionSchema | null = null;
    if (await this.fsService.exists(versionPath)) {
      try {
        versionInfo = await this.fsService.readJson<VersionSchema>(versionPath);
      } catch {
        // Ignore
      }
    }

    return {
      history,
      versionInfo,
    };
  }

  protected async writeOutput(_context: CommandContext, _output: any, _args: any): Promise<void> {
    // No-op
  }

  protected async reportResult(context: CommandContext, output: any, _args: any): Promise<void> {
    this.logger.header('DevBrain Commit Processing History');

    const history = output.history;
    console.log(`- Latest Processed Commit: ${chalk.yellow(history.lastProcessedCommit || 'none')}`);
    console.log(`- Memory Schema Version: ${chalk.green(output.versionInfo?.version || '0.1.0')}`);
    console.log(`- Total Commits Learned: ${chalk.cyan(history.commits.length)}`);
    console.log('');

    if (history.commits.length === 0) {
      console.log(chalk.gray('No commit learning logs recorded. Run a commit or "devbrain learn" to populate history.'));
      return;
    }

    console.log(chalk.bold('Learned Commits Log:'));
    
    // Display up to 10 recent commits
    const displayedCommits = history.commits.slice(0, 10);
    for (const commit of displayedCommits) {
      const hash = chalk.yellow(commit.commitHash);
      const date = chalk.gray(new Date(commit.timestamp).toLocaleString());
      const msg = commit.commitMessage.split('\n')[0];
      const statusIcon = commit.status === 'success' 
        ? chalk.green('✔') 
        : commit.status === 'skipped' ? chalk.yellow('ℹ') : chalk.red('✖');
      
      console.log(` ${statusIcon} ${hash} [${date}] - ${msg}`);
    }

    if (history.commits.length > 10) {
      console.log(chalk.gray(`\n...and ${history.commits.length - 10} more older entries.`));
    }
    console.log('');
  }
}
