import { rmSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

const pathsToClean = [
  // Shared Package artifacts
  join(rootDir, 'packages/shared/dist'),
  join(rootDir, 'packages/shared/tsconfig.tsbuildinfo'),
  // Core Package artifacts
  join(rootDir, 'packages/core/dist'),
  join(rootDir, 'packages/core/tsconfig.tsbuildinfo'),
  // CLI Package artifacts
  join(rootDir, 'packages/cli/dist'),
  join(rootDir, 'packages/cli/tsconfig.tsbuildinfo'),
  join(rootDir, 'packages/cli/node_modules/@devbrain'),
  // Root tsconfig info
  join(rootDir, 'tsconfig.tsbuildinfo'),
];

console.log('Starting repository cleanup...');

// Clean specified paths
for (const p of pathsToClean) {
  if (existsSync(p)) {
    try {
      console.log(`Cleaning: ${p}`);
      rmSync(p, { recursive: true, force: true });
    } catch (err) {
      console.error(`Failed to remove ${p}:`, err.message);
    }
  }
}

// Recursively look for any leftover .tgz packages in the root directory
try {
  const rootFiles = readdirSync(rootDir);
  for (const file of rootFiles) {
    if (file.endsWith('.tgz')) {
      const p = join(rootDir, file);
      console.log(`Cleaning tarball: ${p}`);
      rmSync(p, { force: true });
    }
  }
} catch (err) {
  console.error('Error scanning root directory for tarballs:', err.message);
}

console.log('Cleanup completed successfully.');
