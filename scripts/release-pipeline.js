import { execSync } from 'node:child_process';
import { existsSync, readdirSync, statSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

console.log('=== STARTING DETERMINISTIC RELEASE PIPELINE ===');

function runCommand(command, cwd = rootDir) {
  console.log(`\n> Executing: ${command} in ${cwd}`);
  try {
    execSync(command, { cwd, stdio: 'inherit' });
  } catch (error) {
    console.error(`\n[FAILURE] Command failed: ${command}`);
    process.exit(1);
  }
}

// 1. Clean
runCommand('npm run clean');

// 2. Build
runCommand('npm run build');

// 3. Verify (TypeScript)
runCommand('npx tsc --noEmit');

// 4. Test
runCommand('npm test');

// 5. Prepare Package
runCommand('node scripts/prepare-cli.js');

// 6. npm pack
const cliDir = join(rootDir, 'packages/cli');
runCommand('npm pack', cliDir);

// 7. Release Validation
runCommand('node scripts/verify-release.js');

// 8. Package Audit
console.log('\n=== RUNNING PACKAGE AUDIT ===');
const tarballName = 'devbrain-0.1.0.tgz';
const tarballPath = join(cliDir, tarballName);

if (!existsSync(tarballPath)) {
  console.error(`[FAILURE] Packaged tarball not found at: ${tarballPath}`);
  process.exit(1);
}

const tarballSize = statSync(tarballPath).size;
console.log(`Package Tarball Size: ${(tarballSize / 1024).toFixed(2)} KB`);

// List contents of tarball using tar
try {
  const fileListOutput = execSync(`tar -tf "${tarballPath}"`).toString();
  const files = fileListOutput.split('\n').map(f => f.trim()).filter(Boolean);
  
  console.log(`Total File Count in Tarball: ${files.length}`);
  
  const illegalPatterns = [
    /(?<!\.d)\.ts$/,    // No raw TypeScript source files (exclude .d.ts)
    /\.test\.js$/,      // No compiled test files
    /\.test\.ts$/,      // No test source files
    /\.agents\//,       // No .agents internal files
    /docs\/archive\//,  // No doc archives
    /tests\//,          // No tests
    /\.git/,            // No git files
  ];

  let violations = 0;
  for (const file of files) {
    for (const pattern of illegalPatterns) {
      if (pattern.test(file)) {
        console.error(`[AUDIT VIOLATION] Unwanted file in package: ${file}`);
        violations++;
      }
    }
  }

  if (violations > 0) {
    console.error(`\n[FAILURE] Package audit failed with ${violations} violations!`);
    process.exit(1);
  }

  console.log('   [PASS] No illegal or development files found in the tarball.');
  
  // Verify expected files
  const expectedFiles = [
    'package/package.json',
    'package/README.md',
    'package/LICENSE',
    'package/dist/bin.js',
  ];

  for (const exp of expectedFiles) {
    if (!files.includes(exp)) {
      console.error(`[AUDIT VIOLATION] Missing critical file in package: ${exp}`);
      process.exit(1);
    }
  }
  console.log('   [PASS] All critical files are present.');

} catch (error) {
  console.error(`[FAILURE] Failed to audit package contents: ${error.message}`);
  process.exit(1);
}

console.log('\n=== RELEASE PIPELINE PASSED SUCCESSFULLY ===');
