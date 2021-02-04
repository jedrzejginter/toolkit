# @ginterdev/toolkit

> Fully-featured toolkit for [my](https://github.com/jedrzejginter) projects. Includes CLI for generating complete project boilerplate.

![npm version](https://img.shields.io/npm/v/@ginterdev/toolkit.svg?style=flat-square)

## Installation

This library requires Node v12 or newer.

```console
npm add --save-exact @ginterdev/toolkit

# or

yarn add --exact @ginterdev/toolkit
```

## Usage

```console
npx @ginterdev/toolkit [options]
```

### Options

This CLI has some default features that will always be installed:

- ESLint (with config),
- Husky v4 (pre-commit hook),
- lint-staged (with config),
- Prettier (with config).

```bash
npx @ginterdev/toolkit

  # add Dockerfile and .dockerignore for building basic Node.js image
  --docker

  # install dependencies versions that don't support IE11 (like Tailwind v2)
  --drop-ie11

  # add 'jest' for testing
  --jest

  # add .github with workflow running basic checks (linters, type checking)
  --github-ci

  # specify exact node version to use for the project
  # notice, that <version> must be valid semver: <major>.<minor>.<patch>
  # when this option is not specified, default version will be used (12.20.1)
  --node <version>

  # use 'npm' instead of 'yarn' for commands
  --npm

  # add 'react' and 'react-dom' along with some basic components
  --react

  # add Next.js configuration
  # (notice that --react doesn't have to be specified because this option
  # indicates using of React)
  --nextjs

  # don't install dependencies as part of this CLI execution
  --skip-install

  # add Tailwind support
  # - creates config files
  # - add 'tailwindcss' as dependency
  --tailwind

  # add Typescript support
  --typescript

  # add simple .vscode directory with couple of settings
  --vscode
```

## Example usage

_Create project with Tailwind, Typescript and Next.js. Don't include Github Actions workflows or Docker support. Use Node v14._

```console
npx @ginterdev/toolkit --node 14.15.4 --tailwind --nextjs --typescript
```
