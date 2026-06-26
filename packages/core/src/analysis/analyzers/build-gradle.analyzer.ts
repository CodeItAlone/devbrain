import { join } from 'node:path';
import { ProjectContext, AnalysisResult } from '@devbrain/shared';
import { Analyzer } from '../analyzer.interface.js';
import { FilesystemService } from '../../filesystem/filesystem.service.js';

/**
 * Analyzer for Gradle build.gradle configuration files.
 */
export class BuildGradleAnalyzer implements Analyzer {
  readonly id = 'build-gradle';
  readonly name = 'Gradle Build Analyzer';

  constructor(private readonly fsService = new FilesystemService()) {}

  async supports(project: ProjectContext): Promise<boolean> {
    return project.files.some((f) => f === 'build.gradle' || f === 'build.gradle.kts');
  }

  async analyze(project: ProjectContext): Promise<AnalysisResult> {
    const file = project.files.find((f) => f === 'build.gradle' || f === 'build.gradle.kts')!;
    const path = join(project.cwd, file);
    const content = await this.fsService.read(path);

    const dependencies: string[] = [];
    const frameworks: string[] = [];

    // Extract dependencies using simple regex matches (e.g. implementation 'group:name:version' or implementation("group:name:version"))
    const depRegex =
      /(?:implementation|api|compileOnly|runtimeOnly)\s*\(?\s*['"]([^'"]+)['"]\s*\)?/g;
    let match;
    while ((match = depRegex.exec(content)) !== null) {
      const depString = match[1];
      dependencies.push(depString);
      if (depString.includes('spring-boot') || depString.includes('springboot')) {
        frameworks.push('Spring Boot');
      }
    }

    const groupMatch = content.match(/group\s*=\s*['"]([^'"]+)['"]/);
    const group = groupMatch ? groupMatch[1] : 'unknown';

    const versionMatch = content.match(/version\s*=\s*['"]([^'"]+)['"]/);
    const version = versionMatch ? versionMatch[1] : 'unknown';

    return {
      analyzerId: this.id,
      analyzerName: this.name,
      data: {
        group,
        version,
        dependencies,
        frameworks,
        technologies: ['Java', 'Gradle'],
        metadata: {
          projectLanguage: 'Java',
          projectFramework: frameworks[0] || 'Java Gradle base',
        },
      },
    };
  }
}
