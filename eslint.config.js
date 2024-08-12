/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
import eslint from '@eslint/js';
import stylistic from '@stylistic/eslint-plugin';
import n from 'eslint-plugin-n';
import perfectionist from 'eslint-plugin-perfectionist';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: ['dist', 'node_modules', 'package-lock.json', '**/*.snap'],
  },
  {
    linterOptions: {
      reportUnusedDisableDirectives: 'error',
    },
  },
  eslint.configs.recommended,
  n.configs['flat/recommended'],
  perfectionist.configs['recommended-natural'],
  ...tseslint.config({
    extends: tseslint.configs.recommendedTypeChecked,
    files: ['**/*.js', '**/*.ts'],
    languageOptions: {
      parserOptions: {
        EXPERIMENTAL_useProjectService: {
          allowDefaultProjectForFiles: ['./*.*s', 'eslint.config.js'],
          defaultProject: './tsconfig.tsc.json',
          // https://github.com/typescript-eslint/typescript-eslint/issues/9032
          maximumDefaultProjectFileMatchCount_THIS_WILL_SLOW_DOWN_LINTING:
            Infinity,
        },
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

      '@typescript-eslint/consistent-type-exports': [
        'error',
        {fixMixedExportsWithInlineTypeSpecifier: true},
      ],

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

      // this rule seems broken
      '@typescript-eslint/no-invalid-void-type': 'off',

      // HATE IT
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/no-unnecessary-boolean-literal-compare': [
        'error',
        {
          allowComparingNullableBooleansToFalse: true,
          allowComparingNullableBooleansToTrue: true,
        },
      ],
      // too many false positives
      '@typescript-eslint/no-unnecessary-condition': 'off',

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

      // this conflicts with eslint-plugin-perfectionist (just in case)
      '@typescript-eslint/sort-type-constituents': 'off',

      '@typescript-eslint/switch-exhaustiveness-check': 'error',

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
    },
  }),
  {
    files: ['*.jsonc'],
    rules: {
      'jsonc/comma-dangle': 'off',
      'jsonc/no-comments': 'off',
      'jsonc/sort-keys': 'error',
    },
  },
  {
    extends: [tseslint.configs.disableTypeChecked],
    files: ['**/*.md/*.ts'],
    rules: {
      'n/no-missing-import': ['error', {allowModules: ['xstate-audition']}],
    },
  },
  {
    files: ['test/**/*.ts'],
    rules: {
      '@typescript-eslint/no-floating-promises': 'off',
    },
  },
);
