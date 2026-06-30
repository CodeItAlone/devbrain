import { join } from 'node:path';
import { chmod } from 'node:fs/promises';
import { simpleGit, SimpleGit } from 'simple-git';
import { FilesystemService } from '../filesystem/filesystem.service.js';

export class GitService {
  private readonly git: SimpleGit;

  constructor(
    private readonly cwd: string,
    private readonly fsService: FilesystemService = new FilesystemService(),
  ) {
    this.git = simpleGit({ baseDir: cwd });
  }

  /**
   * Check if the directory is a valid git repository.
   */
  async isGitRepository(): Promise<boolean> {
    try {
      return await this.git.checkIsRepo();
    } catch {
      return false;
    }
  }

  /**
   * Retrieve the current HEAD commit hash.
   */
  async getCurrentCommitHash(): Promise<string | null> {
    try {
      const hash = await this.git.revparse(['HEAD']);
      return hash.trim();
    } catch {
      return null;
    }
  }

  /**
   * Get the list of modified/added/deleted files between two commits.
   */
  async getChangedFiles(sinceHash: string, toHash = 'HEAD'): Promise<{
    modified: string[];
    deleted: string[];
    renamed: { from: string; to: string }[];
  }> {
    try {
      // Get raw diff summary
      const diffSummary = await this.git.diffSummary([sinceHash, toHash]);
      
      const modified: string[] = [];
      const deleted: string[] = [];
      const renamed: { from: string; to: string }[] = [];

      for (const file of diffSummary.files) {
        // simple-git's diffSummary indicates file operations
        if (file.file.includes(' => ')) {
          // File rename format: path/to/{old => new}/file or old => new
          const renameMatch = file.file.match(/^(.*?)\{(.*?) => (.*?)\}(.*)$/) || 
                              file.file.match(/^(.*?) => (.*)$/);
          if (renameMatch) {
            let from = '';
            let to = '';
            if (renameMatch.length === 5) {
              const prefix = renameMatch[1];
              const oldPart = renameMatch[2];
              const newPart = renameMatch[3];
              const suffix = renameMatch[4];
              from = `${prefix}${oldPart}${suffix}`.replace('//', '/');
              to = `${prefix}${newPart}${suffix}`.replace('//', '/');
            } else {
              from = renameMatch[1].trim();
              to = renameMatch[2].trim();
            }
            renamed.push({ from, to });
          } else {
            // Fallback if regex mismatch
            modified.push(file.file);
          }
        } else {
          // Check if deleted
          // In git diff-tree or summary, we check if changes are deletions
          // diffSummary includes changes. We can verify if the file exists locally to confirm status.
          const exists = await this.fsService.exists(join(this.cwd, file.file));
          if (!exists) {
            deleted.push(file.file);
          } else {
            modified.push(file.file);
          }
        }
      }

      return { modified, deleted, renamed };
    } catch {
      return { modified: [], deleted: [], renamed: [] };
    }
  }

  /**
   * Get the commit message of the specified commit hash.
   */
  async getCommitMessage(hash: string): Promise<string> {
    try {
      const message = await this.git.show(['-s', '--format=%B', hash]);
      return message.trim();
    } catch {
      return 'No commit message';
    }
  }

  /**
   * Install post-commit Git hook.
   */
  async installHook(hookName = 'post-commit'): Promise<void> {
    const hooksDir = join(this.cwd, '.git', 'hooks');
    if (!(await this.fsService.exists(hooksDir))) {
      throw new Error('Not a Git repository or hooks directory is missing.');
    }

    const hookPath = join(hooksDir, hookName);
    
    // Construct robust POSIX shell script template that executes async
    const hookContent = [
      '#!/bin/sh',
      '# DevBrain Autonomous Git Memory Engine Hook',
      '',
      '# Set base path',
      'PROJECT_DIR="$(pwd)"',
      'LOG_FILE="$PROJECT_DIR/.devbrain/logs/git-hook.log"',
      'LOCK_FILE="$PROJECT_DIR/.devbrain/.lock"',
      '',
      'mkdir -p "$PROJECT_DIR/.devbrain/logs"',
      '',
      '# Run in background to not block commit',
      '(',
      '  # Check lock file',
      '  if [ -f "$LOCK_FILE" ]; then',
      '    echo "$(date): Skip execution: Another DevBrain process is running." >> "$LOG_FILE"',
      '    exit 0',
      '  fi',
      '',
      '  echo "$(date): Triggering incremental learn..." >> "$LOG_FILE"',
      '',
      '  # Resolve and run devbrain',
      '  if [ -f "$PROJECT_DIR/node_modules/.bin/devbrain" ]; then',
      '    "$PROJECT_DIR/node_modules/.bin/devbrain" learn --silent >> "$LOG_FILE" 2>&1',
      '  elif command -v devbrain >/dev/null 2>&1; then',
      '    devbrain learn --silent >> "$LOG_FILE" 2>&1',
      '  else',
      '    npx --no-install devbrain learn --silent >> "$LOG_FILE" 2>&1',
      '  fi',
      '  ',
      '  # Log result status code',
      '  STATUS=$?',
      '  if [ $STATUS -ne 0 ]; then',
      '    echo "$(date): Error: DevBrain execution failed with code $STATUS" >> "$LOG_FILE"',
      '  else',
      '    echo "$(date): DevBrain learning updated successfully." >> "$LOG_FILE"',
      '  fi',
      ') >/dev/null 2>&1 &',
      '',
      'exit 0',
    ].join('\n') + '\n';

    await this.fsService.write(hookPath, hookContent);
    
    // Make script executable
    try {
      await chmod(hookPath, 0o755);
    } catch {
      // Mode modification might fail on Windows, fallback silently
    }
  }

  /**
   * Remove post-commit Git hook.
   */
  async removeHook(hookName = 'post-commit'): Promise<void> {
    const hookPath = join(this.cwd, '.git', 'hooks', hookName);
    if (await this.fsService.exists(hookPath)) {
      const content = await this.fsService.read(hookPath);
      // Only delete if it's managed by DevBrain
      if (content.includes('DevBrain Autonomous')) {
        const { unlink } = await import('node:fs/promises');
        await unlink(hookPath);
      }
    }
  }

  /**
   * Check if hook is installed and managed by DevBrain.
   */
  async isHookInstalled(hookName = 'post-commit'): Promise<boolean> {
    const hookPath = join(this.cwd, '.git', 'hooks', hookName);
    if (await this.fsService.exists(hookPath)) {
      const content = await this.fsService.read(hookPath);
      return content.includes('DevBrain Autonomous');
    }
    return false;
  }
}
