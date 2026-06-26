import chalk from 'chalk';

/**
 * CLI coloring and logging utility.
 */
export class Logger {
  constructor(private readonly isDebugEnabled = false) {}

  info(message: string): void {
    console.log(chalk.blue('ℹ') + ' ' + message);
  }

  success(message: string): void {
    console.log(chalk.green('✔') + ' ' + chalk.bold(message));
  }

  warn(message: string): void {
    console.log(chalk.yellow('⚠') + ' ' + chalk.yellow(message));
  }

  error(message: string): void {
    console.error(chalk.red('✖') + ' ' + chalk.red.bold(message));
  }

  debug(message: string): void {
    if (this.isDebugEnabled) {
      console.log(chalk.gray('[DEBUG]') + ' ' + message);
    }
  }

  header(title: string): void {
    console.log('\n' + chalk.magenta.bold('=== ' + title + ' ===') + '\n');
  }
}
