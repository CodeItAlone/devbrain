import { join } from 'node:path';
import { ProjectContext, AnalysisResult } from '@devbrain/shared';
import { Analyzer } from '../analyzer.interface.js';
import { FilesystemService } from '../../filesystem/filesystem.service.js';

interface PackageJsonData {
  name?: string;
  version?: string;
  scripts?: Record<string, string>;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  engines?: Record<string, string>;
  workspaces?: string[] | { packages?: string[] };
}

/**
 * Analyzer for package.json files.
 */
export class PackageJsonAnalyzer implements Analyzer {
  readonly id = 'package-json';
  readonly name = 'package.json Analyzer';

  constructor(private readonly fsService = new FilesystemService()) {}

  async supports(project: ProjectContext): Promise<boolean> {
    return project.files.some((f) => f === 'package.json');
  }

  async analyze(project: ProjectContext): Promise<AnalysisResult> {
    const packageJsonFile = project.files.find((f) => f === 'package.json')!;
    const packageJsonPath = join(project.cwd, packageJsonFile);
    const data = await this.fsService.readJson<PackageJsonData>(packageJsonPath);

    const name = data.name || 'unnamed';
    const version = data.version || '0.0.0';
    const scripts = Object.keys(data.scripts || {});
    const dependencies = Object.keys(data.dependencies || {});
    const devDependencies = Object.keys(data.devDependencies || {});

    // Infer technologies and frameworks
    const technologies: string[] = ['Node.js'];
    const frameworks: string[] = [];

    if (devDependencies.includes('typescript') || dependencies.includes('typescript')) {
      technologies.push('TypeScript');
    } else {
      technologies.push('JavaScript');
    }

    const frameworkMap: Record<string, string> = {
      next: 'Next.js',
      react: 'React',
      vue: 'Vue',
      nuxt: 'Nuxt',
      svelte: 'Svelte',
      express: 'Express',
      fastify: 'Fastify',
      hono: 'Hono',
      nest: 'NestJS',
    };

    const allDeps = [...dependencies, ...devDependencies];
    for (const [depKey, fwName] of Object.entries(frameworkMap)) {
      if (allDeps.some((d) => d.includes(depKey))) {
        frameworks.push(fwName);
      }
    }

    return {
      analyzerId: this.id,
      analyzerName: this.name,
      data: {
        name,
        version,
        scripts,
        dependencies: data.dependencies || {},
        devDependencies: data.devDependencies || {},
        engines: data.engines || {},
        workspaces: data.workspaces || null,
        technologies,
        frameworks,
        metadata: {
          projectLanguage: technologies.includes('TypeScript') ? 'TypeScript' : 'JavaScript',
          projectFramework: frameworks[0] || 'Node.js base',
        },
      },
    };
  }
}
