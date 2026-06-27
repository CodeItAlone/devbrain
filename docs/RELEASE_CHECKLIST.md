# DevBrain Release Checklist & Publishing Guide

This checklist guides maintainers through preparing, verifying, and publishing a new release of DevBrain to the NPM registry.

---

## 🔢 Semantic Versioning Rules

All releases must strictly adhere to Semantic Versioning (SemVer):

1.  **PATCH version (`0.1.X`)**: Backward-compatible bug fixes, packaging corrections, and dependency updates.
2.  **MINOR version (`0.X.0`)**: Backward-compatible new features (e.g. adding a Go language analyzer plugin) or configuration additions.
3.  **MAJOR version (`X.0.0`)**: Breaking changes that alter public CLI commands, exports, or target Node.js version support.

---

## 🏁 Pre-Release Verification

We use a unified, deterministic release pipeline script to compile, verify, test, package, and audit DevBrain prior to publishing. **Do not cut a release if any of these automated steps fail.**

### Run the Release Pipeline
From the root directory, execute the release pipeline:
```bash
npm run release
```

This automated command will execute the following verification steps in sequence:
1. **Clean**: Deletes all previous build artifacts and compile states.
2. **Build**: Compiles all workspace packages (`shared`, `core`, and `cli`).
3. **Type Check**: Verifies type safety across all TypeScript sources (`npx tsc --noEmit`).
4. **Unit Tests**: Runs the Vitest test suite (`npm test`).
5. **Prepare CLI**: Bundles the core and shared packages into `packages/cli/node_modules/` via `scripts/prepare-cli.js`.
6. **Package Tarball**: Generates the local npm package tarball under `packages/cli/` via `npm pack`.
7. **Lifecycle Validation**: Runs `scripts/verify-release.js` which extracts the package, validates internal bundling, and runs `init`, `learn`, and `context` in a temporary test directory.
8. **Error Trapping**: Runs `scripts/verify-error-handling.js` to ensure the CLI handles invalid states gracefully.
9. **Analyzer Verification**: Runs `scripts/verify-functional-projects.js` to test language analyzers against Java, React, Node, Python, and empty projects.
10. **Tarball Audit**: Performs static file analysis on the packed tarball to ensure no development directories (`.git`, `.agents`), test files (`*.test.ts`), or raw source files are included, and audits the final file count and package size.


---

## 📝 Release Notes Preparation

Draft a summary of changes in `CHANGELOG.md` under a new release heading:

```markdown
## [0.1.0] - YYYY-MM-DD
### Added
- Feature description 1
- Feature description 2

### Fixed
- Fixed bug description 1
```

---

## 🚀 Publishing Process

DevBrain publishes packages manually to NPM. Follow these steps once pre-release checks pass:

### Step 1: Update Version
Update the workspace version. For example, to increment to a patch release:
```bash
# Increment package version across workspaces
npm version patch --workspaces --no-git-tag-version
```
Verify that `package.json` in the root and under `packages/*` are updated.

### Step 2: Publish to NPM
Publish the user-facing `devbrain` CLI package to the public registry:
```bash
# Move to packages/cli
cd packages/cli

# Run publish (will run prepare-cli prepack step automatically)
npm publish --access public
```

### Step 3: Git Tag & Release
Tag the release in git and push to GitHub:
```bash
# Return to root
cd ../..

# Commit version updates
git add .
git commit -m "chore(release): release v0.1.1"

# Create a Git tag
git tag v0.1.1 -m "Version 0.1.1"

# Push commit and tags to main branch
git push origin main --tags
```

### Step 4: GitHub Release Draft
Create a Release on GitHub using the tags, copying the corresponding section from `CHANGELOG.md` into the release description.
