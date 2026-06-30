import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { FilesystemService } from '../filesystem/filesystem.service.js';
import { LockManager } from './lock.manager.js';
import { DEVBRAIN_DIR_NAME, LOCK_FILE_NAME } from '@devbrain/shared';

describe('LockManager Unit Tests', () => {
  let tempDir: string;
  let fsService: FilesystemService;
  let lockManager: LockManager;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'devbrain-lock-test-'));
    fsService = new FilesystemService();
    lockManager = new LockManager(tempDir, fsService);
    // Ensure .devbrain directory exists
    const { mkdir } = await import('node:fs/promises');
    await mkdir(join(tempDir, DEVBRAIN_DIR_NAME), { recursive: true });
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it('should successfully acquire, report, and release locks', async () => {
    expect(await lockManager.isLocked()).toBe(false);

    // Acquire lock
    const acquired = await lockManager.acquireLock();
    expect(acquired).toBe(true);
    expect(await lockManager.isLocked()).toBe(true);

    // Try to acquire again
    const reacquired = await lockManager.acquireLock();
    expect(reacquired).toBe(false);

    // Release lock
    await lockManager.releaseLock();
    expect(await lockManager.isLocked()).toBe(false);

    // Should acquire again now
    const reacquired2 = await lockManager.acquireLock();
    expect(reacquired2).toBe(true);
  });

  it('should automatically reclaim stale locks', async () => {
    const lockPath = join(tempDir, DEVBRAIN_DIR_NAME, LOCK_FILE_NAME);
    // Write stale timestamp (15 mins ago)
    const staleTime = Date.now() - 15 * 60 * 1000;
    await fsService.writeAtomic(lockPath, staleTime.toString());

    // Even though lock file exists, isLocked should report false because it is stale
    expect(await lockManager.isLocked()).toBe(false);

    // Should acquire lock successfully by reclaiming the stale lock
    const acquired = await lockManager.acquireLock();
    expect(acquired).toBe(true);
    expect(await lockManager.isLocked()).toBe(true);
  });
});
