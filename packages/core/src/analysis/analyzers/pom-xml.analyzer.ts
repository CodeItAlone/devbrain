import { join } from 'node:path';
import { ProjectContext, AnalysisResult } from '@devbrain/shared';
import { Analyzer } from '../analyzer.interface.js';
import { XMLParser } from 'fast-xml-parser';
import { FilesystemService } from '../../filesystem/filesystem.service.js';

/**
 * Analyzer for Maven pom.xml configuration files.
 */
export class PomXmlAnalyzer implements Analyzer {
  readonly id = 'pom-xml';
  readonly name = 'Maven POM Analyzer';

  constructor(private readonly fsService = new FilesystemService()) {}

  async supports(project: ProjectContext): Promise<boolean> {
    return project.files.some((f) => f === 'pom.xml');
  }

  async analyze(project: ProjectContext): Promise<AnalysisResult> {
    const file = project.files.find((f) => f === 'pom.xml')!;
    const path = join(project.cwd, file);
    const content = await this.fsService.read(path);

    let groupId = 'unknown';
    let artifactId = 'unknown';
    let version = 'unknown';
    const dependencies: string[] = [];
    const frameworks: string[] = [];

    try {
      const parser = new XMLParser();
      const xml = parser.parse(content);
      const projectNode = xml.project || {};

      groupId = projectNode.groupId || projectNode.parent?.groupId || 'unknown';
      artifactId = projectNode.artifactId || 'unknown';
      version = projectNode.version || projectNode.parent?.version || 'unknown';

      // Parse dependencies
      let depsList = projectNode.dependencies?.dependency;
      if (depsList) {
        if (!Array.isArray(depsList)) {
          depsList = [depsList];
        }
        for (const dep of depsList) {
          if (dep.artifactId) {
            dependencies.push(dep.artifactId);
            if (dep.artifactId.includes('spring-boot')) {
              frameworks.push('Spring Boot');
            }
          }
        }
      }
    } catch {
      // Graceful fallback
    }

    return {
      analyzerId: this.id,
      analyzerName: this.name,
      data: {
        groupId,
        artifactId,
        version,
        dependencies,
        frameworks,
        technologies: ['Java', 'Maven'],
        metadata: {
          projectLanguage: 'Java',
          projectFramework: frameworks[0] || 'Java Maven base',
        },
      },
    };
  }
}
