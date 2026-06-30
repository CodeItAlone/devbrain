import { join, dirname, basename } from 'node:path';
import {
  AggregatedAnalysis,
  PROJECT_MEMORY_FILE_NAME,
  CUSTOM_NOTES_FILE_NAME,
} from '@devbrain/shared';
import { FilesystemService } from '../filesystem/filesystem.service.js';

export class MemoryService {
  constructor(private readonly fsService: FilesystemService = new FilesystemService()) {}

  /**
   * Generates memory markdown files and writes them to the specified directory.
   */
  async generateMemory(analysis: AggregatedAnalysis, memoryDir: string): Promise<void> {
    const targetDir = basename(memoryDir) === 'memory' ? dirname(memoryDir) : memoryDir;
    const projectMemoryPath = join(targetDir, PROJECT_MEMORY_FILE_NAME);
    const customNotesPath = join(targetDir, CUSTOM_NOTES_FILE_NAME);

    // Ensure custom_notes.md exists
    if (!(await this.fsService.exists(customNotesPath))) {
      const defaultCustomNotes = [
        '# Custom Developer Notes',
        '',
        'Use this file to document manual project conventions, architecture diagrams, decision logs, or any other notes.',
        'This file will NEVER be overwritten by DevBrain.',
        '',
      ].join('\n');
      await this.fsService.write(customNotesPath, defaultCustomNotes);
    }

    // Build the new unified project memory contents
    const newMarkdown = this.buildProjectMemory(analysis);
    await this.writeSectionBasedMarkdown(projectMemoryPath, newMarkdown);

    // Generate legacy v0.1 files inside memoryDir for 100% backward compatibility
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

  /**
   * Section-based markdown writer to prevent redundant Git diffs.
   */
  private async writeSectionBasedMarkdown(filePath: string, newContent: string): Promise<void> {
    if (!(await this.fsService.exists(filePath))) {
      await this.fsService.write(filePath, newContent);
      return;
    }

    try {
      const oldContent = await this.fsService.read(filePath);

      const oldSections = this.parseSections(oldContent);
      const newSections = this.parseSections(newContent);

      let hasChanges = false;
      const updatedSections: string[] = [];

      const oldPreamble = oldSections.get('__PREAMBLE__') || '';
      const newPreamble = newSections.get('__PREAMBLE__') || '';
      if (oldPreamble !== newPreamble) {
        hasChanges = true;
      }
      updatedSections.push(newPreamble);

      for (const [header, newSecContent] of newSections.entries()) {
        if (header === '__PREAMBLE__') continue;

        const oldSecContent = oldSections.get(header);
        if (oldSecContent !== newSecContent) {
          hasChanges = true;
        }
        updatedSections.push(newSecContent);
      }

      for (const oldHeader of oldSections.keys()) {
        if (oldHeader !== '__PREAMBLE__' && !newSections.has(oldHeader)) {
          hasChanges = true;
        }
      }

      if (hasChanges) {
        const compiled = updatedSections.join('\n').trim() + '\n';
        await this.fsService.writeAtomic(filePath, compiled);
      }
    } catch {
      await this.fsService.writeAtomic(filePath, newContent);
    }
  }

  private parseSections(content: string): Map<string, string> {
    const sections = new Map<string, string>();
    const parts = content.split(/\n(?=## )/);

    let preamble = '';
    for (const part of parts) {
      if (part.startsWith('## ') || part.trim().startsWith('## ')) {
        const lines = part.trim().split('\n');
        const header = lines[0].trim();
        sections.set(header, part);
      } else {
        preamble = part;
      }
    }

    if (preamble) {
      sections.set('__PREAMBLE__', preamble);
    }
    return sections;
  }

  private buildProjectMemory(analysis: AggregatedAnalysis): string {
    const readmeData = analysis.analyzers.readme || {};
    const packageJsonData = analysis.analyzers['package-json'] || {};
    const tsconfigData = analysis.analyzers.tsconfig || {};
    const gitData = analysis.analyzers.git || {};
    const dockerfileData = analysis.analyzers.dockerfile || {};
    const sourceCodeData = analysis.analyzers['source-code'] || {};

    const overview = readmeData.description || 'No project description available.';
    const projectName = analysis.projectName || packageJsonData.name || 'unnamed-project';

    const fileList = [...analysis.files].sort();
    const treeLines = fileList.slice(0, 100).map((f) => `- \`${f}\``).join('\n') + 
      (fileList.length > 100 ? `\n- *...and ${fileList.length - 100} more files*` : '');

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

    const modulesList = (sourceCodeData.modules || [])
      .map((m: any) => `- \`${m.filePath}\` - **${m.name}** (${m.type})`)
      .join('\n') || '- No source modules analyzed.';

    const apisList = (sourceCodeData.apis || [])
      .map((a: any) => `- **${a.method}** \`${a.path}\` (defined in \`${a.file}\`)`)
      .join('\n') || '- No API endpoints detected.';

    const dbList = (sourceCodeData.databaseEntities || [])
      .map((d: string) => `- **${d}**`)
      .join('\n') || '- No entities or model schemas detected.';

    const authList = (sourceCodeData.authMethods || [])
      .map((a: string) => `- **${a}**`)
      .join('\n') || '- No explicit auth pattern identified (defaults to basic credentials/tokens).';

    const extList = (sourceCodeData.externalServices || [])
      .map((e: string) => `- **${e}**`)
      .join('\n') || '- No third-party API integrations detected.';

    const tsconfigOptions = tsconfigData.target
      ? [
          `- **TypeScript Target**: ${tsconfigData.target}`,
          `- **Module System**: ${tsconfigData.module}`,
          `- **Strict Mode**: ${tsconfigData.strict ? 'Enabled' : 'Disabled'}`,
        ].join('\n')
      : '- Standard JavaScript style conventions apply.';

    const commits = gitData.recentCommits || [];
    const commitLines =
      commits
        .map((c: any) => `- **${c.hash}** - ${c.message} (${c.author})`)
        .join('\n') || '- No commits found or git history unavailable';

    return [
      '<!-- ⚠️ THIS FILE IS AUTO-GENERATED BY DEVBRAIN. -->',
      '<!-- DO NOT EDIT. YOUR CHANGES WILL BE OVERWRITTEN. -->',
      '',
      `# Project Memory: ${projectName}`,
      '',
      '## Project Overview',
      overview,
      '',
      '## Tech Stack',
      '### Core Languages & Runtimes',
      techList,
      '',
      '### Frameworks & Libraries',
      fwList,
      '',
      '## Folder Structure',
      `Total Files Tracked: ${analysis.files.length}`,
      '',
      treeLines,
      '',
      '## Features',
      '- Scan file structures recursively',
      '- Map project dependencies',
      '- Perform incremental parsing on change commit events',
      '',
      '## Modules',
      modulesList,
      '',
      '## APIs',
      apisList,
      '',
      '## Database',
      dbList,
      '',
      '## Authentication',
      authList,
      '',
      '## External Services',
      extList,
      '',
      '## Configuration',
      `- Container base image: ${dockerfileData.baseImage || 'None'}`,
      `- Package version: ${packageJsonData.version || '0.0.1'}`,
      '',
      '## Coding Standards',
      tsconfigOptions,
      '',
      '## Recent Changes',
      commitLines,
      '',
      '## Custom Notes',
      `See [custom_notes.md](${CUSTOM_NOTES_FILE_NAME}) for hand-written notes.`,
      '',
    ].join('\n');
  }

  // Legacy generators for 100% backward compatibility
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
      Object.keys(scripts).map((s: string) => `- \`npm run ${s}\``).join('\n') || '- None declared';

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
