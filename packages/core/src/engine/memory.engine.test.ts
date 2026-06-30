import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { FilesystemService } from '../filesystem/filesystem.service.js';
import { MemoryEngine } from './memory.engine.js';
import { DEVBRAIN_DIR_NAME, MEMORY_FILE_NAME, DevBrainConfig } from '@devbrain/shared';

describe('MemoryEngine Unit Tests', () => {
  let tempDir: string;
  let fsService: FilesystemService;
  let config: DevBrainConfig;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'devbrain-mem-engine-test-'));
    fsService = new FilesystemService();
    config = {
      version: '0.2.0',
      project: { name: 'Test App' },
      scanner: { ignore: [], followSymlinks: false, respectGitignore: false },
      memory: { format: 'markdown', directory: `${DEVBRAIN_DIR_NAME}/memory` },
    };

    // Create .devbrain folder
    const { mkdir } = await import('node:fs/promises');
    await mkdir(join(tempDir, DEVBRAIN_DIR_NAME), { recursive: true });
    await mkdir(join(tempDir, DEVBRAIN_DIR_NAME, 'memory'), { recursive: true });
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it('should run full scan if memory.json does not exist', async () => {
    await fsService.write(join(tempDir, 'README.md'), '# Mock Project');
    
    const engine = new MemoryEngine(tempDir, config, fsService);
    const memory = await engine.loadMemory();

    expect(memory.projectName).toBe('Test App');
    expect(memory.files).toContain('README.md');
    expect(await fsService.exists(join(tempDir, DEVBRAIN_DIR_NAME, MEMORY_FILE_NAME))).toBe(true);
  });

  it('should incrementally merge and purge deleted files', async () => {
    // Write original project
    await fsService.write(join(tempDir, 'src/main.ts'), 'console.log(1);');
    await fsService.write(join(tempDir, 'src/user.service.ts'), 'class UserService {}');
    
    const engine = new MemoryEngine(tempDir, config, fsService);
    await engine.runFullScan();

    // Now modify user.service.ts and delete main.ts
    await fsService.write(join(tempDir, 'src/user.service.ts'), 'class UserService { getUser() {} }');
    await rm(join(tempDir, 'src/main.ts'), { force: true });

    // Perform incremental learning
    const updated = await engine.incrementalLearn(
      ['src/user.service.ts'],
      ['src/main.ts'],
      [],
    );

    expect(updated.files).toContain('src/user.service.ts');
    expect(updated.files).not.toContain('src/main.ts');

    // Check modules inside source code analyzer are updated
    const scData = updated.analyzers['source-code'];
    expect(scData).toBeDefined();
    
    const userServiceModule = scData.modules.find((m: any) => m.filePath === 'src/user.service.ts');
    expect(userServiceModule).toBeDefined();
    expect(userServiceModule.classes).toContain('UserService');
    expect(userServiceModule.functions).toBeDefined();
    
    const mainModule = scData.modules.find((m: any) => m.filePath === 'src/main.ts');
    expect(mainModule).toBeUndefined();
  });
});
