// Public API exports for @devbrain/core

export { FilesystemService } from './filesystem/filesystem.service.js';
export { RepositoryScanner, ScanOptions } from './analysis/scanner.js';
export { Analyzer } from './analysis/analyzer.interface.js';
export { AnalyzerRegistry } from './analysis/analyzer.registry.js';
export { MemoryService } from './memory/memory.service.js';
export { ContextService } from './context/context.service.js';

// Concrete Analyzer exports
export { ReadmeAnalyzer } from './analysis/analyzers/readme.analyzer.js';
export { PackageJsonAnalyzer } from './analysis/analyzers/package-json.analyzer.js';
export { TsconfigAnalyzer } from './analysis/analyzers/tsconfig.analyzer.js';
export { GitAnalyzer } from './analysis/analyzers/git.analyzer.js';
export { DockerfileAnalyzer } from './analysis/analyzers/docker.analyzer.js';
export { RequirementsTxtAnalyzer } from './analysis/analyzers/requirements-txt.analyzer.js';
export { PomXmlAnalyzer } from './analysis/analyzers/pom-xml.analyzer.js';
export { BuildGradleAnalyzer } from './analysis/analyzers/build-gradle.analyzer.js';
