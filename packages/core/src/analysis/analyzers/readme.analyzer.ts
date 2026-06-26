import { join } from 'node:path';
import { ProjectContext, AnalysisResult } from '@devbrain/shared';
import { Analyzer } from '../analyzer.interface.js';
import { FilesystemService } from '../../filesystem/filesystem.service.js';

/**
 * Analyzer for README files.
 */
export class ReadmeAnalyzer implements Analyzer {
  readonly id = 'readme';
  readonly name = 'README.md Analyzer';

  constructor(private readonly fsService = new FilesystemService()) {}

  async supports(project: ProjectContext): Promise<boolean> {
    return project.files.some((f) => f.toLowerCase() === 'readme.md');
  }

  async analyze(project: ProjectContext): Promise<AnalysisResult> {
    const readmeFile = project.files.find((f) => f.toLowerCase() === 'readme.md')!;
    const readmePath = join(project.cwd, readmeFile);
    const content = await this.fsService.read(readmePath);

    const title = this.extractTitle(content);
    const sections = this.extractSections(content);
    const description = this.extractDescription(content);

    return {
      analyzerId: this.id,
      analyzerName: this.name,
      data: {
        title,
        description,
        sections,
      },
    };
  }

  private extractTitle(content: string): string {
    const titleMatch = content.match(/^#\s+(.+)$/m);
    return titleMatch ? titleMatch[1].trim() : 'Untitled Project';
  }

  private extractSections(content: string): string[] {
    const sectionMatches = content.matchAll(/^##\s+(.+)$/gm);
    return Array.from(sectionMatches).map((m) => m[1].trim());
  }

  private extractDescription(content: string): string {
    const lines = content.split('\n');
    let foundTitle = false;
    const descriptionParagraphs: string[] = [];

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('# ')) {
        foundTitle = true;
        continue;
      }
      if (foundTitle) {
        if (trimmed.startsWith('## ') || trimmed.startsWith('# ')) {
          break; // Next section starts, stop extracting description
        }
        if (trimmed && !trimmed.startsWith('!') && !trimmed.startsWith('[')) {
          descriptionParagraphs.push(trimmed);
          if (descriptionParagraphs.length >= 2) break; // Limit to first two descriptive paragraphs
        }
      }
    }

    return descriptionParagraphs.join(' ');
  }
}
