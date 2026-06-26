import { join } from 'node:path';
import { ProjectContext, AnalysisResult } from '@devbrain/shared';
import { Analyzer } from '../analyzer.interface.js';
import { FilesystemService } from '../../filesystem/filesystem.service.js';

/**
 * Analyzer for tsconfig.json configurations.
 */
export class TsconfigAnalyzer implements Analyzer {
  readonly id = 'tsconfig';
  readonly name = 'TypeScript Configuration Analyzer';

  constructor(private readonly fsService = new FilesystemService()) {}

  async supports(project: ProjectContext): Promise<boolean> {
    return project.files.some((f) => f === 'tsconfig.json');
  }

  async analyze(project: ProjectContext): Promise<AnalysisResult> {
    const tsconfigFile = project.files.find((f) => f === 'tsconfig.json')!;
    const tsconfigPath = join(project.cwd, tsconfigFile);
    const rawContent = await this.fsService.read(tsconfigPath);

    // Strip comments to allow parsing json with comments
    const cleanJson = rawContent.replace(/\/\*[\s\S]*?\*\/|([^\\:]|^)\/\/.*$/gm, '$1').trim();

    let compilerOptions: Record<string, any> = {};
    let references: any[] = [];
    try {
      const parsed = JSON.parse(cleanJson);
      compilerOptions = parsed.compilerOptions || {};
      references = parsed.references || [];
    } catch {
      // Fallback if parsing fails
    }

    return {
      analyzerId: this.id,
      analyzerName: this.name,
      data: {
        target: compilerOptions.target || 'default',
        module: compilerOptions.module || 'default',
        moduleResolution: compilerOptions.moduleResolution || 'default',
        strict: compilerOptions.strict ?? false,
        jsx: compilerOptions.jsx || 'none',
        referencesCount: references.length,
        technologies: ['TypeScript'],
      },
    };
  }
}
