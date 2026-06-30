import { join } from 'node:path';
import { AggregatedAnalysis, DEVBRAIN_DIR_NAME, MEMORY_FILE_NAME, DevBrainConfig } from '@devbrain/shared';
import { FilesystemService } from '../filesystem/filesystem.service.js';
import { AnalyzerRegistry } from '../analysis/analyzer.registry.js';
import { ReadmeAnalyzer } from '../analysis/analyzers/readme.analyzer.js';
import { PackageJsonAnalyzer } from '../analysis/analyzers/package-json.analyzer.js';
import { TsconfigAnalyzer } from '../analysis/analyzers/tsconfig.analyzer.js';
import { GitAnalyzer } from '../analysis/analyzers/git.analyzer.js';
import { DockerfileAnalyzer } from '../analysis/analyzers/docker.analyzer.js';
import { RequirementsTxtAnalyzer } from '../analysis/analyzers/requirements-txt.analyzer.js';
import { PomXmlAnalyzer } from '../analysis/analyzers/pom-xml.analyzer.js';
import { BuildGradleAnalyzer } from '../analysis/analyzers/build-gradle.analyzer.js';
import { SourceCodeAnalyzer } from '../analysis/analyzers/source-code.analyzer.js';
import { RepositoryScanner } from '../analysis/scanner.js';

export class MemoryEngine {
  private readonly memoryPath: string;
  private readonly registry: AnalyzerRegistry;

  constructor(
    private readonly cwd: string,
    private readonly config: DevBrainConfig,
    private readonly fsService: FilesystemService = new FilesystemService(),
  ) {
    this.memoryPath = join(cwd, DEVBRAIN_DIR_NAME, MEMORY_FILE_NAME);

    // Setup analyzer registry
    this.registry = new AnalyzerRegistry();
    this.registry.register(new ReadmeAnalyzer(this.fsService));
    this.registry.register(new PackageJsonAnalyzer(this.fsService));
    this.registry.register(new TsconfigAnalyzer(this.fsService));
    this.registry.register(new GitAnalyzer(this.fsService));
    this.registry.register(new DockerfileAnalyzer(this.fsService));
    this.registry.register(new RequirementsTxtAnalyzer(this.fsService));
    this.registry.register(new PomXmlAnalyzer(this.fsService));
    this.registry.register(new BuildGradleAnalyzer(this.fsService));
    this.registry.register(new SourceCodeAnalyzer(this.fsService));
  }

  /**
   * Loads memory.json or runs a full scan to create it.
   */
  async loadMemory(): Promise<AggregatedAnalysis> {
    try {
      if (await this.fsService.exists(this.memoryPath)) {
        return await this.fsService.readJson<AggregatedAnalysis>(this.memoryPath);
      }
    } catch {
      // Fall through to full scan if error
    }

    // Run full scan if no memory file
    return await this.runFullScan();
  }

  /**
   * Persists memory.json.
   */
  async saveMemory(memory: AggregatedAnalysis): Promise<void> {
    await this.fsService.writeJson(this.memoryPath, memory);
  }

  /**
   * Run a full project scan.
   */
  async runFullScan(): Promise<AggregatedAnalysis> {
    const scanner = new RepositoryScanner(this.fsService);
    const files = await scanner.scan(this.cwd, {
      ignore: this.config.scanner.ignore,
      followSymlinks: this.config.scanner.followSymlinks,
      respectGitignore: this.config.scanner.respectGitignore,
    });

    const projectContext = {
      cwd: this.cwd,
      files,
      config: this.config,
    };

    const analysis = await this.registry.runAll(projectContext);
    await this.saveMemory(analysis);
    return analysis;
  }

