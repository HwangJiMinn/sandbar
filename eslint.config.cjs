const js = require('@eslint/js');
const globals = require('globals');
const tsParser = require('@typescript-eslint/parser');
const tsPlugin = require('@typescript-eslint/eslint-plugin');
const reactPlugin = require('eslint-plugin-react');
const reactHooksPlugin = require('eslint-plugin-react-hooks');
const jsxA11yPlugin = require('eslint-plugin-jsx-a11y');
const importPlugin = require('eslint-plugin-import');
const simpleImportSortPlugin = require('eslint-plugin-simple-import-sort');
const unusedImportsPlugin = require('eslint-plugin-unused-imports');
const prettierConfig = require('eslint-config-prettier');

module.exports = [
  // === Ignore patterns
  {
    ignores: [
      'node_modules/',
      'build/',
      '/.react-router',
      '/.vscode',
      '/.yarn',
      'yarn.lock',
      'README.md',
      '**/.*',
      '!**/.server/**',
      '!**/.client/**',
    ],
  },

  // === Base JS recommended
  js.configs.recommended,

  // === Base configuration
  {
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
      globals: {
        ...globals.browser,
        ...globals.commonjs,
        ...globals.es2021,
      },
    },
    plugins: {
      'simple-import-sort': simpleImportSortPlugin,
      'unused-imports': unusedImportsPlugin,
    },
    rules: {
      // Custom rules
      'simple-import-sort/imports': 'error',
      'simple-import-sort/exports': 'error',
      'no-console': ['warn', { allow: ['info', 'warn', 'error', 'test'] }],
      'comma-spacing': ['error', { before: false, after: true }],
      'no-trailing-spaces': 'error',
      'eol-last': 'error',
      'no-multiple-empty-lines': ['error', { max: 1, maxEOF: 0 }],
      'array-bracket-spacing': ['error', 'never'],
      'array-callback-return': 'error',
      'object-shorthand': ['error', 'always'],
      'arrow-spacing': 'error',
      'switch-colon-spacing': 'error',
      'block-spacing': 'error',
      'semi-spacing': ['error', { before: false, after: true }],
      'computed-property-spacing': ['error', 'never'],
      'keyword-spacing': ['error', { before: true, after: true }],
      'func-call-spacing': ['error', 'never'],
      'jsx-quotes': ['error', 'prefer-double'],
    },
  },

  // === React
  {
    files: ['**/*.{js,jsx,ts,tsx}'],
    plugins: {
      react: reactPlugin,
      'react-hooks': reactHooksPlugin,
      'jsx-a11y': jsxA11yPlugin,
    },
    settings: {
      react: { version: 'detect' },
      formComponents: ['Form'],
      linkComponents: [
        { name: 'Link', linkAttribute: 'to' },
        { name: 'NavLink', linkAttribute: 'to' },
      ],
      'import/resolver': {
        typescript: {},
      },
    },
    rules: {
      // plugin:react/recommended + jsx-runtime
      ...reactPlugin.configs.recommended.rules,
      ...(reactPlugin.configs['jsx-runtime']?.rules ?? {}),

      // plugin:react-hooks/recommended
      ...reactHooksPlugin.configs.recommended.rules,

      // plugin:jsx-a11y/recommended
      ...jsxA11yPlugin.configs.recommended.rules,

      // React rules
      'react/boolean-prop-naming': 'warn',
      'react/jsx-closing-tag-location': 'error',
      'react/jsx-closing-bracket-location': ['error', 'tag-aligned'],
      'react/jsx-pascal-case': 'error',
      'react/no-direct-mutation-state': 'error',
      'react/jsx-no-useless-fragment': 'error',
      'react/jsx-key': 'warn',
      'react/self-closing-comp': 'error',
      'react/jsx-curly-spacing': ['error', { when: 'never', children: true }],
      'react/jsx-first-prop-new-line': ['error', 'multiline'],
      'react/jsx-equals-spacing': 'error',
      'react/jsx-fragments': 'error',
      'react/jsx-indent': ['error', 2, { indentLogicalExpressions: false }],
      'react/jsx-indent-props': ['error', 2],
      'react/jsx-no-duplicate-props': 'error',
      'react/jsx-props-no-multi-spaces': 'error',
      'react/jsx-space-before-closing': 'error',
      'react/jsx-tag-spacing': ['error', { beforeSelfClosing: 'always' }],
      'react/jsx-curly-brace-presence': [
        'error',
        { props: 'never', children: 'never', propElementValues: 'always' },
      ],
      'react/prop-types': 'off',
    },
  },

  // === TypeScript
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
      import: importPlugin,
    },
    settings: {
      'import/internal-regex': '^~/',
      'import/resolver': {
        node: { extensions: ['.ts', '.tsx'] },
        typescript: { alwaysTryTypes: true },
      },
    },
    rules: {
      // plugin:@typescript-eslint/recommended
      ...tsPlugin.configs.recommended.rules,

      // plugin:import/recommended + plugin:import/typescript
      ...importPlugin.configs.recommended.rules,
      ...(importPlugin.configs.typescript?.rules ?? {}),

      // TypeScript rules
      'no-undef': 'off',
      'import/no-named-as-default': 'off',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          args: 'all',
          argsIgnorePattern: '^_',
          caughtErrors: 'all',
          caughtErrorsIgnorePattern: '^_',
          destructuredArrayIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          ignoreRestSiblings: true,
        },
      ],
      '@typescript-eslint/interface-name-prefix': 'off',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },

  // === Prettier
  prettierConfig,

  // === Node
  {
    files: ['eslint.config.cjs', '**/*.cjs'],
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
  },
];
