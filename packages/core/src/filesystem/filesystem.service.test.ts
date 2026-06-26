import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { FilesystemService } from './filesystem.service.js';
import { FilesystemError } from '@devbrain/shared';

describe('FilesystemService', () => {
  let tempDir: string;
  let fsService: FilesystemService;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'devbrain-test-'));
    fsService = new FilesystemService();
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it('should write and read files', async () => {
    const filePath = join(tempDir, 'sub/dir/test.txt');
    const content = 'Hello, DevBrain!';

    await fsService.write(filePath, content);
    const readContent = await fsService.read(filePath);

    expect(readContent).toBe(content);
  });

  it('should check file existence', async () => {
    const filePath = join(tempDir, 'exists.txt');
    expect(await fsService.exists(filePath)).toBe(false);

    await fsService.write(filePath, 'exists');
    expect(await fsService.exists(filePath)).toBe(true);
  });

  it('should write and read JSON files atomically', async () => {
    const jsonPath = join(tempDir, 'data.json');
    const data = { version: '0.1.0', active: true };

    await fsService.writeJson(jsonPath, data);
    const readData = await fsService.readJson<typeof data>(jsonPath);

    expect(readData).toEqual(data);
  });

  it('should throw FilesystemError when reading non-existent file', async () => {
    const nonExistentPath = join(tempDir, 'does-not-exist.txt');
    await expect(fsService.read(nonExistentPath)).rejects.toThrow(FilesystemError);
  });
});
