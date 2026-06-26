import { join } from 'node:path';
import { FilesystemService } from '../filesystem/filesystem.service.js';
import { ValidationError } from '@devbrain/shared';

/**
 * Service responsible for reading generated project memory and consolidating it into an optimized AI prompt context.
 */
export class ContextService {
  constructor(private readonly fsService: FilesystemService = new FilesystemService()) {}

  /**
   * Reads memory markdown files, validates existence, and compiles them into a single token-efficient string.
   */
  async buildContext(memoryDir: string): Promise<string> {
    const files = [
      'summary.md',
      'stack.md',
      'architecture.md',
      'features.md',
      'rules.md',
      'timeline.md',
    ];
    const parts: string[] = [];

    // Ensure memory folder exists
    if (!(await this.fsService.exists(memoryDir))) {
      throw new ValidationError(
        'Project memory directory not found.',
        `The directory ${memoryDir} does not exist.`,
        'Run "devbrain learn" to scan the repository and populate the memory files first.',
      );
    }

    parts.push('<!-- START OF DEVBRAIN AI ASSISTANT CONTEXT SCHEMA -->');
    parts.push('# DEVBRAIN PROJECT CONTEXT INDEX');
    parts.push('');

    for (const file of files) {
      const filePath = join(memoryDir, file);
      if (!(await this.fsService.exists(filePath))) {
        continue; // Skip missing files gracefully or use a warning comment
      }

      const content = await this.fsService.read(filePath);
      const formatted = this.normalizeHeadings(file, content);
      parts.push(formatted);
      parts.push('');
    }

    parts.push('<!-- END OF DEVBRAIN AI ASSISTANT CONTEXT SCHEMA -->');

    return parts.join('\n');
  }

  /**
   * Formats and converts absolute top-level headers (#) to sub-headers (##)
   * to maintain a single root h1 structure and optimizes whitespaces.
   */
  private normalizeHeadings(fileName: string, content: string): string {
    const sectionName = fileName.replace('.md', '').toUpperCase();
    const lines = content.split('\n');
    const processedLines: string[] = [`## SECTION: ${sectionName}`, ''];

    for (let line of lines) {
      line = line.trimEnd();
      // Translate root header # to second-level ##
      if (line.startsWith('# ')) {
        processedLines.push(`### ${line.substring(2)}`);
      } else if (line.startsWith('## ')) {
        processedLines.push(`#### ${line.substring(3)}`);
      } else if (line.startsWith('### ')) {
        processedLines.push(`##### ${line.substring(4)}`);
      } else {
        processedLines.push(line);
      }
    }

    return processedLines.join('\n').trim();
  }
}
