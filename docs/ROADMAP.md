# DevBrain Product Roadmap

This document outlines the planned future milestones, architecture improvements, and plugin extensions for DevBrain.

---

## 📍 Milestone: v0.2 — Extensibility & Multi-Language Support

The primary focus of the v0.2 release is making DevBrain highly customizable, expanding its parsing capability to cover more application stacks, and optimizing its resource usage.

### 🔌 Pluggable External Analyzer System
*   **Goal**: Allow users to write and load their own custom analyzers without modifying the DevBrain core codebase.
*   **Proposed Mechanism**: Support reading third-party analyzer files from a `.devbrain/plugins/` directory in the project, or loading NPM packages specified in the configuration (e.g. `"plugins": ["devbrain-plugin-rust"]`).
*   **Impact**: Enables community-driven plugin development.

### 🐍 Python Dependency & Structure Analyzer
*   **Goal**: Deep parse Python environments.
*   **Details**: Extract package dependencies from `setup.py`, `pyproject.toml`, and virtual environment lock files (`poetry.lock`, `Pipfile.lock`). Map Flask/FastAPI/Django routing configurations.

### 🐹 Go Modules Analyzer
*   **Goal**: Parse Go dependencies.
*   **Details**: Extract Go module information from `go.mod` and package structure/entrypoints from `main.go`.

### ⚡ Performance Profiling & Optimization
*   **Goal**: Scan very large repositories (> 10,000 files) in under 1 second.
*   **Details**: Implement parallel worker threads for file scanning and parse processes, and implement caching of unchanged files using Git hashes.

---

## 📍 Milestone: v1.0 — Context Compression & AI Integrations

The focus of the v1.0 release is to transition DevBrain from a basic CLI generator to a comprehensive context-optimization platform for IDEs and autonomous agents.

### 🧠 Semantic AI Memory
*   **Goal**: Provide context-aware memory that automatically prioritizes documents based on query relevance.
*   **Proposed Mechanism**: Categorize documentation blocks into historical context, active features, and code conventions to reduce token overhead.

### 🌐 Model Context Protocol (MCP) Integration
*   **Goal**: Make DevBrain a native server for Claude and other MCP-compatible clients.
*   **Proposed Mechanism**: Expose tools (`devbrain_get_context`, `devbrain_list_analyzers`) to MCP clients, allowing AI assistants to query memory directly.

### 🔍 Local Vector Search (RAG)
*   **Goal**: Add localized semantic searching over the repository.
*   **Details**: Generate lightweight embeddings locally (e.g., using a compiled ONNX transformer model) and query code chunks via a local SQLite/vector index.

### 🔌 VS Code Extension
*   **Goal**: Real-time integration within the editor.
*   **Details**: Automatically execute `devbrain learn` on file writes, and expose a sidebar panel to preview the LLM-ready prompt context or copy it with a single click.
