import { join } from 'node:path';
import { ProjectContext, AnalysisResult } from '@devbrain/shared';
import { Analyzer } from '../analyzer.interface.js';
import { FilesystemService } from '../../filesystem/filesystem.service.js';

/**
 * Analyzer for Python requirements.txt files.
 */
export class RequirementsTxtAnalyzer implements Analyzer {
  readonly id = 'requirements-txt';
  readonly name = 'Python Requirements Analyzer';

  constructor(private readonly fsService = new FilesystemService()) {}

  async supports(project: ProjectContext): Promise<boolean> {
    return project.files.some((f) => f === 'requirements.txt');
  }

  async analyze(project: ProjectContext): Promise<AnalysisResult> {
    const file = project.files.find((f) => f === 'requirements.txt')!;
    const path = join(project.cwd, file);
    const content = await this.fsService.read(path);

    const dependencies: string[] = [];
    const lines = content.split(/\r?\n/);

    for (let line of lines) {
      line = line.trim();
      if (!line || line.startsWith('#')) {
        continue;
      }
      // Simple parse: package==version, package>=version, etc.
      const match = line.match(/^([a-zA-Z0-9_\-[\]]+)/);
      if (match) {
        dependencies.push(match[1]);
      }
    }

    // Infer frameworks
    const frameworks: string[] = [];
    const frameworkMap: Record<string, string> = {
      django: 'Django',
      fastapi: 'FastAPI',
      flask: 'Flask',
      tornado: 'Tornado',
    };

    for (const dep of dependencies) {
      const lowerDep = dep.toLowerCase();
      if (frameworkMap[lowerDep]) {
        frameworks.push(frameworkMap[lowerDep]);
      }
    }

    return {
      analyzerId: this.id,
      analyzerName: this.name,
      data: {
        dependencies,
        frameworks,
        technologies: ['Python'],
        metadata: {
          projectLanguage: 'Python',
          projectFramework: frameworks[0] || 'Python base',
        },
      },
    };
  }
}
