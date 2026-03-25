# Contributing to TinyImg

Thank you for your interest in contributing to TinyImg! This document provides guidelines for setting up your development environment, running tests, and submitting contributions.

## Table of Contents

- [Development Setup](#development-setup)
- [Project Structure](#project-structure)
- [Testing](#testing)
- [Code Style](#code-style)
- [Commit Conventions](#commit-conventions)
- [Pull Request Process](#pull-request-process)
- [Development Workflow](#development-workflow)
- [Getting Help](#getting-help)

## Development Setup

### Prerequisites

- **Node.js** >= 18 (we recommend using the latest LTS version)
- **pnpm** >= 10.32.1 (package manager)

### Clone and Install

```bash
# Clone the repository
git clone https://github.com/pzehrel/tinyimg.git
cd tinyimg

# Install dependencies
pnpm install

# Build all packages
pnpm build
```

### Verify Setup

Run the test suite to ensure everything is working:

```bash
pnpm test:unit
```

## Project Structure

TinyImg is organized as a monorepo using pnpm workspaces:

```
tinyimg/
├── packages/
│   ├── tinyimg-core/      # Core library (API key management, compression, caching)
│   ├── tinyimg-cli/       # CLI tool (command-line interface)
│   └── tinyimg-unplugin/  # Unplugin (Vite/Webpack/Rolldown integration)
├── package.json           # Root workspace configuration
└── eslint.config.js       # ESLint configuration
```

### Package Dependencies

- `tinyimg-cli` depends on `tinyimg-core`
- `tinyimg-unplugin` depends on `tinyimg-core`

When making changes, consider the dependency graph to ensure dependent packages are rebuilt.

## Testing

### Run All Tests

```bash
# Run all tests once
pnpm test:unit

# Run tests with coverage report
pnpm test:coverage

# Run tests in watch mode (useful during development)
pnpm test
```

### Run Package-Specific Tests

```bash
# Test only the core package
pnpm --filter tinyimg-core test

# Test only the CLI package
pnpm --filter tinyimg-cli test

# Test only the unplugin package
pnpm --filter tinyimg-unplugin test
```

### Test Structure

- Unit tests are co-located with source files (e.g., `src/utils.ts` → `src/utils.test.ts`)
- Integration tests are in `tests/` directories within each package
- Fixtures for integration tests are in `tests/fixtures/`

### Writing Tests

We use [Vitest](https://vitest.dev/) for testing. When writing tests:

- Place unit tests next to the source file they test
- Use descriptive test names that explain the behavior being tested
- Mock external dependencies (API calls, file system operations)
- Aim for high coverage on critical paths (API key management, caching, compression)

## Code Style

We use **ESLint** with [@antfu/eslint-config](https://github.com/antfu/eslint-config) for code linting and formatting.

### Lint Commands

```bash
# Check for linting issues
pnpm lint

# Auto-fix linting issues
pnpm lint:fix
```

### Key Style Rules

- **TypeScript**: Strict mode enabled
- **Stylistic rules**: Enabled (no Prettier needed)
- **Import organization**: Automatic sorting
- **Semicolons**: Disabled (ASI-friendly style)
- **Quotes**: Single quotes preferred

### No Prettier

We do not use Prettier. ESLint with stylistic rules handles all formatting. Run `pnpm lint:fix` to auto-format your code.

## Commit Conventions

We follow [Conventional Commits](https://www.conventionalcommits.org/) for commit messages. This enables automatic changelog generation and version management.

### Commit Format

```
<type>(<scope>): <description>

[optional body]

[optional footer(s)]
```

### Commit Types

| Type       | Description                                                     |
| ---------- | --------------------------------------------------------------- |
| `feat`     | A new feature                                                   |
| `fix`      | A bug fix                                                       |
| `docs`     | Documentation only changes                                      |
| `style`    | Changes that do not affect the meaning of the code (formatting) |
| `refactor` | Code change that neither fixes a bug nor adds a feature         |
| `perf`     | Performance improvement                                         |
| `test`     | Adding or correcting tests                                      |
| `chore`    | Changes to build process, dependencies, or tooling              |

### Commit Scopes

Use package names as scopes:

- `core` - Changes to `tinyimg-core`
- `cli` - Changes to `tinyimg-cli`
- `unplugin` - Changes to `tinyimg-unplugin`

### Examples

```bash
# Feature in core package
feat(core): add support for custom cache directories

# Bug fix in CLI
fix(cli): handle empty input directories gracefully

# Documentation update
docs: update README with new configuration options

# Test addition
test(unplugin): add integration tests for Vite plugin

# Refactoring
refactor(core): simplify key rotation logic
```

## Pull Request Process

1. **Fork the repository** on GitHub

2. **Create a feature branch** from `main`:

   ```bash
   git checkout -b feature/my-feature
   ```

3. **Make your changes**:
   - Write code following the existing patterns
   - Add or update tests as needed
   - Update documentation if applicable

4. **Ensure quality checks pass**:

   ```bash
   pnpm lint
   pnpm test:unit
   pnpm build
   ```

5. **Commit your changes** using conventional commit format

6. **Push to your fork**:

   ```bash
   git push origin feature/my-feature
   ```

7. **Open a Pull Request** on GitHub:
   - Provide a clear description of the changes
   - Reference any related issues
   - Ensure CI checks pass

### PR Requirements

- All CI checks must pass (lint, test, build)
- Code should follow existing patterns and conventions
- Tests should be included for new features
- Documentation should be updated for user-facing changes

## Development Workflow

### Daily Development

1. Pull latest changes from `main`:

   ```bash
   git pull origin main
   ```

2. Install dependencies if `package.json` changed:

   ```bash
   pnpm install
   ```

3. Make your changes and run tests frequently:

   ```bash
   pnpm test
   ```

4. Before committing, run the full check:
   ```bash
   pnpm lint && pnpm test:unit && pnpm build
   ```

### Working with the Monorepo

When making changes that affect multiple packages:

1. Make changes to the dependency package first (e.g., `tinyimg-core`)
2. Build the dependency: `pnpm --filter tinyimg-core build`
3. Make changes to dependent packages
4. Run tests for all affected packages

### Adding Dependencies

```bash
# Add to a specific package
pnpm --filter tinyimg-core add <package-name>

# Add dev dependency to a specific package
pnpm --filter tinyimg-core add -D <package-name>

# Add to root (shared dev dependencies)
pnpm add -D -w <package-name>
```

## Getting Help

### Reporting Bugs

If you find a bug, please [open an issue](https://github.com/pzehrel/tinyimg/issues) with:

- A clear description of the problem
- Steps to reproduce
- Expected vs actual behavior
- Your environment (Node.js version, OS, package versions)

### Asking Questions

For questions or discussions, use [GitHub Discussions](https://github.com/pzehrel/tinyimg/discussions).

### Security Issues

If you discover a security vulnerability, please do not open a public issue. Instead, contact the maintainers directly.

---

Thank you for contributing to TinyImg!
