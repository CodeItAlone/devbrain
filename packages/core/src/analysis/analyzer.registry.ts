import { ProjectContext, AggregatedAnalysis } from '@devbrain/shared';
import { Analyzer } from './analyzer.interface.js';

/**
 * Registry for managing and executing repository analyzer plugins.
 */
export class AnalyzerRegistry {
  private readonly analyzers: Analyzer[] = [];

  /**
   * Registers a new analyzer plugin.
   */
  register(analyzer: Analyzer): void {
    // Avoid duplicate registration
    if (!this.analyzers.some((a) => a.id === analyzer.id)) {
      this.analyzers.push(analyzer);
    }
  }

  /**
   * Returns copy of registered analyzers.
   */
  getAnalyzers(): Analyzer[] {
    return [...this.analyzers];
  }

  /**
   * Runs all registered analyzers that support the current project context and aggregates their results.
   */
  async runAll(project: ProjectContext): Promise<AggregatedAnalysis> {
    const activeAnalyzersData: Record<string, any> = {};
    const technologies = new Set<string>();
    const frameworks = new Set<string>();
    const metadata: Record<string, any> = {};

    for (const analyzer of this.analyzers) {
      try {
        const isSupported = await analyzer.supports(project);
        if (isSupported) {
          const result = await analyzer.analyze(project);
          activeAnalyzersData[analyzer.id] = result.data;

          // Pull dynamic attributes from analyzer output
          if (result.data.technologies && Array.isArray(result.data.technologies)) {
            for (const tech of result.data.technologies) {
              technologies.add(tech);
            }
          }
          if (result.data.frameworks && Array.isArray(result.data.frameworks)) {
            for (const fw of result.data.frameworks) {
              frameworks.add(fw);
            }
          }
          if (result.data.metadata && typeof result.data.metadata === 'object') {
            Object.assign(metadata, result.data.metadata);
          }
        }
      } catch (error: any) {
        activeAnalyzersData[analyzer.id] = {
          error: error.message || 'Analyzer failed during execution',
        };
      }
    }

    return {
      projectName: project.config.project.name,
      technologies: Array.from(technologies),
      frameworks: Array.from(frameworks),
      metadata,
      files: project.files,
      analyzers: activeAnalyzersData,
    };
  }
}
