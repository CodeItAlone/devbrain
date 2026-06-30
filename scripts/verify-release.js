import { execSync } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync, rmSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

const cliPackageJson = JSON.parse(readFileSync(join(rootDir, 'packages/cli/package.json'), 'utf8'));
const version = cliPackageJson.version;

const tarballPath = join(rootDir, `packages/cli/devbrain-cli-${version}.tgz`);
const verifyDir = join(rootDir, 'verification-temp');
const packageDir = join(verifyDir, 'package');
const testAppDir = join(verifyDir, 'test-app');

console.log(`--- DevBrain v${version} Release Verification ---`);

// 1. Check if tarball exists
if (!existsSync(tarballPath)) {
  console.error(`Tarball not found at: ${tarballPath}. Please run "npm pack" in packages/cli first.`);
  process.exit(1);
}

try {
  // Clean old verification directory
  if (existsSync(verifyDir)) {
    rmSync(verifyDir, { recursive: true, force: true });
  }

  mkdirSync(verifyDir, { recursive: true });
  mkdirSync(testAppDir, { recursive: true });

  console.log('1. Extracting tarball...');
  // Copy tarball to verify directory
  const tempTarball = join(verifyDir, `devbrain-cli-${version}.tgz`);
  execSync(`tar -xzf "${tarballPath}" -C "${verifyDir}"`);

  if (!existsSync(packageDir)) {
    throw new Error('Tarball did not extract into "package" subdirectory.');
  }

  console.log('2. Verifying bundled dependencies presence...');
  const bundledCore = join(packageDir, 'node_modules/@devbrain/core');
  const bundledShared = join(packageDir, 'node_modules/@devbrain/shared');
  if (!existsSync(bundledCore) || !existsSync(bundledShared)) {
    throw new Error('Bundled dependencies @devbrain/core or @devbrain/shared are missing in package/node_modules!');
  }
  console.log('   [PASS] Private packages are successfully bundled.');

  console.log('3. Running npm install --production in extracted package...');
  execSync('npm install --production', { cwd: packageDir, stdio: 'inherit' });
  console.log('   [PASS] Production dependencies installed.');

  console.log('4. Verifying CLI help and version commands...');
  const helpOutput = execSync('node dist/bin.js --help', { cwd: packageDir }).toString();
  if (!helpOutput.includes('Usage: devbrain')) {
    throw new Error('CLI help output is invalid.');
  }
  const versionOutput = execSync('node dist/bin.js --version', { cwd: packageDir }).toString().trim();
  if (versionOutput !== version) {
    throw new Error(`CLI version output is invalid: expected ${version}, got ${versionOutput}`);
  }
  console.log('   [PASS] Help and version commands work.');

  console.log('5. Verifying lifecycle commands: init -> learn -> context in a clean test project...');
  
  // Write some mock files in test app to scan
  writeFileSync(join(testAppDir, 'README.md'), '# Mock Verification App\nThis is a test application.');
  writeFileSync(join(testAppDir, 'package.json'), JSON.stringify({ name: 'mock-verify', version: '1.2.3' }, null, 2));

  console.log('   Running: devbrain init');
  execSync(`node "${join(packageDir, 'dist/bin.js')}" init`, { cwd: testAppDir, stdio: 'inherit' });
  const configPath = join(testAppDir, '.devbrain/config.json');
  if (!existsSync(configPath)) {
    throw new Error('devbrain init did not create config.json');
  }

  console.log('   Running: devbrain learn');
  execSync(`node "${join(packageDir, 'dist/bin.js')}" learn`, { cwd: testAppDir, stdio: 'inherit' });
  const memorySummaryPath = join(testAppDir, '.devbrain/memory/summary.md');
  if (!existsSync(memorySummaryPath)) {
    throw new Error('devbrain learn did not create summary.md');
  }

  console.log('   Running: devbrain context');
  const contextOutput = execSync(`node "${join(packageDir, 'dist/bin.js')}" context`, { cwd: testAppDir }).toString();
  if (!contextOutput.includes('# DEVBRAIN PROJECT CONTEXT INDEX') && !contextOutput.includes('# DEVBRAIN AI CONTEXT')) {
    throw new Error('devbrain context output is invalid');
  }
  console.log('   [PASS] Lifecycle commands execute correctly.');

  console.log('\n--- VERIFICATION SUCCESSFUL ---');
  console.log('The packaged CLI is completely functional, and all requirements are met.');

  // Clean up
  rmSync(verifyDir, { recursive: true, force: true });
} catch (err) {
  console.error('\n--- VERIFICATION FAILURE ---');
  console.error(err.message);
  process.exit(1);
}
