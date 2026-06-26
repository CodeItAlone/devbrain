# Task Plan - DevBrain Foundation (v0.1)

## Overview
Building DevBrain v0.1: an open-source, production-quality CLI tool that provides persistent, deterministic project memory for AI assistants, running entirely offline.

## Project Type
BACKEND (Node.js/TypeScript ESM Monorepo CLI)

## Success Criteria
- Running `devbrain init` initializes a `.devbrain/config.json` and `.devbrain/memory/summary.md`.
- Running `devbrain learn` scans the repository files using a plugin analyzer registry and generates deterministic markdown summaries.
- Running `devbrain context` reads `.devbrain/memory` and produces an optimized LLM-ready context block.
- 90%+ test coverage target.
- Execution of repository scan in < 3 seconds.

## Tech Stack
- **Language/Runtime:** TypeScript, Node.js LTS (ESM, "type": "module")
- **CLI/Console:** Commander.js, Chalk (v5+), Ora
- **File Discovery:** fast-glob
- **Git Integration:** simple-git
- **XML Parsing:** fast-xml-parser
- **Testing:** Vitest

## File Structure
```
devbrain/
├── packages/
│   ├── cli/
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── src/
│   │       ├── bin.ts
│   │       ├── commands/
│   │       │   ├── init.command.ts
│   │       │   ├── learn.command.ts
│   │       │   └── context.command.ts
│   │       └── ui/
│   │           └── logger.ts
│   ├── core/
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── src/
│   │       ├── index.ts
│   │       ├── analysis/
│   │       │   ├── analyzer.interface.ts
│   │       │   ├── analyzer.registry.ts
│   │       │   ├── scanner.ts
│   │       │   └── analyzers/
│   │       ├── context/
│   │       │   └── context.service.ts
│   │       ├── filesystem/
│   │       │   └── filesystem.service.ts
│   │       └── memory/
│   │           └── memory.service.ts
│   └── shared/
│       ├── package.json
│       ├── tsconfig.json
│       └── src/
│           ├── index.ts
│           ├── types.ts
│           ├── errors.ts
│           └── constants.ts
├── package.json
├── tsconfig.json
└── tsconfig.settings.json
```

## Task Breakdown

### Task 1: Root Workspaces & Tooling Setup
- **Agent:** `project-planner`
- **Skills:** `clean-code`
- **Priority:** High
- **Dependencies:** None
- **INPUT:** Project root workspace folder
- **OUTPUT:** Monorepo package structure with packages linked using native npm workspaces
- **VERIFY:** `npm install` runs successfully, creating empty packages.
- **Rollback:** Delete root `package.json`, `packages/`, and run `git clean -fd`.

### Task 2: Implement `packages/shared`
- **Agent:** `backend-specialist`
- **Skills:** `clean-code`
- **Priority:** High
- **Dependencies:** Task 1
- **INPUT:** `packages/shared` directory and types definition
- **OUTPUT:** ESM-compiled package exposing base models, Config schema interface, Error classes, and Constants
- **VERIFY:** Package compiles cleanly with `tsc`.
- **Rollback:** Remove contents of `packages/shared` and revert dependency links.

### Task 3: Implement `packages/core` Filesystem & Scanner Services
- **Agent:** `backend-specialist`
- **Skills:** `clean-code`, `nodejs-best-practices`
- **Priority:** High
- **Dependencies:** Task 2
- **INPUT:** `packages/core` directory, fast-glob configuration rules
- **OUTPUT:** `FilesystemService` with atomic writes, and `Scanner` supporting defaults → config → .gitignore exclusions
- **VERIFY:** Scanner lists repository files filtering out `node_modules` and target folders correctly. Run Vitest checks.
- **Rollback:** Revert filesystem/scanner code changes.

### Task 4: Implement Core Analyzer Plugin Registry
- **Agent:** `backend-specialist`
- **Skills:** `clean-code`, `api-patterns`
- **Priority:** High
- **Dependencies:** Task 3
- **INPUT:** Analyzer interface and registry definition
- **OUTPUT:** Plugin system supporting lazy execution of independent analyzers for README, package.json, pom.xml, requirements.txt, tsconfig.json, build.gradle, Dockerfile, and .git
- **VERIFY:** Registry successfully resolves, checks support, and executes analyzer chain returning structured JSON.
- **Rollback:** Revert analyzer directory.

### Task 5: Implement Memory Generator Service
- **Agent:** `backend-specialist`
- **Skills:** `clean-code`
- **Priority:** High
- **Dependencies:** Task 4
- **INPUT:** Structured JSON objects from analyzers
- **OUTPUT:** Deterministic markdown generation of summary, stack, rules, features, architecture, and timeline files
- **VERIFY:** Running generator twice produces identical markdown output. Verify markdown output is human readable.
- **Rollback:** Revert memory generation code.

### Task 6: Implement Context Consolidator Engine
- **Agent:** `backend-specialist`
- **Skills:** `clean-code`
- **Priority:** High
- **Dependencies:** Task 5
- **INPUT:** Markdown files inside `.devbrain/memory`
- **OUTPUT:** Consolidated, validated, token-efficient, single-block output format readable by AI assistants
- **VERIFY:** Execution outputs correct consolidated block.
- **Rollback:** Revert context engine code.

### Task 7: Implement CLI Package commands
- **Agent:** `backend-specialist`
- **Skills:** `clean-code`, `nodejs-best-practices`
- **Priority:** High
- **Dependencies:** Task 6
- **INPUT:** Commander.js configuration and core library exports
- **OUTPUT:** CLI runner mapping `init`, `learn`, and `context` commands with professional terminal logger, chalk colors, and progress spinners
- **VERIFY:** Commands execute sequentially following the Command Pipeline: `Validate` → `Load Config` → `Context` → `Execute Service` → `Write` → `Report`.
- **Rollback:** Revert `packages/cli` modifications.

---

## Phase X: Verification

> [!IMPORTANT]
> All automated tests, type checking, and security scans must succeed before marking the project complete.

### Command Checks
- Lint check: `npm run lint`
- Type checking: `npx tsc --noEmit`
- Security scan: `python .agents/skills/vulnerability-scanner/scripts/security_scan.py .`
- Test execution: `vitest run`
- CLI Link/Install: `npm link` followed by manual test execution of `devbrain init`, `devbrain learn`, and `devbrain context`.

## ✅ PHASE X COMPLETE
- Lint: ✅ Pass
- Security: ✅ No critical issues
- Build: ✅ Success
- Date: 2026-06-26
