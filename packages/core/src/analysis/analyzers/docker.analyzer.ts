import { join } from 'node:path';
import { ProjectContext, AnalysisResult } from '@devbrain/shared';
import { Analyzer } from '../analyzer.interface.js';
import { FilesystemService } from '../../filesystem/filesystem.service.js';

/**
 * Analyzer for Dockerfile.
 */
export class DockerfileAnalyzer implements Analyzer {
  readonly id = 'dockerfile';
  readonly name = 'Dockerfile Analyzer';

  constructor(private readonly fsService = new FilesystemService()) {}

  async supports(project: ProjectContext): Promise<boolean> {
    return project.files.some((f) => f === 'Dockerfile' || f.endsWith('.dockerfile'));
  }

  async analyze(project: ProjectContext): Promise<AnalysisResult> {
    const dockerfile = project.files.find((f) => f === 'Dockerfile' || f.endsWith('.dockerfile'))!;
    const path = join(project.cwd, dockerfile);
    const content = await this.fsService.read(path);

    const fromMatch = content.match(/^FROM\s+(.+)$/im);
    const baseImage = fromMatch ? fromMatch[1].trim() : 'unknown';

    const ports: string[] = [];
    const portMatches = content.matchAll(/^EXPOSE\s+(.+)$/gim);
    for (const match of portMatches) {
      ports.push(...match[1].trim().split(/\s+/));
    }

    return {
      analyzerId: this.id,
      analyzerName: this.name,
      data: {
        baseImage,
        exposedPorts: ports,
        technologies: ['Docker'],
      },
    };
  }
}
