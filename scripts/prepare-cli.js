import { mkdirSync, copyFileSync, readdirSync, statSync, existsSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

const cliNodeModules = join(rootDir, 'packages/cli/node_modules/@devbrain');

function copyDir(src, dest) {
  mkdirSync(dest, { recursive: true });
  const entries = readdirSync(src);
  for (const entry of entries) {
    const srcPath = join(src, entry);
    const destPath = join(dest, entry);
    const stat = statSync(srcPath);
    if (stat.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      if (!entry.endsWith('.map') && !entry.includes('.test.')) {
        copyFileSync(srcPath, destPath);
      }
    }
  }
}

console.log('Preparing bundled dependencies for CLI...');

try {
  // Clean up target directories
  if (existsSync(cliNodeModules)) {
    rmSync(cliNodeModules, { recursive: true, force: true });
  }
  mkdirSync(cliNodeModules, { recursive: true });

  // 1. Copy shared package
  const sharedSrc = join(rootDir, 'packages/shared');
  const sharedDest = join(cliNodeModules, 'shared');
  console.log('Bundling @devbrain/shared...');
  copyDir(join(sharedSrc, 'dist'), join(sharedDest, 'dist'));
  copyFileSync(join(sharedSrc, 'package.json'), join(sharedDest, 'package.json'));

  // 2. Copy core package
  const coreSrc = join(rootDir, 'packages/core');
  const coreDest = join(cliNodeModules, 'core');
  console.log('Bundling @devbrain/core...');
  copyDir(join(coreSrc, 'dist'), join(coreDest, 'dist'));
  copyFileSync(join(coreSrc, 'package.json'), join(coreDest, 'package.json'));

  console.log('Bundled dependencies prepared successfully.');
} catch (err) {
  console.error('Error preparing bundled dependencies:', err.message);
  process.exit(1);
}
