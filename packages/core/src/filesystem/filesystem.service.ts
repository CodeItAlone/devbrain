import { mkdir, readFile, writeFile, rename, stat } from 'node:fs/promises';
import { dirname } from 'node:path';
import { FilesystemError } from '@devbrain/shared';

/**
 * Service for safe filesystem operations.
 */
export class FilesystemService {
  /**
   * Check if a path exists.
   */
  async exists(path: string): Promise<boolean> {
    try {
      await stat(path);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Reads contents of a file as a string.
   */
  async read(path: string): Promise<string> {
    try {
      return await readFile(path, 'utf8');
    } catch (error: any) {
      throw new FilesystemError(
        `Failed to read file at ${path}`,
        error.message || 'File might not exist or is not readable',
        'Verify the path is correct and has appropriate read permissions.',
      );
    }
  }

  /**
   * Writes content to a file, creating directories recursively.
   */
  async write(path: string, content: string): Promise<void> {
    try {
      const dir = dirname(path);
      await mkdir(dir, { recursive: true });
      await writeFile(path, content, 'utf8');
    } catch (error: any) {
      throw new FilesystemError(
        `Failed to write file to ${path}`,
        error.message || 'Directory could not be created or file is locked',
        'Check disk space, directory write permissions, and that target file is not locked.',
      );
    }
  }

  /**
   * Atomically writes file content by writing to a temporary file then renaming.
   */
  async writeAtomic(path: string, content: string): Promise<void> {
    const tempPath = `${path}.tmp-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    try {
      await this.write(tempPath, content);
      await rename(tempPath, path);
    } catch (error: any) {
      // Clean up temp path if it exists
      try {
        if (await this.exists(tempPath)) {
          const { unlink } = await import('node:fs/promises');
          await unlink(tempPath);
        }
      } catch {
        // Ignore cleanup error
      }
      throw new FilesystemError(
        `Failed to atomically write file to ${path}`,
        error.message || 'Atomic rename failed',
        'Ensure the destination folder is writable and in the same filesystem drive.',
      );
    }
  }

  /**
   * Reads and parses a JSON file.
   */
  async readJson<T>(path: string): Promise<T> {
    const raw = await this.read(path);
    try {
      return JSON.parse(raw) as T;
    } catch (error: any) {
      throw new FilesystemError(
        `Failed to parse JSON file at ${path}`,
        error.message || 'Invalid JSON format',
        'Correct the JSON syntax or reconstruct the file configuration.',
      );
    }
  }

  /**
   * Writes JSON data to a file (optionally atomically).
   */
  async writeJson(path: string, data: any, indent = 2): Promise<void> {
    const content = JSON.stringify(data, null, indent) + '\n';
    await this.writeAtomic(path, content);
  }
}
