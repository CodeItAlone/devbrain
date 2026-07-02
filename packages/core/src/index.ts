// Public API exports for @devbrain/core

export { FilesystemService } from './filesystem/filesystem.service.js';
export { RepositoryScanner, ScanOptions } from './analysis/scanner.js';
export { Analyzer } from './analysis/analyzer.interface.js';
export { AnalyzerRegistry } from './analysis/analyzer.registry.js';
export { MemoryService } from './memory/memory.service.js';
export { ContextService } from './context/context.service.js';
export { GitService } from './git/git.service.js';
export { LockManager } from './engine/lock.manager.js';
export { LoggerService } from './engine/logger.service.js';
export { HistoryManager } from './engine/history.manager.js';
export { DependencyResolver } from './engine/dependency.resolver.js';
export { MemoryEngine } from './engine/memory.engine.js';

// Concrete Analyzer exports
export { ReadmeAnalyzer } from './analysis/analyzers/readme.analyzer.js';
export { PackageJsonAnalyzer } from './analysis/analyzers/package-json.analyzer.js';
export { TsconfigAnalyzer } from './analysis/analyzers/tsconfig.analyzer.js';
export { GitAnalyzer } from './analysis/analyzers/git.analyzer.js';
export { DockerfileAnalyzer } from './analysis/analyzers/docker.analyzer.js';
export { RequirementsTxtAnalyzer } from './analysis/analyzers/requirements-txt.analyzer.js';
export { PomXmlAnalyzer } from './analysis/analyzers/pom-xml.analyzer.js';
export { BuildGradleAnalyzer } from './analysis/analyzers/build-gradle.analyzer.js';
export { SourceCodeAnalyzer } from './analysis/analyzers/source-code.analyzer.js';

// Semantic Search & Local Embeddings v0.3
export { EmbeddingProvider } from './embeddings/EmbeddingProvider.js';
export { TransformersProvider } from './embeddings/TransformersProvider.js';
export { VectorChunk, VectorStore } from './index/VectorStore.js';
export { SQLiteVectorStore } from './index/SQLiteVectorStore.js';
export { VectorIndexer } from './index/VectorIndexer.js';
export { RankingEngine, GitCommitInfo } from './retrieval/RankingEngine.js';
export { RetrievedMemory, SemanticRetriever } from './retrieval/SemanticRetriever.js';
export { ContextBuilder } from './retrieval/ContextBuilder.js';
