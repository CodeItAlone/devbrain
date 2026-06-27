# Contributing to DevBrain

First off, thank you for taking the time to contribute! Contributions from the community help make DevBrain better for everyone.

---

## 🏗️ Repository Architecture

DevBrain is structured as an NPM monorepo containing the following packages under the `packages/` directory:

1.  **`packages/shared`**: Base constants, config interfaces, and centralized error definitions.
2.  **`packages/core`**: Filesystem operations, scanners, and registered file parser plugins.
3.  **`packages/cli`**: The user-facing CLI command parser, log output utilities, and console spinners.

---

## 🛠️ Local Environment Setup

### Prerequisites
*   Node.js LTS (version `20.x` or `22.x` is recommended).
*   NPM v10 or above.

### Step-by-Step Setup
1.  **Fork and Clone**: Fork the repository and clone it to your local machine:
    ```bash
    git clone https://github.com/YOUR-USERNAME/devbrain.git
    cd devbrain
    ```

2.  **Create a Feature Branch**: Always develop on a dedicated feature branch matching our conventions:
    *   For features: `feature/your-feature-name`
    *   For bug fixes: `fix/your-bug-name`
    ```bash
    git checkout -b feature/my-cool-idea
    ```

3.  **Install Dependencies**: Install root and workspace-level dependencies:
    ```bash
    npm install
    ```

4.  **Build the Project**: Compile the TypeScript packages using NPM workspaces:
    ```bash
    npm run build
    ```

5.  **Run CLI Commands Locally**: You can invoke the built binary locally from the workspace root:
    ```bash
    node packages/cli/dist/bin.js --help
    ```

---

## 🧹 Coding Guidelines

We enforce clean, maintainable, and type-safe code standards:

*   **TypeScript Style**: Use ESM modules and explicit types where possible. Avoid `any` except where absolutely necessary.
*   **Formatting**: We use Prettier to format code. Run formatting using:
    ```bash
    npm run format
    ```
*   **Linting**: We check code styles via ESLint. Ensure no linting errors remain before submitting:
    ```bash
    npm run lint
    ```

---

## 🧪 Testing Guidelines

Testing is crucial to maintain DevBrain's stability. All bug fixes and features should include corresponding test coverage.

*   We use **Vitest** for unit and integration testing.
*   We aim to maintain **90%+ test coverage** across statement, function, and branch metrics.
*   To execute the test suite locally:
    ```bash
    npm test
    ```
*   To check test coverage locally:
    ```bash
    npm run test:watch # Run in watch mode during development
    ```

---

## 💬 Commit Message Convention

We follow the **Conventional Commits** specification to ensure clean and readable version history. Your commits should be prefixed appropriately:

*   `feat`: A new user-facing feature.
*   `fix`: A bug fix.
*   `docs`: Documentation-only changes.
*   `style`: Code style formatting changes (whitespace, semi-colons, etc.; no logic change).
*   `refactor`: Code changes that neither fix a bug nor add a feature.
*   `test`: Adding missing tests or correcting existing tests.
*   `chore`: Updates to build scripts, dependencies, or repository configurations.

**Example Commit:**
```bash
git commit -m "feat(core): add python requirements-txt dependency analyzer"
```

---

## 🚀 Pull Request Checklist

Before submitting your PR, please ensure you complete this checklist:

- [ ] Forked and checked out a branch from `main`.
- [ ] Code compiles cleanly without errors (`npm run build`).
- [ ] Code is formatted (`npm run format`) and linted (`npm run lint`).
- [ ] Type checking passes cleanly (`npx tsc --noEmit`).
- [ ] Unit tests are written for new logic and all tests pass (`npm test`).
- [ ] Pre-release verification passes successfully by running the release pipeline (`npm run release`).
- [ ] Commit messages follow the Conventional Commits guidelines.
