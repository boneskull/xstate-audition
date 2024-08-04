# Development

After [forking the repo from GitHub](https://help.github.com/articles/fork-a-repo) and [installing npm](https://npm.io/installation):

```shell
git clone https://github.com/boneskull/xstate-audition
cd xstate-audition
npm install
```

> [!TIP]
> This repository includes a list of suggested VS Code extensions.
> It's a good idea to use [VS Code](https://code.visualstudio.com) and accept its suggestion to install them, as they'll help with development.

## Building

Run [**tshy**](https://npm.im/tshy) locally to build source files from `src/` into output files in `lib/`:

```shell
npm run build
```

Add `--watch` to run the builder in a watch mode that continuously cleans and recreates `lib/` as you save files:

```shell
npm run build -- --watch
```

## Formatting

[Prettier](https://prettier.io) is used to format code. It should be applied automatically when you save files in VS Code or make a Git commit.

To manually reformat all files, you can run:

```shell
npm run format -- --write
```

## Linting

This package includes several forms of linting to enforce consistent code quality and styling.
Each should be shown in VS Code, and can be run manually on the command-line:

- `npm run lint` ([ESLint](https://eslint.org) with [typescript-eslint](https://typescript-eslint.io)): Lints JavaScript and TypeScript source files
- `npm run lint:knip` ([knip](https://github.com/webpro/knip)): Detects unused files, dependencies, and code exports
- `npm run lint:md` ([Markdownlint](https://github.com/DavidAnson/markdownlint): Checks Markdown source files
- `npm run lint:spelling` ([cspell](https://cspell.org)): Spell checks across all source files

Read the individual documentation for each linter to understand how it can be configured and used best.

For example, ESLint can be run with `--fix` to auto-fix some lint rule complaints:

```shell
npm run lint -- --fix
```

Note that you'll likely need to run `npm run build` before `npm run lint` so that lint rules which check the file system can pick up on any built files.

## Type Checking

You should be able to see suggestions from [TypeScript](https://typescriptlang.org) in your editor for all open files.

However, it can be useful to run the TypeScript command-line (`tsc`) to type check all files in `src/`:

```shell
npm run tsc
```

Add `--watch` to keep the type checker running in a watch mode that updates the display as you save files:

```shell
npm run tsc --watch
```

> [!CAUTION]
> Do not attempt to run `tsc` directly; this will place output files in the wrong location and you'll have to clean them up manually!
