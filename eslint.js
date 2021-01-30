const { existsSync } = require('fs');
const { join } = require('path');

const options = require('./options');

const [OFF, ERROR] = ['off', 'error'];

const config = {
  extends: [
    options.hasTypescript
      ? 'airbnb-typescript'
      : options.hasReact
      ? 'airbnb'
      : 'airbnb-base',
    options.hasReact && 'plugin:react-hooks/recommended',
    options.hasTestingLibrary && 'testing-library/recommended',
    options.hasTestingLibrary && options.hasReact && 'testing-library/react',
    options.hasTypescript && 'prettier/@typescript-eslint',
    'prettier',
    options.hasReact && 'prettier/react',
  ].filter(Boolean),
  plugins: [
    'prettier',
    options.hasReact && 'react-hooks',
    options.hasJest && 'jest',
    options.hasTestingLibrary && 'testing-library',
    options.hasTypescript && '@typescript-eslint',
  ].filter(Boolean),
  env: {
    browser: true,
    es6: true,
    node: true,
    jest: options.hasJest,
  },
  settings: {
    'import/resolver': {
      alias: {
        extensions: ['.ts', '.tsx', '.js', '.jsx', '.json'],
        map: [['@', join(process.cwd(), 'src')]],
      },
    },
  },
  ...(options.hasTypescript && {
    parser: '@typescript-eslint/parser',
  }),
  parserOptions: {
    ecmaVersion: 2018,
    sourceType: 'module',
    ...(options.hasTypescript && {
      project: existsSync('tsconfig.eslint.json')
        ? './tsconfig.eslint.json'
        : './tsconfig.json',
    }),
    ecmaFeatures: {
      jsx: options.hasReact,
    },
  },
  rules: {
    ...(options.hasTypescript && {
      '@typescript-eslint/camelcase': OFF,
    }),
    ...(options.hasReact && {
      'jsx-a11y/anchor-is-valid': OFF,
      'jsx-a11y/click-events-have-key-events': OFF,
      'jsx-a11y/no-noninteractive-element-interactions': OFF,
      'jsx-a11y/no-noninteractive-tabindex': OFF,
      'jsx-a11y/no-static-element-interactions': OFF,
      'react-hooks/exhaustive-deps': ERROR,
      'react/destructuring-assignment': OFF,
      'react/jsx-one-expression-per-line': OFF,
      'react/jsx-props-no-spreading': OFF,
      'react/no-array-index-key': OFF,
      'react/no-danger': OFF,
      'react/no-unescaped-entities': OFF,
      'react/prop-types': OFF,
      'react/react-in-jsx-scope': options.hasNext ? OFF : ERROR,
      'react/require-default-props': OFF,
      'react/state-in-constructor': OFF,
      'react/static-property-placement': OFF,
      'jsx-a11y/label-has-associated-control': [
        ERROR,
        {
          labelComponents: [],
          labelAttributes: [],
          controlComponents: [],
          assert: 'either',
          depth: 25,
        },
      ],
    }),
    'default-case': OFF,
    'import/order': [
      ERROR,
      {
        'newlines-between': 'always',
        groups: [
          ['external', 'builtin'],
          'internal',
          'parent',
          ['index', 'sibling'],
          'object',
        ],
        alphabetize: {
          order: 'asc',
          caseInsensitive: true,
        },
        pathGroups: [
          {
            pattern: '@/**',
            group: 'internal',
          },
        ],
      },
    ],
    'import/prefer-default-export': OFF,
    'no-nested-ternary': OFF,
    'no-param-reassign': OFF,
    'no-restricted-globals': OFF,
    'no-restricted-syntax': OFF,
    'no-underscore-dangle': OFF,
    'prettier/prettier': ERROR,
  },
};

module.exports = config;
