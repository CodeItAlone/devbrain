import { join } from 'node:path';
import { ProjectContext, AnalysisResult } from '@devbrain/shared';
import { Analyzer } from '../analyzer.interface.js';
import { simpleGit } from 'simple-git';
import { FilesystemService } from '../../filesystem/filesystem.service.js';

/**
 * Analyzer for Git repository metrics.
 */
export class GitAnalyzer implements Analyzer {
  readonly id = 'git';
  readonly name = 'Git Repository Analyzer';

  constructor(private readonly fsService = new FilesystemService()) {}

  async supports(project: ProjectContext): Promise<boolean> {
    // Check if .git directory/metadata exists
    const gitHeadPath = join(project.cwd, '.git/HEAD');
    return await this.fsService.exists(gitHeadPath);
  }

  async analyze(project: ProjectContext): Promise<AnalysisResult> {
    const git = simpleGit({ baseDir: project.cwd });
    let branch = 'unknown';
    let commits: any[] = [];
    let remotes: any[] = [];

    try {
      const status = await git.status();
      branch = status.current || 'unknown';

      const log = await git.log({ maxCount: 5 });
      commits = log.all.map((c: any) => ({
        hash: c.hash.substring(0, 7),
        date: c.date,
        message: c.message,
        author: c.author_name,
      }));

      const rawRemotes = await git.getRemotes(true);
      remotes = rawRemotes.map((r: any) => ({
        name: r.name,
        refs: r.refs,
      }));
    } catch {
      // Graceful fallback if git commands fail
    }

    return {
      analyzerId: this.id,
      analyzerName: this.name,
      data: {
        branch,
        recentCommits: commits,
        remotes,
      },
    };
  }
}
