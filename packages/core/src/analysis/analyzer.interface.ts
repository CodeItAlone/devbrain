import { ProjectContext, AnalysisResult } from '@devbrain/shared';

/**
 * Interface definition for repository analyzers.
 */
export interface Analyzer {
  readonly id: string;
  readonly name: string;
  supports(project: ProjectContext): Promise<boolean>;
  analyze(project: ProjectContext): Promise<AnalysisResult>;
}
