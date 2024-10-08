// @ts-check

import eslint from '@eslint/js';
import stylistic from '@stylistic/eslint-plugin';
import n from 'eslint-plugin-n';
import perfectionist from 'eslint-plugin-perfectionist';
import {builtinModules} from 'node:module';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: [
      'dist',
      'node_modules',
      'package-lock.json',
      'docs',
      '.tshy-build',
      '.tshy',
    ],
  },
  {
    linterOptions: {
      reportUnusedDisableDirectives: 'error',
    },
  },
  eslint.configs.recommended,
  perfectionist.configs['recommended-natural'],
  ...tseslint.config({
    extends: tseslint.configs.recommendedTypeChecked,
    files: ['**/*.ts', '**/*.mts', '**/*.cts'],
    languageOptions: {
      parserOptions: {
        projectService: {
          allowDefaultProject: ['*.js', '.*.js'],
        },
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: {
      '@stylistic': stylistic,
    },
    rules: {
      '@stylistic/lines-around-comment': [
        'warn',
        {
          allowArrayStart: true,
          allowBlockStart: true,
          allowClassStart: true,
          allowInterfaceStart: true,
          // these conflict with prettier, so we must allow them
          allowObjectStart: true,
          allowTypeStart: true,
          beforeBlockComment: true,
        },
      ],

      '@stylistic/lines-between-class-members': 'error',

      '@stylistic/padding-line-between-statements': [
        'error',
        {blankLine: 'always', next: 'export', prev: '*'},
        {blankLine: 'always', next: 'const', prev: '*'},
        {blankLine: 'always', next: '*', prev: 'const'},
        {blankLine: 'always', next: 'let', prev: '*'},
        {blankLine: 'always', next: '*', prev: 'const'},
        {blankLine: 'always', next: 'type', prev: '*'},
        {blankLine: 'always', next: '*', prev: 'type'},
        {blankLine: 'always', next: 'return', prev: '*'},
      ],

      '@stylistic/semi': ['error', 'always'],

      // normalize type exports
      '@typescript-eslint/consistent-type-exports': [
        'error',
        {fixMixedExportsWithInlineTypeSpecifier: true},
      ],

      // normalize type imports
      '@typescript-eslint/consistent-type-imports': [
        'error',
        {
          disallowTypeAnnotations: true,
          fixStyle: 'inline-type-imports',
          prefer: 'type-imports',
        },
      ],

      // and sometimes you gotta use any
      '@typescript-eslint/no-explicit-any': 'off',

      // HATE IT
      '@typescript-eslint/no-non-null-assertion': 'off',

      // allow prefixing unused vars with _
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
        },
      ],

      // these 6 bytes add up
      '@typescript-eslint/require-await': 'off',

      // I like my template expressions
      '@typescript-eslint/restrict-template-expressions': 'off',

      '@typescript-eslint/switch-exhaustiveness-check': 'error',

      // better for overloading
      '@typescript-eslint/unified-signatures': [
        'error',
        {
          ignoreDifferentlyNamedParameters: true,
        },
      ],

      // seems to be incompatible with tshy
      'n/no-extraneous-import': 'off',

      'n/no-unpublished-import': 'off',

      'no-empty': [
        'error',
        {
          allowEmptyCatch: true,
        },
      ],

      'no-use-before-define': 'off',

      'perfectionist/sort-intersection-types': [
        'error',
        {
          type: 'line-length',
        },
      ],

      'perfectionist/sort-union-types': [
        'error',
        {
          type: 'line-length',
        },
      ],
    },
  }),
  {
    files: ['src/**/*.ts'],
    rules: {
      // sources should not use Node.js builtins
      '@typescript-eslint/no-restricted-imports': [
        'error',
        ...builtinModules,
        ...builtinModules.map((name) => `node:${name}`),
      ],
    },
  },
  {
    ...n.configs['flat/recommended'],
    files: ['test/**/*.ts'],
    rules: {
      '@typescript-eslint/no-floating-promises': 'off',
    },
  },
);
