import { join } from 'node:path';
import { AggregatedAnalysis } from '@devbrain/shared';
import { FilesystemService } from '../filesystem/filesystem.service.js';

/**
 * Service responsible for generating deterministic, human-readable markdown project documentation.
 */
export class MemoryService {
  constructor(private readonly fsService: FilesystemService = new FilesystemService()) {}

  /**
   * Generates memory markdown files and writes them to the specified directory.
   */
  async generateMemory(analysis: AggregatedAnalysis, memoryDir: string): Promise<void> {
    const summary = this.buildSummary(analysis);
    const stack = this.buildStack(analysis);
    const architecture = this.buildArchitecture(analysis);
    const features = this.buildFeatures(analysis);
    const rules = this.buildRules(analysis);
    const timeline = this.buildTimeline(analysis);

    await this.fsService.write(join(memoryDir, 'summary.md'), summary);
    await this.fsService.write(join(memoryDir, 'stack.md'), stack);
    await this.fsService.write(join(memoryDir, 'architecture.md'), architecture);
    await this.fsService.write(join(memoryDir, 'features.md'), features);
    await this.fsService.write(join(memoryDir, 'rules.md'), rules);
    await this.fsService.write(join(memoryDir, 'timeline.md'), timeline);
  }

  private buildSummary(analysis: AggregatedAnalysis): string {
    const readmeData = analysis.analyzers.readme || {};
    const packageJsonData = analysis.analyzers['package-json'] || {};
    const overview = readmeData.description || 'No project description available.';
    const projectName = analysis.projectName || packageJsonData.name || 'unnamed-project';

    const fileList = [...analysis.files].sort();
    const treeLines = fileList.map((f) => `- ${f}`).join('\n');

    return [
      `# Project Summary: ${projectName}`,
      '',
      '## Overview',
      overview,
      '',
      '## Repository Structure',
      `Total Files Tracked: ${analysis.files.length}`,
      '',
      treeLines,
      '',
    ].join('\n');
  }

  private buildStack(analysis: AggregatedAnalysis): string {
    const techList =
      [...analysis.technologies]
        .sort()
        .map((t) => `- **${t}**`)
        .join('\n') || '- None detected';
    const fwList =
      [...analysis.frameworks]
        .sort()
        .map((f) => `- **${f}**`)
        .join('\n') || '- None detected';

    return [
      '# Technology Stack',
      '',
      '## Core Languages & Runtimes',
      techList,
      '',
      '## Frameworks & Libraries',
      fwList,
      '',
    ].join('\n');
  }

  private buildArchitecture(analysis: AggregatedAnalysis): string {
    const packageJsonData = analysis.analyzers['package-json'] || {};
    const dockerfileData = analysis.analyzers.dockerfile || {};

    const backendTech = analysis.technologies.includes('Node.js') ? 'Node.js' : 'unknown';
    const buildTool = packageJsonData.dependencies ? 'npm' : 'unknown';
    const dockerBase = dockerfileData.baseImage
      ? `Docker (Base image: ${dockerfileData.baseImage})`
      : 'None detected';

    return [
      '# Project Architecture',
      '',
      '## Layers & Runtimes',
      `- **Backend Runtime**: ${backendTech}`,
      `- **Build / Package Manager**: ${buildTool}`,
      `- **Containerization / Deployment**: ${dockerBase}`,
      '',
      '## Module System & Standards',
      `- **Primary Language**: ${analysis.metadata.projectLanguage || 'unknown'}`,
      `- **Default Framework**: ${analysis.metadata.projectFramework || 'None'}`,
      '',
    ].join('\n');
  }

  private buildFeatures(analysis: AggregatedAnalysis): string {
    const packageJsonData = analysis.analyzers['package-json'] || {};
    const scripts = packageJsonData.scripts || [];

    // Scan file paths to infer feature areas
    const features: string[] = [];
    const files = analysis.files;

    if (files.some((f) => f.includes('controller')))
      features.push('Controller layer (business routing)');
    if (files.some((f) => f.includes('route'))) features.push('API routing definition');
    if (files.some((f) => f.includes('component') || f.includes('view')))
      features.push('UI components / presentation layer');
    if (files.some((f) => f.includes('service') || f.includes('provider')))
      features.push('Service integrations / business logic');
    if (files.some((f) => f.includes('model') || f.includes('entity')))
      features.push('Data models / entity schemas');
    if (files.some((f) => f.includes('tests/') || f.endsWith('.test.ts') || f.endsWith('.spec.ts')))
      features.push('Unit/Integration Testing suite');

    const featureList =
      features.map((f) => `- ${f}`).join('\n') || '- Basic codebase files structure';
    const scriptsList =
      scripts.map((s: string) => `- \`npm run ${s}\``).join('\n') || '- None declared';

    return [
      '# Product Features',
      '',
      '## Codebase Feature Capabilities',
      featureList,
      '',
      '## Runnable Project Commands',
      scriptsList,
      '',
    ].join('\n');
  }

  private buildRules(analysis: AggregatedAnalysis): string {
    const tsconfigData = analysis.analyzers.tsconfig || {};

    const rules = [
      '# Project Coding Rules & Conventions',
      '',
      '## Compiler Options & Code Style Standards',
    ];

    if (tsconfigData.target) {
      rules.push(`- **TypeScript Target**: ${tsconfigData.target}`);
      rules.push(`- **Module System**: ${tsconfigData.module}`);
      rules.push(`- **Strict Type Checking**: ${tsconfigData.strict ? 'Enabled' : 'Disabled'}`);
      rules.push(`- **JSX Engine**: ${tsconfigData.jsx}`);
    } else {
      rules.push('- No TypeScript rules detected. Applying default ES rules.');
    }

    rules.push(
      '',
      '## General Architecture Rules',
      '- Enforce clean boundaries: CLI layer -> Core layer -> Shared utility layer.',
      '- Modular composition preferred over inheritance patterns.',
      '',
    );

    return rules.join('\n');
  }

  private buildTimeline(analysis: AggregatedAnalysis): string {
    const gitData = analysis.analyzers.git || {};
    const commits = gitData.recentCommits || [];

    const commitLines =
      commits.map((c: any) => `- **${c.hash}** - ${c.message} (${c.author})`).join('\n') ||
      '- No commits found or git history unavailable';
    const branch = gitData.branch || 'unknown';

    return [
      '# Project Timeline & History',
      '',
      '## Git Metrics',
      `- **Current Branch**: ${branch}`,
      '',
      '## Recent Commit Log',
      commitLines,
      '',
    ].join('\n');
  }
}
