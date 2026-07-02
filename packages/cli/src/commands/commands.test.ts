import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { InitCommand } from './init.command.js';
import { LearnCommand } from './learn.command.js';
import { ContextCommand } from './context.command.js';
import { FilesystemService } from '@devbrain/core';

describe('CLI Commands Integration Tests', () => {
  let tempDir: string;
  let fsService: FilesystemService;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'devbrain-cli-cmd-test-'));
    fsService = new FilesystemService();
    // Stub process.exit to prevent test runner from exiting
    vi.stubGlobal('process', {
      ...process,
      exit: vi.fn(),
    });
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  it('should successfully run the full lifecycle init -> learn -> context', async () => {
    // 1. Run InitCommand
    const initCmd = new InitCommand();
    await initCmd.execute(tempDir, false, {});

    const configPath = join(tempDir, '.devbrain/config.json');
    expect(await fsService.exists(configPath)).toBe(true);

    const configData = await fsService.readJson<any>(configPath);
    expect(configData.project.name).toBeDefined();

    // Write a mock file inside target workspace to be processed
    await fsService.write(
      join(tempDir, 'README.md'),
      '# Mock Project\nThis is a mock application README.',
    );
    await fsService.write(
      join(tempDir, 'package.json'),
      JSON.stringify({ name: 'mock-package', version: '1.0.0' }),
    );

    // 2. Run LearnCommand
    const learnCmd = new LearnCommand();
    await learnCmd.execute(tempDir, false, {});

    const memoryDir = join(tempDir, '.devbrain/memory');
    expect(await fsService.exists(join(memoryDir, 'summary.md'))).toBe(true);
    expect(await fsService.exists(join(memoryDir, 'stack.md'))).toBe(true);

    // 3. Run ContextCommand (we mock console.log to capture the output)
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const contextCmd = new ContextCommand();
    await contextCmd.execute(tempDir, false, {});

    expect(logSpy).toHaveBeenCalled();
    const printedOutput = logSpy.mock.calls[0][0];
    expect(printedOutput).toContain('# DEVBRAIN AI CONTEXT');
    expect(printedOutput).toContain('## Tech Stack & Language');

    logSpy.mockRestore();
  });

  it('should fail init command when already initialized and no --force passed', async () => {
    const initCmd = new InitCommand();
    // First run
    await initCmd.execute(tempDir, false, {});

    // Stub process.exit
    const exitMock = vi.fn();
    vi.stubGlobal('process', {
      ...process,
      exit: exitMock,
    });

    // Second run without force should trigger error and exit
    await initCmd.execute(tempDir, false, {});
    expect(exitMock).toHaveBeenCalledWith(1);
  });

  it('should decoupling memory sync and vector sync, recreate vectors.db on unchanged HEAD, repair index, and index all memory .md files', async () => {
    // 1. Setup workspace
    const initCmd = new InitCommand();
    await initCmd.execute(tempDir, false, {});

    await fsService.write(
      join(tempDir, 'README.md'),
      '# Decoupled Project\nThis is a testing readme.',
    );
    await fsService.write(
      join(tempDir, 'package.json'),
      JSON.stringify({ name: 'decoupled-package', version: '1.0.0' }),
    );

    // 2. Run learn command to initialize memory and vectors
    const learnCmd = new LearnCommand();
    await learnCmd.execute(tempDir, false, {});

    const dbPath = join(tempDir, '.devbrain/vectors.db');
    expect(await fsService.exists(dbPath)).toBe(true);

    // 3. Delete vectors.db manually
    const { unlink } = await import('node:fs/promises');
    await unlink(dbPath);
    expect(await fsService.exists(dbPath)).toBe(false);

    // 4. Run learn command again WITHOUT changing HEAD
    await learnCmd.execute(tempDir, false, {});
    expect(await fsService.exists(dbPath)).toBe(true);

    // 5. Test repair mode
    await learnCmd.execute(tempDir, false, { repair: true });
    expect(await fsService.exists(dbPath)).toBe(true);
  });
});
