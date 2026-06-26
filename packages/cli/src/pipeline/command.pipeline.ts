import { CommandContext, DevBrainConfig } from '@devbrain/shared';
import { FilesystemService } from '@devbrain/core';
import { Logger } from '../ui/logger.js';
import { join } from 'node:path';
import { CONFIG_FILE_NAME, DEVBRAIN_DIR_NAME } from '@devbrain/shared';

/**
 * Standard Command Pipeline lifecycle.
 * Order: Validate -> Load Configuration -> Create Context -> Execute Service -> Write Output -> Report Result.
 */
export abstract class CommandPipeline<TArgs = any> {
  protected readonly fsService = new FilesystemService();
  protected logger = new Logger();

  /**
   * Runs the complete command lifecycle with error trapping and performance boundaries.
   */
  async execute(cwd: string, debug: boolean, args: TArgs): Promise<void> {
    this.logger = new Logger(debug);
    const context: CommandContext = { cwd, debug };

    try {
      this.logger.debug('1. Running validations...');
      await this.validate(context, args);

      this.logger.debug('2. Loading configuration...');
      context.config = await this.loadConfiguration(context);

      this.logger.debug('3. Establishing context parameters...');
      await this.createContext(context, args);

      this.logger.debug('4. Executing business services...');
      const startTime = Date.now();
      const output = await this.executeService(context, args);
      const durationMs = Date.now() - startTime;
      this.logger.debug(`Execution completed in ${durationMs}ms`);

      this.logger.debug('5. Persisting command output...');
      await this.writeOutput(context, output, args);

      this.logger.debug('6. Writing user progress report...');
      await this.reportResult(context, output, args);
    } catch (error: any) {
      this.handleError(error, debug);
      process.exit(1);
    }
  }

  protected abstract validate(context: CommandContext, args: TArgs): Promise<void>;

  /**
   * Helper that reads the local config.json.
   */
  protected async loadConfiguration(context: CommandContext): Promise<DevBrainConfig | undefined> {
    const configPath = join(context.cwd, DEVBRAIN_DIR_NAME, CONFIG_FILE_NAME);
    if (await this.fsService.exists(configPath)) {
      return await this.fsService.readJson<DevBrainConfig>(configPath);
    }
    return undefined;
  }

  protected abstract createContext(context: CommandContext, args: TArgs): Promise<void>;

  protected abstract executeService(context: CommandContext, args: TArgs): Promise<any>;

  protected abstract writeOutput(context: CommandContext, output: any, args: TArgs): Promise<void>;

  protected abstract reportResult(context: CommandContext, output: any, args: TArgs): Promise<void>;

  /**
   * Safely formats and displays errors. Prints stack traces only if debug mode is active.
   */
  protected handleError(error: any, debug: boolean): void {
    if (error.formatReport && typeof error.formatReport === 'function') {
      this.logger.error(error.formatReport());
    } else {
      this.logger.error(error.message || 'An unexpected internal error occurred.');
    }

    if (debug && error.stack) {
      console.error('\n' + error.stack);
    }
  }
}
