import { join } from 'node:path';
import { unlink, stat } from 'node:fs/promises';
import { FilesystemService } from '../filesystem/filesystem.service.js';
import { DEVBRAIN_DIR_NAME, LOCK_FILE_NAME } from '@devbrain/shared';

export class LockManager {
  private readonly lockPath: string;
  private readonly staleTimeoutMs = 10 * 60 * 1000; // 10 minutes

  constructor(
    private readonly cwd: string,
    private readonly fsService: FilesystemService = new FilesystemService(),
  ) {
    this.lockPath = join(cwd, DEVBRAIN_DIR_NAME, LOCK_FILE_NAME);
  }

  /**
   * Attempts to acquire the lock. Returns true if acquired, false otherwise.
   */
  async acquireLock(): Promise<boolean> {
    try {
      if (await this.fsService.exists(this.lockPath)) {
        // Check if the lock is stale
        const isStale = await this.checkIfStale();
        if (isStale) {
          // Release the stale lock
          await this.releaseLock();
        } else {
          return false;
        }
      }

      // Write current timestamp
      const timestamp = Date.now().toString();
      await this.fsService.writeAtomic(this.lockPath, timestamp);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Releases the lock by deleting the lock file.
   */
  async releaseLock(): Promise<void> {
    try {
      if (await this.fsService.exists(this.lockPath)) {
        await unlink(this.lockPath);
      }
    } catch {
      // Ignore errors during release
    }
  }

  /**
   * Checks if a lock currently exists and is active (not stale).
   */
  async isLocked(): Promise<boolean> {
    try {
      if (await this.fsService.exists(this.lockPath)) {
        const isStale = await this.checkIfStale();
        return !isStale;
      }
      return false;
    } catch {
      return false;
    }
  }

  private async checkIfStale(): Promise<boolean> {
    try {
      const stats = await stat(this.lockPath);
      const fileAgeMs = Date.now() - stats.mtimeMs;
      
      if (fileAgeMs > this.staleTimeoutMs) {
        return true;
      }

      // Or read timestamp from file content
      const content = await this.fsService.read(this.lockPath);
      const timestamp = parseInt(content.trim(), 10);
      if (!isNaN(timestamp)) {
        return Date.now() - timestamp > this.staleTimeoutMs;
      }

      return false;
    } catch {
      // If we cannot check, assume it is stale to prevent locking out permanently
      return true;
    }
  }
}
