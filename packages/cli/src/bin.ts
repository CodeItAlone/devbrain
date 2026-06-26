#!/usr/bin/env node

import { Command } from 'commander';
import { InitCommand } from './commands/init.command.js';
import { LearnCommand } from './commands/learn.command.js';
import { ContextCommand } from './commands/context.command.js';
import { DEVBRAIN_VERSION } from '@devbrain/shared';

const program = new Command();

program
  .name('devbrain')
  .description('DevBrain CLI: Persistent project memory for AI-assisted software development')
  .version(DEVBRAIN_VERSION);

program
  .command('init')
  .description('Initialize DevBrain project memory in the current workspace')
  .option('-f, --force', 'Force reinitialization and overwrite existing config')
  .option('-d, --debug', 'Enable verbose debug outputs and print stack traces')
  .action(async (options) => {
    const cwd = process.cwd();
    const cmd = new InitCommand();
    await cmd.execute(cwd, !!options.debug, { force: !!options.force });
  });

program
  .command('learn')
  .description('Scan repository files and update documentation memory deterministically')
  .option('-d, --debug', 'Enable verbose debug outputs and print stack traces')
  .option('--no-gitignore', 'Skip matching .gitignore exclude rules')
  .action(async (options) => {
    const cwd = process.cwd();
    const cmd = new LearnCommand();
    await cmd.execute(cwd, !!options.debug, { respectGitignore: options.gitignore !== false });
  });

program
  .command('context')
  .description('Consolidate persistent documentation memory into an optimized prompt context')
  .option('-d, --debug', 'Enable verbose debug outputs and print stack traces')
  .option('-r, --raw', 'Omit debug and formatting statistics in output')
  .action(async (options) => {
    const cwd = process.cwd();
    const cmd = new ContextCommand();
    await cmd.execute(cwd, !!options.debug, { raw: !!options.raw });
  });

// Handle unknown commands
program.on('command:*', () => {
  console.error(
    'Invalid command: %s\nUse --help for a list of available commands.',
    program.args.join(' '),
  );
  process.exit(1);
});

program.parse(process.argv);
