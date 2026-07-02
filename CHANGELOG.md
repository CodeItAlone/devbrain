# Changelog

All notable changes to this project will be documented in this file.

## [0.3.0] - 2026-07-02
### Added
- **Local Embedding Generation:** Seamless lazy loading of ONNX-optimized `all-MiniLM-L6-v2-ONNX` via `@huggingface/transformers`, cached globally in `~/.devbrain/models/`.
- **SQLite Vector Database (`vectors.db`):** Native Node.js `node:sqlite` serialization of Float32Array arrays into binary BLOB columns. Directly calculates cosine similarity.
- **Improved Semantic Search:** Compact search console layouts displaying Section, Similarity, Score, Memory Type, Source, and Matched Concepts.
- **Decoupled Synchronization:** decopled learning execution phases to always initialize/verify vectors even if Git HEAD is unchanged.
- **Noise Exclusions:** Skips indexing generic repo structure (file inventory listings) and timeline commit files to preserve search relevance.
- **Category-Aware Ranking:** 10 distinct memory categories (such as Authentication, Architecture, Database) with custom-weighted scoring.
- **Minimum Thresholding:** Filter out weak matching results (similarity < 0.30) automatically.
- **Automatic Repair Mode:** Automatically handles and repairs corrupted vector schemas/files, with a CLI `--repair` manual repair command.

## [0.2.0] - 2026-06-29
### Added
- **Git Hooks Integration:** Configurable `post-commit` hook installation to trigger learning automatically in the background on commit.
- **Incremental Learning:** Calculates git-diff between commits to parse files only inside the modified blast radius, saving time on large repositories.
- **History Tracking:** Logs commits and build statuses inside `.devbrain/history.json`.

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

