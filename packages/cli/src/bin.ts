#!/usr/bin/env node

import { Command } from 'commander';
import { InitCommand } from './commands/init.command.js';
import { LearnCommand } from './commands/learn.command.js';
import { ContextCommand } from './commands/context.command.js';
import { StatusCommand } from './commands/status.command.js';
import { HistoryCommand } from './commands/history.command.js';
import { HookCommand } from './commands/hook.command.js';
import { SearchCommand } from './commands/search.command.js';
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
  .option('-f, --force', 'Force a full scanned refresh of memory')
  .option('--silent', 'Execute silently in the background')
  .option('--no-gitignore', 'Skip matching .gitignore exclude rules')
  .option('--repair', 'Repair and rebuild vector index from scratch')
  .action(async (options) => {
    const cwd = process.cwd();
    const cmd = new LearnCommand();
    await cmd.execute(cwd, !!options.debug, {
      force: !!options.force,
      silent: !!options.silent,
      respectGitignore: options.gitignore !== false,
      repair: !!options.repair,
    });
  });

program
  .command('context [query]')
  .description('Consolidate persistent documentation memory into an optimized prompt context')
  .option('-d, --debug', 'Enable verbose debug outputs and print stack traces')
  .option('-r, --raw', 'Omit debug and formatting statistics in output')
  .action(async (query, options) => {
    const cwd = process.cwd();
    const cmd = new ContextCommand();
    await cmd.execute(cwd, !!options.debug, { raw: !!options.raw, query });
  });

program
  .command('search <query>')
  .description('Semantically search repository memories for relevant information')
  .option('-d, --debug', 'Enable verbose debug outputs and print stack traces')
  .option('--top <number>', 'Number of top results to return', (v) => parseInt(v, 10))
  .action(async (query, options) => {
    const cwd = process.cwd();
    const cmd = new SearchCommand();
    await cmd.execute(cwd, !!options.debug, { query, top: options.top });
  });

program
  .command('status')
  .description('Display autonomous Git integration status and repository statistics')
  .option('-d, --debug', 'Enable verbose debug outputs and print stack traces')
  .action(async (options) => {
    const cwd = process.cwd();
    const cmd = new StatusCommand();
    await cmd.execute(cwd, !!options.debug, {});
  });

program
  .command('history')
  .description('Display commit history processing logs and version metrics')
  .option('-d, --debug', 'Enable verbose debug outputs and print stack traces')
  .action(async (options) => {
    const cwd = process.cwd();
    const cmd = new HistoryCommand();
    await cmd.execute(cwd, !!options.debug, {});
  });

// Git Hook Subcommand group
const hookGroup = program
  .command('hook')
  .description('Manage DevBrain autonomous Git integration hooks');

hookGroup
  .command('install')
  .description('Install the post-commit git hook')
  .option('-d, --debug', 'Enable verbose debug outputs and print stack traces')
  .action(async (options) => {
    const cwd = process.cwd();
    const cmd = new HookCommand();
    await cmd.execute(cwd, !!options.debug, { action: 'install' });
  });

hookGroup
  .command('remove')
  .description('Remove the post-commit git hook')
  .option('-d, --debug', 'Enable verbose debug outputs and print stack traces')
  .action(async (options) => {
    const cwd = process.cwd();
    const cmd = new HookCommand();
    await cmd.execute(cwd, !!options.debug, { action: 'remove' });
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
