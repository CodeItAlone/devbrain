import { join, basename } from 'node:path';
import {
  CommandContext,
  ValidationError,
  DEVBRAIN_VERSION,
  DEFAULT_IGNORE_PATTERNS,
  DEVBRAIN_DIR_NAME,
  CONFIG_FILE_NAME,
  VERSION_FILE_NAME,
  CUSTOM_NOTES_FILE_NAME,
  DEFAULT_MEMORY_DIR,
  VersionSchema,
} from '@devbrain/shared';
import { GitService } from '@devbrain/core';
import { CommandPipeline } from '../pipeline/command.pipeline.js';

interface InitArgs {
  force?: boolean;
}

/**
 * Command pipeline for "devbrain init".
 */
export class InitCommand extends CommandPipeline<InitArgs> {
  private hookInstalled = false;

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
      auto_update: true,
      enabled_hooks: ['post-commit'],
      ignored_directories: [],
      ignored_extensions: [],
      maximum_incremental_files: 50,
      documentation_generation: true,
      context_generation: true,
      verbose_logging: false,
      safe_mode: true,
    };
  }

  protected async executeService(context: CommandContext, _args: InitArgs): Promise<void> {
    const devbrainPath = join(context.cwd, DEVBRAIN_DIR_NAME);
    const configPath = join(devbrainPath, CONFIG_FILE_NAME);
    const versionPath = join(devbrainPath, VERSION_FILE_NAME);
    const customNotesPath = join(devbrainPath, CUSTOM_NOTES_FILE_NAME);

    // Create directories & write config
    await this.fsService.writeJson(configPath, context.config);

    // Create version.json
    const versionData: VersionSchema = {
      version: DEVBRAIN_VERSION,
      memorySchema: 2,
      lastMigration: new Date().toISOString().split('T')[0],
    };
    await this.fsService.writeJson(versionPath, versionData);

    // Write starter custom_notes.md if not present
    if (!(await this.fsService.exists(customNotesPath))) {
      const defaultCustomNotes = [
        '# Custom Developer Notes',
        '',
        'Use this file to document manual project conventions, architecture diagrams, decision logs, or any other notes.',
        'This file will NEVER be overwritten by DevBrain.',
        '',
      ].join('\n');
      await this.fsService.write(customNotesPath, defaultCustomNotes);
    }

    // Git Hook Integration
    try {
      const gitService = new GitService(context.cwd, this.fsService);
      if (await gitService.isGitRepository()) {
        await gitService.installHook('post-commit');
        this.hookInstalled = true;
      }
    } catch (err: any) {
      this.logger.warn(`Failed to configure Git hooks: ${err.message || err}`);
    }
  }

  protected async writeOutput(
    _context: CommandContext,
    _output: any,
    _args: InitArgs,
  ): Promise<void> {
    // No-op
  }

  protected async reportResult(
    context: CommandContext,
    _output: any,
    _args: InitArgs,
  ): Promise<void> {
    this.logger.success(
      `Initialized DevBrain project memory directory at ${join(context.cwd, DEVBRAIN_DIR_NAME)}`,
    );
    if (this.hookInstalled) {
      this.logger.success('Automatically installed post-commit Git hook.');
    } else {
      this.logger.warn('Git hooks not installed (directory is not a Git repository).');
    }
  }
}