  /**
   * Performs an incremental learning phase on modified/deleted/renamed files.
   */
  async incrementalLearn(
    modifiedFiles: string[],
    deletedFiles: string[],
    renamedFiles: { from: string; to: string }[],
  ): Promise<AggregatedAnalysis> {
    const memory = await this.loadMemory();

    // 1. Process deletions
    const deletedSet = new Set(deletedFiles);
    for (const rename of renamedFiles) {
      deletedSet.add(rename.from);
    }

    // Filter memory files list
    memory.files = memory.files.filter((f) => !deletedSet.has(f));

    // Handle source code file removal from modules cache
    if (memory.analyzers['source-code']) {
      const scData = memory.analyzers['source-code'];
      if (scData.modules) {
        scData.modules = scData.modules.filter((m: any) => !deletedSet.has(m.filePath));
      }
      if (scData.apis) {
        scData.apis = scData.apis.filter((a: any) => !deletedSet.has(a.file));
      }
    }

    // 2. Process renames (add the 'to' file)
    for (const rename of renamedFiles) {
      if (!memory.files.includes(rename.to)) {
        memory.files.push(rename.to);
      }
    }

    // 3. Process modifications and additions
    const filesToAnalyze = [...modifiedFiles, ...renamedFiles.map((r) => r.to)];
    
    // Add unique entries to files list
    for (const file of filesToAnalyze) {
      if (!memory.files.includes(file)) {
        memory.files.push(file);
      }
    }

    if (filesToAnalyze.length > 0) {
      const projectContext = {
        cwd: this.cwd,
        files: filesToAnalyze,
        config: this.config,
      };

      const incrementalAnalysis = await this.registry.runAll(projectContext);

      // Merge incremental analysis results back to main memory
      this.mergeIncrementalResults(memory, incrementalAnalysis, filesToAnalyze);
    }

    // Re-aggregate globals from updated source code modules
    if (memory.analyzers['source-code']) {
      const scData = memory.analyzers['source-code'];
      const dbEntities = new Set<string>();
      const authMethods = new Set<string>();
      const extServices = new Set<string>();

      if (scData.modules) {
        for (const mod of scData.modules) {
          if (mod.type === 'model' && mod.classes) {
            for (const c of mod.classes) dbEntities.add(c);
          }
          // Scan for Auth in name
          if (/auth|jwt|passport|login|session/i.test(mod.name)) {
            authMethods.add('Token/Credentials');
          }
          // imports
          if (mod.imports) {
            for (const imp of mod.imports) {
              if (['axios', 'stripe', 'twilio', 'aws-sdk', 'redis', '@google-cloud/'].some(s => imp.includes(s))) {
                extServices.add(imp);
              }
            }
          }
        }
      }
      scData.databaseEntities = Array.from(dbEntities);
      scData.authMethods = Array.from(authMethods);
      scData.externalServices = Array.from(extServices);
    }

    await this.saveMemory(memory);
    return memory;
  }

  private mergeIncrementalResults(
    main: AggregatedAnalysis,
    inc: AggregatedAnalysis,
    analyzedFiles: string[],
  ): void {
    // Merge core lists
    main.technologies = Array.from(new Set([...main.technologies, ...inc.technologies]));
    main.frameworks = Array.from(new Set([...main.frameworks, ...inc.frameworks]));
    Object.assign(main.metadata, inc.metadata);

    const analyzedSet = new Set(analyzedFiles);

    // Merge analyzer blocks
    for (const [id, incData] of Object.entries(inc.analyzers)) {
      if ((incData as any).error) continue;

      if (id === 'source-code') {
        if (!main.analyzers['source-code']) {
          main.analyzers['source-code'] = { modules: [], apis: [] };
        }
        const mainSc = main.analyzers['source-code'];
        
        // Remove existing items for analyzed files
        if (mainSc.modules) {
          mainSc.modules = mainSc.modules.filter((m: any) => !analyzedSet.has(m.filePath));
        } else {
          mainSc.modules = [];
        }
        if (mainSc.apis) {
          mainSc.apis = mainSc.apis.filter((a: any) => !analyzedSet.has(a.file));
        } else {
          mainSc.apis = [];
        }

        // Add new items
        if (incData.modules) {
          mainSc.modules.push(...incData.modules);
        }
        if (incData.apis) {
          mainSc.apis.push(...incData.apis);
        }
      } else {
        // Configuration files analyzers return repo-wide details, overwrite them
        main.analyzers[id] = incData;
      }
    }
  }
}
