# GitHub Copilot Instructions for xstate-audition

## Repository Overview

**xstate-audition** is a dependency-free TypeScript library for testing XState v5+ Actors. The repository provides test harnesses and utilities to validate the behavior of state machines, promise actors, callback actors, and transition actors.

### High-Level Details

- **Purpose**: Testing utilities for XState v5 Actors
- **Language**: TypeScript with dual CommonJS/ESM module builds
- **Size**: ~18 source files, ~19 test files
- **Build Tool**: tshy (TypeScript hybrid module builder)
- **Test Framework**: Node.js built-in test runner with tsx
- **Target Runtime**: Node.js >= 20.2.0
- **Package Manager**: npm
- **Peer Dependency**: xstate >= 5.17.4

## Build and Validation Instructions

### Prerequisites

- Node.js >= 20.2.0 (CI uses Node 22)
- npm (version 10+)

### Setup

Always run the following commands in order:

```bash
npm ci --foreground-scripts  # Install dependencies (preferred over npm install)
```

### Build Process

**Always run build before testing or linting:**

```bash
npm run build  # Uses tshy to build CommonJS and ESM outputs
```

- Build output goes to `dist/` directory (gitignored)
- Creates both `dist/commonjs/` and `dist/esm/` directories
- Build is required before running linters that check file system

### Testing

**Important**: The test script glob pattern in package.json has a known issue. Use this corrected command:

```bash
node --test --import tsx test/*.spec.ts  # Correct pattern (not "./test/*.spec.ts")
```

Or test individual files:

```bash
node --test --import tsx test/actor.spec.ts
```

- Tests use Node.js built-in test runner with tsx for TypeScript support
- All test files are in `test/` directory with `.spec.ts` extension
- Tests typically take 6-10 seconds to complete
- Test files include unit tests and integration examples

### Type Checking

```bash
npm run test:types  # Uses tsc with tsconfig.tsc.json
```

### Linting

Run linting in this order:

```bash
npm run lint        # ESLint with TypeScript rules
npm run lint:knip   # Detects unused exports/dependencies
npm run lint:md     # Markdownlint for documentation
npm run lint:spelling # cspell for spell checking
```

**Note**: Always run `npm run build` before linting as some lint rules check the file system.

### Full Validation

**Do not use `npm run check`** due to the test script issue. Instead run:

```bash
npm run build
node --test --import tsx test/*.spec.ts
npm run test:types
npm run lint
npm run lint:knip
npm run lint:md
npm run lint:spelling
```

### Development Commands

```bash
npm run dev           # Watch mode for tshy build
npm run dev:types     # Watch mode for TypeScript checking
npm run format        # Prettier formatting
npm run lint:fix      # Auto-fix ESLint issues
```

## Project Layout and Architecture

### Source Structure

```text
src/
├── index.ts              # Main exports
├── types.ts              # Core TypeScript types
├── util.ts               # Utility functions
├── constants.ts          # Constants and defaults
├── actor.ts              # Actor patching utilities
├── create-actor.ts       # Actor creation helpers
├── defaults.ts           # Default configurations
├── promise-kit.ts        # Promise utilities
├── timer.ts              # Timer utilities
└── until-*.ts            # Core testing functions
    ├── until-done.ts     # Run actors to completion
    ├── until-emitted.ts  # Wait for event emissions
    ├── until-event-*.ts  # Event handling utilities
    ├── until-snapshot.ts # Snapshot testing
    ├── until-spawn.ts    # Actor spawning tests
    └── until-transition.ts # State transition tests
```

### Test Structure

```text
test/
├── *.spec.ts            # Unit tests for each source file
├── example-*.spec.ts    # Integration examples
├── fixture.ts           # Test fixtures
├── harness.ts           # Test harness utilities
└── xstate-compat.ts     # XState version compatibility testing
```

### Configuration Files

- `tsconfig.json` - TypeScript configuration for the project
- `tsconfig.tsc.json` - TypeScript configuration for type checking
- `eslint.config.js` - ESLint configuration with TypeScript rules
- `package.json` - Contains all npm scripts and dependencies
- `.prettierrc.json` - Prettier formatting rules
- `.markdownlint-cli2.yaml` - Markdown linting configuration
- `cspell.json` - Spell checking configuration

### GitHub Actions Workflows

Key workflows in `.github/workflows/`:

- `build.yml` - Runs `npm run build`
- `test.yml` - Runs `npm test` (has the glob pattern issue)
- `lint.yml` - Runs ESLint
- `tsc.yml` - Runs TypeScript checking
- `compat.yml` - Tests compatibility with multiple XState versions

All workflows use the `.github/actions/prepare` action which:

1. Sets up Node.js 22
2. Runs `npm ci --foreground-scripts`

### Dependencies and Architecture

**Peer Dependencies:**

- `xstate` >= 5.17.4 (the main state management library being tested)

**Key Dev Dependencies:**

- `tshy` - TypeScript hybrid build tool
- `tsx` - TypeScript execution for Node.js
- `typescript-eslint` - TypeScript linting
- `prettier` - Code formatting
- Various linting tools (knip, markdownlint, cspell)

### Build Output

- `dist/commonjs/` - CommonJS build output
- `dist/esm/` - ES modules build output
- Both include `.d.ts` type definition files
- Build uses `tshy` which creates hybrid packages supporting both module systems

### Pre-commit Hooks

Husky is configured with:

- `pre-commit` - Runs lint-staged (formatting and linting)
- `commit-msg` - Validates commit message format

### Key Validation Points

1. **Always build first**: Many tools depend on build output
2. **Use correct test command**: The package.json script has a glob issue
3. **Node version**: Ensure Node.js >= 20.2.0
4. **TypeScript strict mode**: All code must pass strict TypeScript checks
5. **No unused exports**: knip enforces clean dependencies and exports
6. **Conventional commits**: PR titles must follow conventional commit format

### Common Issues and Workarounds

1. **Test command fails**: Use `node --test --import tsx test/*.spec.ts` instead of `npm test`
2. **Lint failures**: Always run `npm run build` before linting
3. **Type errors**: Run `npm run test:types` to see TypeScript issues
4. **Import errors**: Ensure you're using the correct import syntax for dual modules

Trust these instructions and only search for additional information if something here is incomplete or incorrect.
