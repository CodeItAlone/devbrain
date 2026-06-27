import { execSync } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync, rmSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

const cliBin = join(rootDir, 'packages/cli/dist/bin.js');
const sandboxDir = join(rootDir, 'verification-functional');

console.log('--- DevBrain Functional Project Testing ---');

try {
  // Clean old sandbox
  if (existsSync(sandboxDir)) {
    rmSync(sandboxDir, { recursive: true, force: true });
  }
  mkdirSync(sandboxDir, { recursive: true });

  const projects = {
    'spring-boot-project': {
      'pom.xml': `<project xmlns="http://maven.apache.org/POM/4.0.0">
  <modelVersion>4.0.0</modelVersion>
  <groupId>com.example</groupId>
  <artifactId>demo</artifactId>
  <version>0.0.1-SNAPSHOT</version>
  <dependencies>
    <dependency>
      <groupId>org.springframework.boot</groupId>
      <artifactId>spring-boot-starter-web</artifactId>
    </dependency>
  </dependencies>
</project>`,
      'README.md': '# Spring Boot Demo'
    },
    'react-project': {
      'package.json': JSON.stringify({
        name: 'react-demo',
        dependencies: {
          'react': '^18.2.0',
          'react-dom': '^18.2.0'
        }
      }, null, 2),
      'README.md': '# React Demo'
    },
    'node-project': {
      'package.json': JSON.stringify({
        name: 'node-demo',
        dependencies: {
          'express': '^4.18.2'
        }
      }, null, 2),
      'README.md': '# Node Demo'
    },
    'python-project': {
      'requirements.txt': 'django>=4.0\nrequests==2.28.1\n',
      'README.md': '# Python Demo'
    },
    'empty-project': {}
  };

  for (const [projName, files] of Object.entries(projects)) {
    console.log(`\nTesting project type: ${projName}...`);
    const projPath = join(sandboxDir, projName);
    mkdirSync(projPath, { recursive: true });

    // Write mock files
    for (const [filename, content] of Object.entries(files)) {
      writeFileSync(join(projPath, filename), content);
    }

    // Run init
    console.log('   Running devbrain init...');
    execSync(`node "${cliBin}" init`, { cwd: projPath });
    const configPath = join(projPath, '.devbrain/config.json');
    if (!existsSync(configPath)) {
      throw new Error(`[FAIL] init failed to create config in ${projName}`);
    }

    // Run learn
    console.log('   Running devbrain learn...');
    execSync(`node "${cliBin}" learn`, { cwd: projPath });
    const memoryDir = join(projPath, '.devbrain/memory');
    if (!existsSync(memoryDir) || readdirSync(memoryDir).length === 0) {
      throw new Error(`[FAIL] learn failed to generate memory in ${projName}`);
    }

    // Run context
    console.log('   Running devbrain context...');
    const contextOutput = execSync(`node "${cliBin}" context`, { cwd: projPath }).toString();
    if (!contextOutput.includes('# DEVBRAIN PROJECT CONTEXT INDEX')) {
      throw new Error(`[FAIL] context output invalid in ${projName}`);
    }
    console.log(`   [PASS] ${projName} completed successfully.`);
  }

  console.log('\n--- ALL FUNCTIONAL PROJECT TESTS PASSED ---');
  rmSync(sandboxDir, { recursive: true, force: true });
} catch (err) {
  console.error('\n--- FUNCTIONAL TESTING FAILURE ---');
  console.error(err.message);
  process.exit(1);
}
