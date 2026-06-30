# Implementation Plan: Autonomous Git Memory Engine (v0.2)

This plan details the design and tasks required to transition DevBrain from a manual CLI into an autonomous Git-integrated knowledge engine.

---

## Project Overview

- **Project Type**: BACKEND / CLI
- **Goal**: Auto-install Git hooks, support dependency-aware incremental learning, establish a JSON-based single source of truth (`memory.json`), prevent concurrent runs with lock files, log operations to `.devbrain/logs/`, and support read-only document updates to prevent Git diff bloat.

---

## Success Criteria

1. **Automatic Hook Setup**: Running `devbrain init` automatically installs a `post-commit` hook that runs `devbrain learn` asynchronously and exits with 0 (never blocking commits).
2. **Incremental Scans**: The engine determines changed files since the last processed commit. If a changed file is a source code file, we perform a dependency-aware incremental analysis. If it is a core config file, a full scan is triggered.
3. **Structured Storage**: State is persisted in `.devbrain/memory.json`, `.devbrain/history.json`, `.devbrain/config.json`, `.devbrain/version.json`, and `.devbrain/.lock`.
4. **Clean Docs & Context**: `.devbrain/PROJECT_MEMORY.md` (read-only, referencing `custom_notes.md`) and `.devbrain/context.md` are regenerated dynamically on changes, updating only changed sections to prevent unnecessary Git diffs.
5. **Robust CLI**: New commands `devbrain status`, `devbrain history`, `devbrain hook install`, and `devbrain hook remove` work end-to-end.
6. **Error Resiliency**: Works gracefully under merge, empty, renamed, or deleted commits.

---

## Tech Stack & Architecture

- **Language**: TypeScript / Node.js >=20 (ES Modules)
- **Git Layer**: `simple-git` package (pre-installed in CLI dependencies) for executing low-level Git queries.
- **Locking**: Filesystem-based locking using `.devbrain/.lock`.
- **Testing**: `vitest` for running unit and integration test suites.

### File Structure Layout
```
.devbrain/
├── config.json              # Config parameters
├── version.json             # Schema versioning
├── memory.json              # Source of truth project state
├── history.json             # Commit processing history
├── PROJECT_MEMORY.md        # User-facing summary (read-only)
├── context.md               # AI prompt context (read-only)
├── custom_notes.md          # User manual notes (never overwritten)
├── .lock                    # Concurrent execution prevention lock
└── logs/
    ├── devbrain.log         # General runtime logs
    └── git-hook.log         # Git hook execution logs
```

---

## Task Breakdown

### Phase 1: Foundation (Shared Types & Config)

