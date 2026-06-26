import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { FilesystemService } from '../filesystem/filesystem.service.js';
import { RepositoryScanner } from './scanner.js';

describe('RepositoryScanner', () => {
  let tempDir: string;
  let fsService: FilesystemService;
  let scanner: RepositoryScanner;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'devbrain-scanner-'));
    fsService = new FilesystemService();
    scanner = new RepositoryScanner(fsService);
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it('should scan and return all files excluding ignored ones', async () => {
    // Write mock directory files
    await fsService.write(join(tempDir, 'src/main.ts'), 'console.log("hello");');
    await fsService.write(join(tempDir, 'README.md'), '# Mock Project');
    await fsService.write(join(tempDir, 'node_modules/dep/index.js'), 'bad');
    await fsService.write(join(tempDir, '.git/config'), 'git details');

    const files = await scanner.scan(tempDir);

    expect(files.sort()).toEqual(['README.md', 'src/main.ts'].sort());
  });

  it('should respect .gitignore file rules', async () => {
    await fsService.write(join(tempDir, 'src/main.ts'), 'code');
    await fsService.write(join(tempDir, 'secrets.json'), 'secret details');
    await fsService.write(join(tempDir, '.gitignore'), 'secrets.json\n# comments\n');

    const files = await scanner.scan(tempDir, { respectGitignore: true });

    expect(files.sort()).toEqual(['.gitignore', 'src/main.ts'].sort());
  });

  it('should support custom ignore rules', async () => {
    await fsService.write(join(tempDir, 'src/main.ts'), 'code');
    await fsService.write(join(tempDir, 'docs/readme.md'), 'docs');

    const files = await scanner.scan(tempDir, {
      ignore: ['**/docs/**'],
    });

    expect(files).toEqual(['src/main.ts']);
  });
});
