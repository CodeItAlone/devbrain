import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { FilesystemService } from '../filesystem/filesystem.service.js';
import { GitService } from './git.service.js';

describe('GitService Hook Management Unit Tests', () => {
  let tempDir: string;
  let fsService: FilesystemService;
  let gitService: GitService;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'devbrain-git-test-'));
    fsService = new FilesystemService();
    gitService = new GitService(tempDir, fsService);
    // Create simulated .git/hooks structure
    await mkdir(join(tempDir, '.git', 'hooks'), { recursive: true });
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it('should install, detect, and remove the post-commit git hook', async () => {
    const hookPath = join(tempDir, '.git', 'hooks', 'post-commit');

    // Initially not installed
    expect(await gitService.isHookInstalled('post-commit')).toBe(false);
    expect(await fsService.exists(hookPath)).toBe(false);

    // Install hook
    await gitService.installHook('post-commit');
    expect(await fsService.exists(hookPath)).toBe(true);
    expect(await gitService.isHookInstalled('post-commit')).toBe(true);

    // Remove hook
    await gitService.removeHook('post-commit');
    expect(await fsService.exists(hookPath)).toBe(false);
    expect(await gitService.isHookInstalled('post-commit')).toBe(false);
  });
});
