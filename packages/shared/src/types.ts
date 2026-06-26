/**
 * Configuration schema for DevBrain.
 */
export interface DevBrainConfig {
  version: string;
  project: {
    name: string;
    language?: string;
    framework?: string;
  };
  scanner: {
    ignore: string[];
    followSymlinks: boolean;
    respectGitignore: boolean;
  };
  memory: {
    format: 'markdown';
    directory: string;
  };
}

/**
 * Context that is passed through the command lifecycle pipeline.
 */
export interface CommandContext {
  cwd: string;
  config?: DevBrainConfig;
  debug: boolean;
}

/**
 * Result of individual file analysis.
 */
export interface AnalysisResult {
  analyzerId: string;
  analyzerName: string;
  data: Record<string, any>;
}

/**
 * Aggregated repository metadata and technology details.
 */
export interface AggregatedAnalysis {
  projectName: string;
  technologies: string[];
  frameworks: string[];
  metadata: Record<string, any>;
  files: string[];
  analyzers: Record<string, any>;
}
export interface ProjectContext {
  cwd: string;
  files: string[];
  config: DevBrainConfig;
}
