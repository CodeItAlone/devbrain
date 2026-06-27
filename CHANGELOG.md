# Changelog

All notable changes to this project will be documented in this file.

## [0.1.0] - 2026-06-27
### Added
- Core workspace packages for `shared` models/errors, `core` analyzers/scanners, and `cli` runner.
- Implementation of `devbrain init`, `devbrain learn`, and `devbrain context` commands.
- Support for multiple analyzers: Package.json, TSConfig, Git, Requirements.txt, POM.xml, Build.gradle, README, and Docker.
- Monorepo structure using native npm workspaces.
- Unified deterministic release pipeline via `scripts/release-pipeline.js` and `npm run release`.
- Automated error-handling and multi-project functional test suites to verify analyzers in isolated sandboxes.
- Strict package contents auditing to prevent source TypeScript files, tests, and configuration assets from entering the final published tarball.

### Changed
- Renamed root package to `devbrain-workspace` and public npm CLI package to `devbrain-cli`.
- Moved runtime dependencies to the CLI package root, resolving CLI execution failures (`ERR_MODULE_NOT_FOUND`) when run post-installation.

