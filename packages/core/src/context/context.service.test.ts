import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { FilesystemService } from '../filesystem/filesystem.service.js';
import { ContextService } from './context.service.js';
import { ValidationError } from '@devbrain/shared';

describe('ContextService', () => {
  let tempDir: string;
  let fsService: FilesystemService;
  let contextService: ContextService;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'devbrain-context-'));
    fsService = new FilesystemService();
    contextService = new ContextService(fsService);
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it('should compile and normalize memory files', async () => {
    // Write sample memory files
    await fsService.write(join(tempDir, 'summary.md'), '# Summary\nThis is overview.');
    await fsService.write(join(tempDir, 'stack.md'), '# Tech Stack\n## Languages\n- TS');

    const result = await contextService.buildContext(tempDir);

    expect(result).toContain('# DEVBRAIN PROJECT CONTEXT INDEX');
    expect(result).toContain('## SECTION: SUMMARY');
    expect(result).toContain('### Summary'); // Translated from # Summary
    expect(result).toContain('## SECTION: STACK');
    expect(result).toContain('### Tech Stack'); // Translated from # Tech Stack
    expect(result).toContain('#### Languages'); // Translated from ## Languages
  });

  it('should throw ValidationError if memory folder does not exist', async () => {
    const missingDir = join(tempDir, 'does-not-exist');
    await expect(contextService.buildContext(missingDir)).rejects.toThrow(ValidationError);
  });
});
