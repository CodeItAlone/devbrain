import fg from 'fast-glob';
import { join } from 'node:path';
import { FilesystemService } from '../filesystem/filesystem.service.js';
import { DEFAULT_IGNORE_PATTERNS } from '@devbrain/shared';

export interface ScanOptions {
  ignore?: string[];
  followSymlinks?: boolean;
  respectGitignore?: boolean;
}

/**
 * Service for scanning repositories and finding files while respecting configuration filters.
 */
export class RepositoryScanner {
  constructor(private readonly fsService: FilesystemService = new FilesystemService()) {}

  /**
   * Scans a workspace directory recursively and returns all matching relative file paths.
   */
  async scan(cwd: string, options: ScanOptions = {}): Promise<string[]> {
    const ignoreList = [...(options.ignore || DEFAULT_IGNORE_PATTERNS)];

    // Respect .gitignore if configured
    if (options.respectGitignore !== false) {
      const gitignorePath = join(cwd, '.gitignore');
      if (await this.fsService.exists(gitignorePath)) {
        try {
          const gitignoreContent = await this.fsService.read(gitignorePath);
          const gitignoreRules = this.parseGitignore(gitignoreContent);
          ignoreList.push(...gitignoreRules);
        } catch {
          // Fallback silently if gitignore reading fails
        }
      }
    }

    // fast-glob parameters
    const files = await fg('**/*', {
      cwd,
      ignore: ignoreList,
      followSymbolicLinks: options.followSymlinks ?? false,
      dot: true, // Scan hidden files like .gitignore or .git
      onlyFiles: true,
    });

    return files;
  }

  /**
   * Helper to translate standard .gitignore patterns into fast-glob rules.
   */
  private parseGitignore(content: string): string[] {
    const rules: string[] = [];
    const lines = content.split(/\r?\n/);

    for (let line of lines) {
      line = line.trim();
      // Skip empty lines and comments
      if (!line || line.startsWith('#')) {
        continue;
      }

      // Negative patterns are not directly handled by basic fast-glob ignores,
      // but simple exclusions are translated.
      let pattern = line;
      if (pattern.startsWith('!')) {
        continue; // Skip negative ignores for simplicity in scanner v0.1
      }

      if (pattern.startsWith('/')) {
        pattern = pattern.substring(1);
      }

      // If it has no slash and is not a wildcard, it can be anywhere in the directory hierarchy
      if (!pattern.includes('/')) {
        rules.push(`**/${pattern}`);
        rules.push(`**/${pattern}/**`);
      } else {
        if (pattern.endsWith('/')) {
          rules.push(`${pattern}**`);
        } else {
          rules.push(pattern);
          rules.push(`${pattern}/**`);
        }
      }
    }

    return rules;
  }
}
