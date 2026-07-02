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
  auto_update?: boolean;
  enabled_hooks?: string[];
  ignored_directories?: string[];
  ignored_extensions?: string[];
  maximum_incremental_files?: number;
  documentation_generation?: boolean;
  context_generation?: boolean;
  verbose_logging?: boolean;
  safe_mode?: boolean;
  semanticSearch?: {
    topK?: number;
    minSimilarity?: number;
    weights?: {
      semantic?: number;
      recency?: number;
      importance?: number;
      gitFrequency?: number;
    };
    boosts?: Record<string, number>;
  };
}

/**
 * Entry schema for commits history tracking.
 */
export interface CommitHistoryEntry {
  commitHash: string;
  timestamp: string;
  status: 'success' | 'failed' | 'skipped';
  filesAnalyzed: string[];
  commitMessage: string;
}

/**
 * Schema for history.json.
 */
export interface HistorySchema {
  lastProcessedCommit: string;
  commits: CommitHistoryEntry[];
}

/**
 * Schema for version.json.
 */
export interface VersionSchema {
  version: string;
  memorySchema: number;
  lastMigration: string;
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
