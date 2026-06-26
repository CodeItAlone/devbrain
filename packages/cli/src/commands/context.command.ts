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

  protected async executeService(context: CommandContext, _args: ContextArgs): Promise<string> {
    const memoryDir = join(context.cwd, context.config!.memory.directory);
    const contextService = new ContextService(this.fsService);
    return await contextService.buildContext(memoryDir);
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
