import { describe, it, expect } from 'vitest';
import { AnalyzerRegistry } from './analyzer.registry.js';
import { Analyzer } from './analyzer.interface.js';
import { ProjectContext, AnalysisResult } from '@devbrain/shared';

class MockAnalyzer implements Analyzer {
  readonly id = 'mock';
  readonly name = 'Mock Analyzer';

  async supports(project: ProjectContext): Promise<boolean> {
    return project.files.includes('mock.txt');
  }

  async analyze(_project: ProjectContext): Promise<AnalysisResult> {
    return {
      analyzerId: this.id,
      analyzerName: this.name,
      data: {
        technologies: ['TypeScript', 'Node.js'],
        frameworks: ['Vitest'],
        metadata: {
          mockKey: 'mockValue',
        },
      },
    };
  }
}

describe('AnalyzerRegistry', () => {
  it('should register analyzers and run those that are supported', async () => {
    const registry = new AnalyzerRegistry();
    const mock = new MockAnalyzer();
    registry.register(mock);

    expect(registry.getAnalyzers().length).toBe(1);

    const projectContext: ProjectContext = {
      cwd: '/mock/cwd',
      files: ['mock.txt', 'other.txt'],
      config: {
        version: '0.1.0',
        project: { name: 'Test Project' },
        scanner: { ignore: [], respectGitignore: true, followSymlinks: false },
        memory: { format: 'markdown', directory: '.devbrain/memory' },
      },
    };

    const aggregated = await registry.runAll(projectContext);

    expect(aggregated.projectName).toBe('Test Project');
    expect(aggregated.technologies).toEqual(['TypeScript', 'Node.js']);
    expect(aggregated.frameworks).toEqual(['Vitest']);
    expect(aggregated.metadata).toEqual({ mockKey: 'mockValue' });
    expect(aggregated.analyzers.mock).toBeDefined();
    expect(aggregated.analyzers.mock.technologies).toEqual(['TypeScript', 'Node.js']);
  });

  it('should skip analyzers that are not supported', async () => {
    const registry = new AnalyzerRegistry();
    const mock = new MockAnalyzer();
    registry.register(mock);

    const projectContext: ProjectContext = {
      cwd: '/mock/cwd',
      files: ['other.txt'],
      config: {
        version: '0.1.0',
        project: { name: 'Test Project' },
        scanner: { ignore: [], respectGitignore: true, followSymlinks: false },
        memory: { format: 'markdown', directory: '.devbrain/memory' },
      },
    };

    const aggregated = await registry.runAll(projectContext);

    expect(aggregated.technologies).toEqual([]);
    expect(aggregated.analyzers.mock).toBeUndefined();
  });
});
