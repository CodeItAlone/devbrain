# Architecture Design Document

This document outlines the internal architecture, service components, command pipeline, and pluggable analyzer system of DevBrain.

---

## 🏛️ Component Architecture

DevBrain is structured as an NPM monorepo separated into three distinct logical packages:

```
                  ┌─────────────────────────┐
                  │      packages/cli       │  (CLI Entrypoint, Commander, Chalk)
                  └────────────┬────────────┘
                               │
                               ▼
                  ┌─────────────────────────┐
                  │      packages/core      │  (Services, Scanner, Analyzers)
                  └────────────┬────────────┘
                               │
                               ▼
                  ┌─────────────────────────┐
                  │     packages/shared     │  (Base Models, Config, Custom Errors)
                  └─────────────────────────┘
```

---

## 🚀 The CLI Command Pipeline

All CLI commands in `packages/cli` execute through a highly structured, standard command pipeline to ensure uniform logging, error handling, config parsing, and runtime metrics.

```
       Validate ➔ Load Config ➔ Context Check ➔ Execute Service ➔ Write Output ➔ Report Progress
```

1.  **Validate**: Ensures the target directory exists and checks pre-conditions (e.g. `learn` requires the directory to be initialized first; `init` blocks overwriting unless `--force` is passed).
2.  **Load Config**: Resolves and parses the local configuration file `.devbrain/config.json`, fallback to default configuration values if not found.
3.  **Context Check**: Determines workspace properties, active folders, and sets up logger context.
4.  **Execute Service**: Dispatches the operation to the appropriate core service (`Scanner`, `AnalyzerRegistry`, `MemoryService`, or `ContextService`).
5.  **Write Output**: Writes results atomically (with temp file swap) to avoid corrupting active files in case of system failures.
6.  **Report Progress**: Returns success logs, diagnostic information, and prints statistics (e.g. number of files scanned, time elapsed).

---

## ⚙️ Core Services (`packages/core`)

### 1. `FilesystemService`
Wraps the Node.js `node:fs` module. It provides utility methods for directory validation, scanning, and atomic writes. Atomic writes write content first to a `.tmp` file and then rename it, avoiding data loss if the CLI process is terminated mid-write.

### 2. `Scanner`
Finds files to analyze using `fast-glob`. It automatically filters out standard development folders (like `node_modules`, `dist`, `.git`, `coverage`) and respects exclusions configured inside `.devbrain/config.json`.

### 3. `AnalyzerRegistry`
Maintains a registry of file analyzer plugins. During execution, it checks each scanner file to see if there is a matching analyzer, executes the supported analyzer chain, and returns structured metadata.

### 4. `MemoryService`
Takes structured analyzer metadata and compiles it into high-quality, deterministic markdown documentation files inside `.devbrain/memory/`:
*   `summary.md` - High-level codebase structure and file list.
*   `stack.md` - Identified build tools, languages, and framework dependencies.
*   `features.md` - Features extracted from readmes and docs.
*   `architecture.md` - Key configs (e.g. tsconfig, docker, gradle).
*   `timeline.md` - Project history and status from Git commits.

### 5. `ContextService`
Consolidates all files from `.devbrain/memory/` into a single, token-efficient text prompt block, wrapping each section inside descriptive AI-readable boundary tags.

---

## 🔌 How to Write a Custom Analyzer Plugin

The `AnalyzerRegistry` makes it easy to add support for new configuration files, dependency formats, or package managers.

### Step 1: Implement the `Analyzer` Interface
Create a new file in `packages/core/src/analysis/analyzers/` implementing the `Analyzer` interface defined in `packages/core/src/analysis/analyzer.interface.ts`:

```typescript
import { Analyzer, AnalysisResult } from '../analyzer.interface.js';
import { FilesystemService } from '../../filesystem/filesystem.service.js';

export class MyCustomAnalyzer implements Analyzer {
  name = 'my-custom-analyzer';

  // Return true if the file name matches what this analyzer parses
  supports(filename: string): boolean {
    return filename === 'custom-config.json';
  }

  // Parse the file content and return structured JSON
  async analyze(filepath: string, fs: FilesystemService): Promise<AnalysisResult> {
    const content = await fs.readFile(filepath);
    const data = JSON.parse(content);

    return {
      name: this.name,
      file: filepath,
      data: {
        customField: data.someField || 'default',
        dependencies: data.libs || [],
      }
    };
  }
}
```

### Step 2: Register the Plugin
Import and add your analyzer class to the registry constructor list in `packages/core/src/analysis/analyzer.registry.ts`:

```typescript
import { MyCustomAnalyzer } from './analyzers/my-custom.analyzer.js';

// ...
constructor() {
  this.register(new PackageJsonAnalyzer());
  this.register(new TSConfigAnalyzer());
  // Register your custom plugin
  this.register(new MyCustomAnalyzer());
}
```

### Step 3: Write Tests
Create a test file `packages/core/src/analysis/analyzers/my-custom.analyzer.test.ts` to verify parsing logic using Vitest mocks.
