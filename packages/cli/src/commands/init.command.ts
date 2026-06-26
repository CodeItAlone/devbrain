import { join, basename } from 'node:path';
import {
  CommandContext,
  ValidationError,
  DEVBRAIN_VERSION,
  DEFAULT_IGNORE_PATTERNS,
  DEVBRAIN_DIR_NAME,
  CONFIG_FILE_NAME,
  DEFAULT_MEMORY_DIR,
} from '@devbrain/shared';
import { CommandPipeline } from '../pipeline/command.pipeline.js';

interface InitArgs {
  force?: boolean;
}

/**
 * Command pipeline for "devbrain init".
 */
export class InitCommand extends CommandPipeline<InitArgs> {
  protected async validate(context: CommandContext, args: InitArgs): Promise<void> {
    const configPath = join(context.cwd, DEVBRAIN_DIR_NAME, CONFIG_FILE_NAME);
    if (!args.force && (await this.fsService.exists(configPath))) {
      throw new ValidationError(
        'DevBrain project is already initialized in this repository.',
        `Found configuration file at ${configPath}.`,
        'Use the "--force" flag to reinitialize and overwrite the config.',
      );
    }
  }

  protected async createContext(context: CommandContext, _args: InitArgs): Promise<void> {
    // Setup default config parameters
    const projectName = basename(context.cwd);
    context.config = {
      version: DEVBRAIN_VERSION,
      project: {
        name: projectName.replace(/[-_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
      },
      scanner: {
        ignore: DEFAULT_IGNORE_PATTERNS,
        followSymlinks: false,
        respectGitignore: true,
      },
      memory: {
        format: 'markdown',
        directory: DEFAULT_MEMORY_DIR,
      },
    };
  }

  protected async executeService(context: CommandContext, _args: InitArgs): Promise<void> {
    const devbrainPath = join(context.cwd, DEVBRAIN_DIR_NAME);
    const configPath = join(devbrainPath, CONFIG_FILE_NAME);
    const memoryPath = join(context.cwd, context.config!.memory.directory);

    // Create directories
    await this.fsService.writeJson(configPath, context.config);

    // Generate starter memory summary
    const summaryPath = join(memoryPath, 'summary.md');
    const initialSummary = [
      `# Project Summary: ${context.config!.project.name}`,
      '',
      '## Overview',
      'This project has been initialized with DevBrain. Run "devbrain learn" to populate structured memory.',
      '',
    ].join('\n');

    await this.fsService.write(summaryPath, initialSummary);
  }

  protected async writeOutput(
    _context: CommandContext,
    _output: any,
    _args: InitArgs,
  ): Promise<void> {
    // No-op: files written in execution service
  }

  protected async reportResult(
    context: CommandContext,
    _output: any,
    _args: InitArgs,
  ): Promise<void> {
    this.logger.success(
      `Initialized DevBrain project memory directory at ${join(context.cwd, DEVBRAIN_DIR_NAME)}`,
    );
  }
}