#### Task 1: Update Shared Interfaces and Configuration Schema
- **File**: [types.ts](file:///c:/Users/SUBRATO KUNDU/Desktop/DevBrain/packages/shared/src/types.ts), [constants.ts](file:///c:/Users/SUBRATO KUNDU/Desktop/DevBrain/packages/shared/src/constants.ts)
- **Agent**: `backend-specialist`
- **Skill**: `clean-code`
- **Description**: Add new config fields (`auto_update`, `enabled_hooks`, `ignored_directories`, `ignored_extensions`, `maximum_incremental_files`, `documentation_generation`, `context_generation`, `verbose_logging`, `safe_mode`), export new version parameters, and constants for v0.2 filenames.
- **INPUT**: Current `types.ts` and `constants.ts`.
- **OUTPUT**: Expanded config schema and new constants.
- **VERIFY**: Build packages: `npm run build` succeeds.

---

### Phase 2: Core Git & Process Engine

#### Task 2: Git Service Layer
- **File**: [git.service.ts](file:///c:/Users/SUBRATO KUNDU/Desktop/DevBrain/packages/core/src/git/git.service.ts) [NEW]
- **Agent**: `backend-specialist`
- **Skill**: `nodejs-best-practices`
- **Description**: Implement a service using `simple-git` to:
  1. Determine current HEAD commit hash.
  2. Find changed files between two commits (`git diff --name-only <commit1> <commit2>`).
  3. Detect renamed and deleted files.
  4. Write and delete Git hook scripts in `.git/hooks/` (with fallback logic for Windows/Unix permissions).
- **INPUT**: `simple-git` APIs and workspace context.
- **OUTPUT**: Complete `GitService` module.
- **VERIFY**: Unit test: mock git methods and verify hook installer write operations.

#### Task 3: Logger, Lock, and History Managers
- **File**: [lock.manager.ts](file:///c:/Users/SUBRATO%20KUNDU/Desktop/DevBrain/packages/core/src/engine/lock.manager.ts) [NEW], [logger.service.ts](file:///c:/Users/SUBRATO%20KUNDU/Desktop/DevBrain/packages/core/src/engine/logger.service.ts) [NEW], [history.manager.ts](file:///c:/Users/SUBRATO%20KUNDU/Desktop/DevBrain/packages/core/src/engine/history.manager.ts) [NEW]
- **Agent**: `backend-specialist`
- **Skill**: `clean-code`
- **Description**:
  - `LockManager`: Acquire and release `.devbrain/.lock` file safely. Handle stale locks (older than 10 mins).
  - `LoggerService`: Log message to `.devbrain/logs/devbrain.log` and stdout if `verbose_logging` is enabled.
  - `HistoryManager`: Load/save `.devbrain/history.json` and append processing records.
- **INPUT**: Filesystem API.
- **OUTPUT**: Engine helper classes.
- **VERIFY**: Run integration tests asserting lock acquisition and release.

---

### Phase 3: Incremental Learning & Dependency Resolver

#### Task 4: Dependency Resolver & Changed File Classifier
- **File**: [dependency.resolver.ts](file:///c:/Users/SUBRATO%20KUNDU/Desktop/DevBrain/packages/core/src/engine/dependency.resolver.ts) [NEW]
- **Agent**: `backend-specialist`
- **Skill**: `clean-code`
- **Description**: Analyze list of changed files and determine the final set of files to analyze based on blast-radius rules:
  1. Core configs (`package.json`, `tsconfig.json`, `docker-compose.yml`, `schema.prisma`, etc.) trigger a full repository scan.
  2. Controllers -> Add service and route files matching controller name (e.g. `UserController.ts` -> `UserService.ts`, `user.routes.ts`).
  3. Entities -> Add repository, DTO, and service files (e.g. `User.ts` -> `user.repository.ts`, `user.dto.ts`, `UserService.ts`).
  4. Small changes -> Only analyze changed files.
- **INPUT**: Rel relative paths of modified files.
- **OUTPUT**: List of resolved files to process and flag indicating if full scan is required.
- **VERIFY**: Unit tests with mock files verifying correct list expands.

#### Task 5: Memory Engine and Source Code Analyzer
- **File**: [memory.engine.ts](file:///c:/Users/SUBRATO%20KUNDU/Desktop/DevBrain/packages/core/src/engine/memory.engine.ts) [NEW]
- **Agent**: `backend-specialist`
- **Skill**: `api-patterns`
- **Description**:
  - Incremental updates: Load `memory.json`, run registry analyzers on resolved files, remove entries for deleted files, merge outputs, and update file tree list.
  - Basic Code Analyzer: Parse classes, methods, endpoints (regex-based) from source code files to build the `modules` structure for `memory.json`.
- **INPUT**: Changed files, previous memory.
- **OUTPUT**: Refreshed `memory.json` payload.
- **VERIFY**: Run incremental learner over mock changes and check if old memory is merged cleanly.

---

### Phase 4: Documentation & Context Generation

#### Task 6: Read-Only Section-Based Doc Generator
- **File**: [memory.service.ts](file:///c:/Users/SUBRATO KUNDU/Desktop/DevBrain/packages/core/src/memory/memory.service.ts), [context.service.ts](file:///c:/Users/SUBRATO KUNDU/Desktop/DevBrain/packages/core/src/context/context.service.ts)
- **Agent**: `backend-specialist`
- **Skill**: `clean-code`
- **Description**:
  - Update `MemoryService` to read from `memory.json` and generate `.devbrain/PROJECT_MEMORY.md`.
  - Section-based update: Check if an existing `.devbrain/PROJECT_MEMORY.md` exists, parse it by headers, replace only changed sections, and write the file.
  - Append link to `.devbrain/custom_notes.md` in "## Custom Notes" section.
  - Update `ContextService` to generate `.devbrain/context.md`.
- **INPUT**: `memory.json` state.
- **OUTPUT**: Unified readable documents.
- **VERIFY**: Read output docs and ensure headers contain the auto-generated warnings.

---

### Phase 5: CLI Integration & New Commands

#### Task 7: Update CLI Command Pipelines
- **File**: [init.command.ts](file:///c:/Users/SUBRATO KUNDU/Desktop/DevBrain/packages/cli/src/commands/init.command.ts), [learn.command.ts](file:///c:/Users/SUBRATO KUNDU/Desktop/DevBrain/packages/cli/src/commands/learn.command.ts), [bin.ts](file:///c:/Users/SUBRATO KUNDU/Desktop/DevBrain/packages/cli/src/bin.ts)
- **Agent**: `backend-specialist`
- **Skill**: `clean-code`
- **Description**:
  - `init`: Automatically write `version.json`, setup default config fields, write starter `custom_notes.md`, and install git hook.
  - `learn`: Acquire lock, read commit log, check if current commit is already processed, determine changes, run incremental analyzer, write memory/history, release lock.
  - `bin.ts`: Hook new subcommands.
- **INPUT**: Config definitions.
- **OUTPUT**: Operational CLI command scripts.
- **VERIFY**: Run `devbrain init` and check folder contents.

#### Task 8: Implement New CLI Subcommands
- **File**: [history.command.ts](file:///c:/Users/SUBRATO%20KUNDU/Desktop/DevBrain/packages/cli/src/commands/history.command.ts) [NEW], [status.command.ts](file:///c:/Users/SUBRATO%20KUNDU/Desktop/DevBrain/packages/cli/src/commands/status.command.ts) [NEW], [hook.command.ts](file:///c:/Users/SUBRATO%20KUNDU/Desktop/DevBrain/packages/cli/src/commands/hook.command.ts) [NEW]
- **Agent**: `backend-specialist`
- **Skill**: `clean-code`
- **Description**:
  - `devbrain history`: Display last processed commit, total learned commits, last run.
  - `devbrain status`: Display Git hook install status, lock state, versioning info.
  - `devbrain hook install` / `devbrain hook remove`: Install or clean up git hooks.
- **INPUT**: Command pipeline parameters.
- **OUTPUT**: Complete CLI command set.
- **VERIFY**: Execute commands and check outputs against expected format.

---

## Phase X: Verification Plan

### Automated Tests
- Run complete test suite:
  ```bash
  npm run test
  ```
- Write individual test suites for `LockManager`, `GitService`, `DependencyResolver`, and `HistoryManager` and ensure coverage is high.

### Manual Verification
1. Run `node packages/cli/dist/bin.js init --force`.
2. Inspect `.devbrain/` files structure, ensuring `version.json`, `config.json`, and `.git/hooks/post-commit` exist.
3. Make a dummy commit and verify that the hook runs asynchronously and logs information in `.devbrain/logs/git-hook.log` without interrupting git.
4. Run `devbrain status` and `devbrain history` to verify metadata is loaded.
5. Edit `packages/shared/src/types.ts` and verify that the build succeeds without compiler errors.

## ✅ PHASE X COMPLETE
- Lint: ✅ Pass
- Security: ✅ No critical issues
- Build: ✅ Success
- Date: 2026-06-30
