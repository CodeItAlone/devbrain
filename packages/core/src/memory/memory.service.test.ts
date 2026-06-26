import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { FilesystemService } from '../filesystem/filesystem.service.js';
import { MemoryService } from './memory.service.js';
import { AggregatedAnalysis } from '@devbrain/shared';

describe('MemoryService', () => {
  let tempDir: string;
  let fsService: FilesystemService;
  let memoryService: MemoryService;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'devbrain-memory-'));
    fsService = new FilesystemService();
    memoryService = new MemoryService(fsService);
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it('should write deterministic markdown documentation files', async () => {
    const mockAnalysis: AggregatedAnalysis = {
      projectName: 'Test App',
      technologies: ['TypeScript', 'Node.js'],
      frameworks: ['Express'],
      metadata: {
        projectLanguage: 'TypeScript',
        projectFramework: 'Express',
      },
      files: ['src/index.ts', 'package.json', 'README.md'],
      analyzers: {
        readme: {
          description: 'A mock project testing MemoryService.',
        },
        'package-json': {
          scripts: ['build', 'test'],
        },
        tsconfig: {
          target: 'es2022',
          module: 'NodeNext',
          strict: true,
          jsx: 'react',
        },
        git: {
          branch: 'main',
          recentCommits: [{ hash: 'a1b2c3d', message: 'Initial commit', author: 'Test Author' }],
        },
      },
    };

    await memoryService.generateMemory(mockAnalysis, tempDir);

    // Verify files exist and match exactly
    const summary = await readFile(join(tempDir, 'summary.md'), 'utf8');
    const stack = await readFile(join(tempDir, 'stack.md'), 'utf8');
    const rules = await readFile(join(tempDir, 'rules.md'), 'utf8');
    const timeline = await readFile(join(tempDir, 'timeline.md'), 'utf8');

    expect(summary).toContain('# Project Summary: Test App');
    expect(summary).toContain('- package.json');
    expect(summary).toContain('- src/index.ts');

    expect(stack).toContain('# Technology Stack');
    expect(stack).toContain('- **TypeScript**');

    expect(rules).toContain('- **TypeScript Target**: es2022');
    expect(rules).toContain('- **Strict Type Checking**: Enabled');

    expect(timeline).toContain('- **a1b2c3d** - Initial commit (Test Author)');

    // Run again and verify identical output (determinism)
    const summary2 = await readFile(join(tempDir, 'summary.md'), 'utf8');
    expect(summary).toBe(summary2);
  });
});
