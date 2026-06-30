import { join } from 'node:path';
import { DEVBRAIN_DIR_NAME, LOGS_DIR_NAME } from '@devbrain/shared';
import { FilesystemService } from '../filesystem/filesystem.service.js';

export class LoggerService {
  private readonly logDir: string;

  constructor(
    private readonly cwd: string,
    private readonly fsService: FilesystemService = new FilesystemService(),
  ) {
    this.logDir = join(cwd, DEVBRAIN_DIR_NAME, LOGS_DIR_NAME);
  }

  /**
   * Log a message with a timestamp and log level to a specific file.
   */
  async log(message: string, level = 'INFO', fileName = 'devbrain.log'): Promise<void> {
    try {
      const timestamp = new Date().toISOString();
      const logLine = `[${timestamp}] [${level}] ${message}\n`;
      const targetPath = join(this.logDir, fileName);

      // Create logs directory if it does not exist
      if (!(await this.fsService.exists(this.logDir))) {
        const { mkdir } = await import('node:fs/promises');
        await mkdir(this.logDir, { recursive: true });
      }

      const { appendFile } = await import('node:fs/promises');
      await appendFile(targetPath, logLine, 'utf8');
    } catch {
      // Fallback silently if logging fails to prevent interrupting operations
    }
  }

  async info(message: string, fileName = 'devbrain.log'): Promise<void> {
    await this.log(message, 'INFO', fileName);
  }

  async success(message: string, fileName = 'devbrain.log'): Promise<void> {
    await this.log(message, 'SUCCESS', fileName);
  }

  async warn(message: string, fileName = 'devbrain.log'): Promise<void> {
    await this.log(message, 'WARN', fileName);
  }

  async error(message: string, fileName = 'devbrain.log'): Promise<void> {
    await this.log(message, 'ERROR', fileName);
  }

  async debug(message: string, fileName = 'devbrain.log'): Promise<void> {
    await this.log(message, 'DEBUG', fileName);
  }
}
