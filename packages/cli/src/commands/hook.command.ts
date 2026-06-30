import { join } from 'node:path';
import { CommandContext, DEVBRAIN_DIR_NAME, CONFIG_FILE_NAME } from '@devbrain/shared';
import { GitService } from '@devbrain/core';
import { CommandPipeline } from '../pipeline/command.pipeline.js';

interface HookArgs {
  action: 'install' | 'remove';
}

export class HookCommand extends CommandPipeline<HookArgs> {
  private gitService!: GitService;

  protected async validate(context: CommandContext, _args: HookArgs): Promise<void> {
    const configPath = join(context.cwd, DEVBRAIN_DIR_NAME, CONFIG_FILE_NAME);
    if (!(await this.fsService.exists(configPath))) {
      throw new Error('DevBrain is not initialized. Run "devbrain init" first.');
    }
  }

  protected async createContext(context: CommandContext, _args: HookArgs): Promise<void> {
    this.gitService = new GitService(context.cwd, this.fsService);
  }

  protected async executeService(context: CommandContext, args: HookArgs): Promise<void> {
    const isGit = await this.gitService.isGitRepository();
    if (!isGit) {
      throw new Error('This workspace is not a valid Git repository.');
    }

    if (args.action === 'install') {
      await this.gitService.installHook('post-commit');
    } else if (args.action === 'remove') {
      await this.gitService.removeHook('post-commit');
    }
  }

  protected async writeOutput(_context: CommandContext, _output: any, _args: HookArgs): Promise<void> {
    // No-op
  }

  protected async reportResult(context: CommandContext, _output: any, args: HookArgs): Promise<void> {
    if (args.action === 'install') {
      this.logger.success('Successfully installed post-commit hook for DevBrain.');
    } else {
      this.logger.success('Successfully removed post-commit hook for DevBrain.');
    }
  }
}
