import { join } from 'node:path';
import {
  CommandContext,
  ValidationError,
  DEVBRAIN_DIR_NAME,
  CONFIG_FILE_NAME,
} from '@devbrain/shared';
import {
  RepositoryScanner,
  AnalyzerRegistry,
  MemoryService,
  ReadmeAnalyzer,
  PackageJsonAnalyzer,
  TsconfigAnalyzer,
  GitAnalyzer,
  DockerfileAnalyzer,
  RequirementsTxtAnalyzer,
  PomXmlAnalyzer,
  BuildGradleAnalyzer,
} from '@devbrain/core';
import { CommandPipeline } from '../pipeline/command.pipeline.js';
import ora from 'ora';

interface LearnArgs {
  respectGitignore?: boolean;
}

/**
 * Command pipeline for "devbrain learn".
 */
export class LearnCommand extends CommandPipeline<LearnArgs> {
  private filesList: string[] = [];

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

  protected async createContext(context: CommandContext, args: LearnArgs): Promise<void> {
    const spinner = ora('Scanning repository files...').start();
    try {
      const scanner = new RepositoryScanner(this.fsService);
      const respectGitignore = args.respectGitignore ?? context.config?.scanner.respectGitignore;

      this.filesList = await scanner.scan(context.cwd, {
        ignore: context.config?.scanner.ignore,
        followSymlinks: context.config?.scanner.followSymlinks,
        respectGitignore,
      });
      spinner.succeed(`Scanned repository: found ${this.filesList.length} files.`);
    } catch (error: any) {
      spinner.fail('Scanning failed.');
      throw error;
    }
  }

  protected async executeService(context: CommandContext, _args: LearnArgs): Promise<void> {
    const spinner = ora('Analyzing code and generating memory files...').start();
    try {
      // Setup registry with default analyzers
      const registry = new AnalyzerRegistry();
      registry.register(new ReadmeAnalyzer(this.fsService));
      registry.register(new PackageJsonAnalyzer(this.fsService));
      registry.register(new TsconfigAnalyzer(this.fsService));
      registry.register(new GitAnalyzer(this.fsService));
      registry.register(new DockerfileAnalyzer(this.fsService));
      registry.register(new RequirementsTxtAnalyzer(this.fsService));
      registry.register(new PomXmlAnalyzer(this.fsService));
      registry.register(new BuildGradleAnalyzer(this.fsService));

      const projectContext = {
        cwd: context.cwd,
        files: this.filesList,
        config: context.config!,
      };

      // Execute analyzers
      const analysis = await registry.runAll(projectContext);

      // Generate memory files
      const memoryService = new MemoryService(this.fsService);
      const memoryDir = join(context.cwd, context.config!.memory.directory);
      await memoryService.generateMemory(analysis, memoryDir);

      spinner.succeed('Memory documentation generated successfully.');
    } catch (error: any) {
      spinner.fail('Analysis execution failed.');
      throw error;
    }
  }

  protected async writeOutput(
    _context: CommandContext,
    _output: any,
    _args: LearnArgs,
  ): Promise<void> {
    // No-op: files written in execution service
  }

  protected async reportResult(
    context: CommandContext,
    _output: any,
    _args: LearnArgs,
  ): Promise<void> {
    this.logger.success(
      `Repository documentation written to ${join(context.cwd, context.config!.memory.directory)}`,
    );
  }
}
