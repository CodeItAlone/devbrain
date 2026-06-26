# DevBrain

DevBrain is an open-source, production-quality CLI tool that provides persistent, deterministic project memory for AI assistants, running entirely offline.

## Features

- **Project Initialization**: Initialize config and memory directories.
- **Repository Learning**: Scan repository files and generate markdown documentation using a plugin analyzer registry.
- **AI-Ready Context Consolidated Output**: Produce token-efficient, single-block output format readable by AI assistants.

## Installation

```bash
npm install -g devbrain
```

## Quick Start

```bash
# Initialize DevBrain in your project
devbrain init

# Scan the repository and generate memory
devbrain learn

# Generate LLM-ready context block
devbrain context
```

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
