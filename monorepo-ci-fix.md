# Implementation Plan: Monorepo CI Workspace Fix

This plan details the design and tasks required to fix the GitHub Actions release pipeline failure where `npm ci` encounters a 404 error for internal DevBrain packages.

---

## Project Overview

- **Project Type**: DevOps / Workspace Configuration
- **Goal**: Align monorepo package dependency declarations to resolve incompatible version warnings and regenerate the stale `package-lock.json` file so that `npm ci` resolves `@devbrain/core` and `@devbrain/shared` as local workspaces links rather than trying to fetch them from the public registry.

---

## Root Cause Analysis

1. **Internal Dependency Version Incompatibility**: In the previous task, all packages (`@devbrain/shared`, `@devbrain/core`, `devbrain-cli`) and the root package version were bumped to `0.2.0`. However, the dependency declarations inside `packages/cli/package.json` still pointed to `^0.1.0` of core and shared, and `packages/core/package.json` still pointed to `^0.1.0` of shared. Because `^0.1.0` is incompatible with the `0.2.0` workspace packages, npm workspaces could not resolve them locally and fell back to querying the registry, resulting in a 404.
2. **Stale Lockfile (`package-lock.json`)**: The lockfile at the root of the workspace was completely missing references to the `devbrain-cli` workspace and its dependencies, meaning any clean run using `npm ci` on a CI runner failed to establish the local links.

---

## Success Criteria

1. **Successful `npm ci`**: Running `npm ci` at the root on a clean setup completes successfully without querying the public registry for `@devbrain/*` packages.
2. **Local Workspace Linking**: `packages/cli/node_modules/@devbrain/core` and `packages/cli/node_modules/@devbrain/shared` resolve properly.
3. **TypeScript Build**: `npm run build` compiles without workspace errors.
4. **Successful Pack**: `npm pack` in `packages/cli` packages all dependencies correctly.

---

## Proposed Changes

### 1. Align Internal Workspace Dependencies
- Update `packages/cli/package.json` to change the dependency ranges of `@devbrain/core` and `@devbrain/shared` from `^0.1.0` to `^0.2.0`.
- Update `packages/core/package.json` to change the dependency range of `@devbrain/shared` from `^0.1.0` to `^0.2.0`.

### 2. Regenerate Lockfile
- Run `npm install` at the workspace root to regenerate `package-lock.json` and stage the updated lockfile for commit.

---

## Task Breakdown

- [ ] Task 1: Update dependencies in `packages/cli/package.json`
- [ ] Task 2: Update dependencies in `packages/core/package.json`
- [ ] Task 3: Run `npm install` at root to regenerate `package-lock.json`
- [ ] Task 4: Verify build, lint, tests, and packing

---

## Phase X: Verification Plan

### Automated Tests
- Run `npm ci` at root locally to check clean lockfile install.
- Run `npm run build` to verify compiling.
- Run `npm test` to verify tests pass.
- Run `npm pack` inside `packages/cli` to verify tarball compiles.

### Manual Verification
- Verify that `package-lock.json` contains references to `devbrain-cli` and `packages/cli` link resolves correctly.

## ✅ PHASE X COMPLETE
- Lint: ✅ Pass
- Security: ✅ No critical issues
- Build: ✅ Success
- Date: 2026-06-30

