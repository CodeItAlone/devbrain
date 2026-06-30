# Implementation Plan: Monorepo Release Packaging Audit

This plan details the diagnosis and refactoring tasks required to establish a robust, production-ready packaging and release verification pipeline.

---

## Root Cause Analysis

1. **Hardcoded Release Version in Pipeline**: The `scripts/release-pipeline.js` was hardcoded to check for `devbrain-cli-0.1.0.tgz`. Because the workspace was bumped to `0.2.0`, the pipeline failed during verification because it searched for the old tarball.
2. **Missing Executable Smoke Testing**: The release verification script (`verify-release.js`) was invoking `node packages/cli/dist/bin.js` directly, which did not test the packaging (`npm pack`), installer mapping, or command shebang permissions (`#!/usr/bin/env node`).
3. **Missing Root Pack Delegation**: When running `npm pack` at the root workspace directory, npm packages the root workspace itself. To resolve this, we will add a delegating `"pack"` script at the root `package.json` to properly bundle the CLI package using npm workspace options.

---

## Proposed Changes

### [Root Workspace Configuration]

#### [MODIFY] [package.json](file:///c:/Users/SUBRATO%20KUNDU/Desktop/DevBrain/package.json)
- Add a `"pack"` script to the root configuration:
  ```json
  "pack": "npm pack -w packages/cli --pack-destination=packages/cli"
  ```

---

### [Release Scripts]

#### [MODIFY] [scripts/release-pipeline.js](file:///c:/Users/SUBRATO%20KUNDU/Desktop/DevBrain/scripts/release-pipeline.js)
- Read the version dynamically from `packages/cli/package.json` instead of hardcoding `0.1.0.tgz`.

#### [MODIFY] [scripts/verify-release.js](file:///c:/Users/SUBRATO%20KUNDU/Desktop/DevBrain/scripts/verify-release.js)
- Refactor step 5 (Verifying lifecycle commands) to perform a real `npm install <tarball-path>` inside the temporary test app.
- Execute commands using `npx devbrain --version`, `npx devbrain init`, `npx devbrain learn`, and `npx devbrain context` to verify that binary mappings are fully working.

---

## Task Breakdown

- [ ] Task 1: Add `"pack"` script delegation to root `package.json`
- [ ] Task 2: Dynamically resolve version in `scripts/release-pipeline.js`
- [ ] Task 3: Implement global-style install and `npx devbrain` invocation in `scripts/verify-release.js`
- [ ] Task 4: Execute release pipeline and verify that all stages pass successfully

---

## Phase X: Verification Plan

### Automated Tests
- Run `npm run release` at the root to check all compilation, packaging, auditing, and smoke test stages.
- Run `npm run pack` at the root to check CLI workspace packing.
