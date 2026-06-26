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

Run the following checks locally prior to tagging a release. **Do not cut a release if any of these steps fail.**

### 1. Code Quality checks
Verify that lint checks, TS compilation, and test execution are completely clean:
```bash
# Clean previous build artifacts
npm run clean

# Compile the packages
npm run build

# Run linting
npm run lint

# Compile and check type-safety
npx tsc --noEmit

# Run unit tests
npm test
```

### 2. Packaging Sanity Checks
Ensure the CLI bundles the shared and core workspaces properly and runs correctly:
```bash
# Move to the CLI workspace folder
cd packages/cli

# Generate the npm package tarball locally (triggers prepack dependency bundling)
npm pack

# Return to root directory
cd ../..

# Run the release verification script to verify extraction, bundling, and CLI commands
node scripts/verify-release.js
```

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
