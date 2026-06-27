import { execSync } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

const cliBin = join(rootDir, 'packages/cli/dist/bin.js');
const sandboxDir = join(rootDir, 'verification-errors');

console.log('--- DevBrain Error Handling Testing ---');

try {
  // Clean old sandbox
  if (existsSync(sandboxDir)) {
    rmSync(sandboxDir, { recursive: true, force: true });
  }
  mkdirSync(sandboxDir, { recursive: true });

  // 1. Run learn before init
  console.log('\n1. Testing learn before init...');
  try {
    execSync(`node "${cliBin}" learn`, { cwd: sandboxDir, stdio: 'pipe' });
    throw new Error('Expected learn command to fail before init, but it succeeded.');
  } catch (error) {
    const output = error.stdout?.toString() + error.stderr?.toString();
    if (!output.includes('DevBrain is not initialized')) {
      throw new Error(`Unexpected error output for learn before init: ${output}`);
    }
    console.log('   [PASS] Successfully trapped learn before init.');
  }

  // 2. Corrupted configuration
  console.log('\n2. Testing corrupted configuration...');
  execSync(`node "${cliBin}" init`, { cwd: sandboxDir });
  const configPath = join(sandboxDir, '.devbrain/config.json');
  writeFileSync(configPath, '{ invalid-json: "config" '); // write bad JSON

  try {
    execSync(`node "${cliBin}" learn`, { cwd: sandboxDir, stdio: 'pipe' });
    throw new Error('Expected learn command to fail with corrupted config, but it succeeded.');
  } catch (error) {
    const output = error.stdout?.toString() + error.stderr?.toString();
    if (!output.includes('Unexpected') && !output.includes('JSON')) {
      throw new Error(`Unexpected error output for corrupted config: ${output}`);
    }
    console.log('   [PASS] Successfully trapped corrupted config error.');
  }

  // 3. Invalid command
  console.log('\n3. Testing invalid command...');
  try {
    execSync(`node "${cliBin}" invalidcmd`, { cwd: sandboxDir, stdio: 'pipe' });
    throw new Error('Expected invalidcmd to fail, but it succeeded.');
  } catch (error) {
    const output = error.stdout?.toString() + error.stderr?.toString();
    if (!output.includes('Invalid command')) {
      throw new Error(`Unexpected error output for invalid command: ${output}`);
    }
    console.log('   [PASS] Successfully trapped invalid command error.');
  }

  console.log('\n--- ALL ERROR HANDLING TESTS PASSED ---');
  rmSync(sandboxDir, { recursive: true, force: true });
} catch (err) {
  console.error('\n--- ERROR HANDLING TESTING FAILURE ---');
  console.error(err.message);
  process.exit(1);
}
