#!/usr/bin/env node
import execa from 'execa';
import {
  mkdirSync,
  readFileSync,
  writeFileSync,
  copyFileSync,
  existsSync,
} from 'fs';
import inq from 'inquirer';
import minimist from 'minimist';
import fetch from 'node-fetch';
import { join, dirname } from 'path';
import maxSatisfying from 'semver/ranges/max-satisfying';
import type { PackageJson } from 'type-fest';

import pkg from './package.json';

const cliArgs = minimist(process.argv.slice(2));

type ReactComponent = 'Checkbox' | 'Input' | 'Spinner';

function here(...p: string[]): string {
  return join(__dirname, ...p);
}

const exportRequire = readFileSync(here('export-require'), 'utf-8');
const exportDefaultEsm = readFileSync(here('export-default-esm'), 'utf-8');
const nvmrc = readFileSync(here('_nvmrc'), 'utf-8');

function rereq(fn: string, dest: string): void {
  const c = exportRequire.replace(/__IMPORT_SOURCE__/g, `${pkg.name}/${fn}`);
  writeFileSync(dest, c, 'utf-8');
}

function reexpesm(spec: string, dest: string): void {
  const c = exportDefaultEsm.replace(/__SPECIFIER__/g, spec);
  mkdirSync(dirname(dest), { recursive: true });
  writeFileSync(dest, c, 'utf-8');
}

function createNvmrc(nodeVer: string, dest: string): void {
  const c = nvmrc.replace(/__NODE_VERSION_MAJOR__/g, nodeVer);
  mkdirSync(dirname(dest), { recursive: true });
  writeFileSync(dest, c, 'utf-8');
}

function copy(
  src: string,
  dest: string,
  modifiers: ((c: string) => string)[] = [],
): void {
  mkdirSync(dirname(dest || src), { recursive: true });

  if (modifiers.length === 0) {
    copyFileSync(here(src), dest || src);
    return;
  }

  const contents = readFileSync(here(src), 'utf-8');
  const finalContents = modifiers.reduce(
    (acc, modifier) => modifier(acc),
    contents,
  );

  writeFileSync(dest || src, finalContents, 'utf-8');
}

function copyDir(src: string, dest: string): void {
  execa('cp', ['-R', here(src), dest], {
    stdio: 'inherit',
  });
}

function copyReactComp(cname: ReactComponent): void {
  const fn = `${cname}.tsx`;

  copy(join('react-components', fn), `src/components/${cname}/${fn}`);
  reexpesm(cname, `src/components/${cname}/index.ts`);
}

function fixImports(c: string): string {
  return c.replace(/(require\(['"]).(\/)/g, `$1${pkg.name}$2`);
}

function createGitignore(): Promise<void> {
  return new Promise((resolve, reject) => {
    fetch(
      'https://raw.githubusercontent.com/github/gitignore/master/Node.gitignore',
    )
      .then((r) => r.text())
      .then((c) => {
        writeFileSync('.gitignore', c, 'utf-8');
        resolve();
      })
      .catch(reject);
  });
}

type NpmDep =
  | '@ginterdev/toolkit'
  | '@types/node'
  | '@types/react-dom'
  | '@types/react'
  | '@typescript-eslint/eslint-plugin'
  | '@typescript-eslint/parser'
  | 'autoprefixer'
  | 'babel-plugin-inline-react-svg'
  | 'babel-plugin-module-resolver'
  | 'envalid'
  | 'eslint-config-airbnb-base'
  | 'eslint-config-airbnb-typescript'
  | 'eslint-config-airbnb'
  | 'eslint-config-prettier'
  | 'eslint-import-resolver-alias'
  | 'eslint-plugin-import'
  | 'eslint-plugin-jest'
  | 'eslint-plugin-jsx-a11y'
  | 'eslint-plugin-prettier'
  | 'eslint-plugin-react-hooks'
  | 'eslint-plugin-react'
  | 'eslint'
  | 'husky'
  | 'jest'
  | 'lint-staged'
  | 'next'
  | 'postcss'
  | 'prettier-plugin-package'
  | 'prettier'
  | 'react-dom'
  | 'react'
  | 'tailwindcss'
  | 'typescript';

function filterFalsy(arr: (NpmDep | boolean)[]): NpmDep[] {
  return arr.filter((el): el is NpmDep => typeof el === 'string');
}

type Answers = {
  ie11: boolean;
  fullNodeVersion: string;
  nodeVersion: string;
  files: Feature[];
  packager: 'yarn' | 'npm';
};

type Feature =
  | 'docker'
  | 'gh-actions'
  | 'jest'
  | 'nextjs'
  | 'tailwind'
  | 'typescript'
  | 'vscode';

type FeatureConfig = {
  npmScripts: Record<string, string>;
  deps: NpmDep[];
  devDeps: NpmDep[];
};

type FeatureResolver = (answers: Answers) => FeatureConfig;

function commonFeatures({ nodeVersion, files }: Answers): FeatureConfig {
  copy('_gitattributes', '.gitattributes');
  copy('_npmrc', '.npmrc');
  createNvmrc(nodeVersion, '.nvmrc');

  // those are basic tools that we will have anyway, no option to opt out
  rereq('husky', '.huskyrc.js');
  rereq('lintstaged', '.lintstagedrc.js');
  rereq('eslint', '.eslintrc.js');
  rereq('prettier', '.prettierrc.js');

  copyReactComp('Checkbox');
  copyReactComp('Input');
  copyReactComp('Spinner');

  const hasReact = files.includes('nextjs');
  const hasJest = files.includes('jest');
  const hasTypescript = files.includes('typescript');

  const airbnbConfig: NpmDep = hasTypescript
    ? 'eslint-config-airbnb-typescript'
    : hasReact
    ? 'eslint-config-airbnb'
    : 'eslint-config-airbnb-base';

  return {
    npmScripts: {
      eslint: `eslint --ext '.js,.jsx,.ts,.tsx' --ignore-pattern '!.*.js'`,
      lint: `yarn run eslint .`,
    },
    deps: filterFalsy([
      '@ginterdev/toolkit',
      hasReact && 'react',
      hasReact && 'react-dom',
    ]),
    devDeps: filterFalsy([
      airbnbConfig,
      hasReact && 'eslint-plugin-jsx-a11y',
      hasReact && 'eslint-plugin-react',
      hasReact && 'eslint-plugin-react-hooks',
      hasJest && 'eslint-plugin-jest',
      'eslint-config-prettier',
      'eslint-import-resolver-alias',
      'eslint-plugin-import',
      'eslint-plugin-prettier',
      'eslint',
      'husky',
      'lint-staged',
      'prettier',
      'prettier-plugin-package',
      hasTypescript && hasReact && '@types/react',
      hasTypescript && hasReact && '@types/react-dom',
    ]),
  };
}

const map: Record<Feature, FeatureResolver> = {
  tailwind: ({ ie11 }) => {
    copy('_tailwind.css', 'src/assets/css/tailwind.css');
    copy('_tailwind.config.js', 'tailwind.config.js', [fixImports]);

    if (!ie11) {
      rereq('postcss', 'postcss.config.js');
    }

    return {
      npmScripts: {
        'build:tailwind': `tailwind build src/assets/css/tailwind.css --output public/css/tailwind.out.css`,
      },
      deps: ['tailwindcss', 'autoprefixer', 'postcss'],
      devDeps: [],
    };
  },
  docker: ({ fullNodeVersion }) => {
    copy('_dockerignore', '.dockerignore');
    copy('_Dockerfile', 'Dockerfile', [
      (c) => c.replace(/__NODE_VERSION__/g, fullNodeVersion),
    ]);
    copy('scripts/rewrite-pkg-json.js', 'scripts/rewrite-pkg-json.js');

    return { npmScripts: {}, deps: [], devDeps: [] };
  },
  jest: () => ({
    npmScripts: {
      test: 'NODE_ENV=test jest',
    },
    deps: [],
    devDeps: ['jest'],
  }),
  typescript: () => {
    // for very simple project we might not need typescript
    copy('_tsconfig.eslint.json', 'tsconfig.eslint.json');
    copy('_tsconfig.json', 'tsconfig.json');

    return {
      npmScripts: {
        typecheck: 'tsc --noEmit',
      },
      deps: [],
      devDeps: [
        'typescript',
        '@types/node',
        '@typescript-eslint/eslint-plugin',
        '@typescript-eslint/parser',
      ],
    };
  },
  'gh-actions': ({ fullNodeVersion }) => {
    copy('_github/workflows/ci.yml', '.github/workflows/ci.yml', [
      (c) => c.replace(/__NODE_VERSION__/, fullNodeVersion),
      (c) =>
        c.replace(
          /__CI_BRANCH__/,
          typeof cliArgs['ci-branch'] === 'string'
            ? cliArgs['ci-branch']
            : 'main',
        ),
    ]);
    return { npmScripts: {}, deps: [], devDeps: [] };
  },
  vscode: () => {
    copyDir('_vscode', '.vscode');
    return { npmScripts: {}, deps: [], devDeps: [] };
  },
  nextjs: ({ files }) => {
    copy('_env.example', '.env.example');
    copy('_next.config.js', 'next.config.js', [fixImports]);
    copy('_next-babelrc.js', '.babelrc.js');
    copyDir('next-pages', 'pages');
    copyDir('icons', 'src/assets/icons');

    if (files.includes('typescript')) {
      copy('_env-dts', 'dts/env.d.ts');
      copy('_babel-plugins-dts', 'dts/babel-plugins.d.ts');
    }

    return {
      npmScripts: {
        build: 'NODE_ENV=production next build',
        dev: 'NODE_ENV=development next -p 3001',
        start: 'NODE_ENV=production next start',
      },
      deps: ['envalid', 'next'],
      devDeps: [
        'babel-plugin-module-resolver',
        'babel-plugin-inline-react-svg',
      ],
    };
  },
};

function keys<T extends string | number | symbol>(o: Record<T, any>): T[] {
  return Object.keys(o) as T[];
}

function sortObjectKeys<Key extends string, Val>(
  o: Record<Key, Val>,
): Record<Key, Val> {
  const k = keys(o).sort();

  return k.reduce(
    (newObj: Record<Key, Val>, key: Key) => ({ ...newObj, [key]: o[key] }),
    {} as Record<Key, Val>,
  );
}

(async () => {
  const features: Feature[] = keys(map);

  let answers: Answers = {
    files: features,
    nodeVersion: '12',
    packager: 'yarn',
    ie11: true,
    fullNodeVersion: '12.20.1',
  };

  if (!cliArgs.ci) {
    answers = await inq.prompt([
      {
        type: 'list',
        name: 'nodeVersion',
        message: 'Which version of Node do you want to use?',
        choices: ['12', '14'],
        default: '14',
      },
      {
        type: 'confirm',
        name: 'ie11',
        message: 'Do you need IE11 support?',
        default: true,
      },
      {
        type: 'list',
        name: 'packager',
        message: 'Which package manager to use?',
        choices: ['yarn', 'npm'],
        default: 'yarn',
      },
      {
        type: 'checkbox',
        name: 'files',
        message: 'Which files should be created?',
        choices: features.map((k) => ({ message: k, value: k, checked: true })),
      },
    ]);
  }

  const steps: FeatureResolver[] = answers.files.map((f) => map[f]);

  steps.unshift(commonFeatures);

  const npmDeps: NpmDep[] = [];
  const npmDevDeps: NpmDep[] = [];
  let npmScripts: Record<string, string> = {};

  steps.forEach(async (exec) => {
    const { deps, devDeps, npmScripts: scripts } = exec({
      ...answers,
      fullNodeVersion: answers.nodeVersion === '12' ? '12.20.1' : '14.15.4',
    });

    npmDeps.push(...deps);
    npmDevDeps.push(...devDeps);
    npmScripts = { ...npmScripts, ...scripts };
  });

  // this is crucial, because if we don't have package.json here
  // yarn/npm will install deps in parent dir (this is weird)
  if (!existsSync('package.json')) {
    await execa('npm', ['init', '-y'], { stdio: 'inherit' });
  }

  function isNotTaggedVer(v: string): boolean {
    return /^\d+\.\d+\.\d+$/.test(v);
  }

  function getVersions(
    dep: string,
    removeTaggedVersions: boolean = true,
  ): string[] {
    const out = execa.sync('npm', ['view', dep, 'versions', '--json'], {
      stderr: 'inherit',
    }).stdout;

    const ver = JSON.parse(out);

    return removeTaggedVersions ? ver.filter(isNotTaggedVer) : ver;
  }

  function getLatest(d: string): string {
    return execa.sync('npm', ['view', d, 'version'], { stderr: 'inherit' })
      .stdout;
  }

  const constraints: Record<
    string,
    ((versions: string[]) => string | null) | null
  > = {
    // no support for v5 for now (version 5 is free
    // only for open source projects)
    husky: (v: string[]) => maxSatisfying(v, '<5'),
    // tailwind v2 has dropped support for IE11
    tailwindcss: answers.ie11 ? (v: string[]) => maxSatisfying(v, '<2') : null,
  };

  function versionifyDeps(deps: string[]) {
    return deps.reduce((acc: Record<string, string>, d: string) => {
      const constraint = constraints[d];
      let ver: string = 'latest';

      if (d === pkg.name) {
        ver = cliArgs.ci
          ? // this is how `npm pack` will name the tarball
            `file:./ginterdev-toolkit-${pkg.version}.tgz`
          : pkg.version;
      } else if (constraint) {
        const verFromConstraint: string | null = constraint(
          getVersions(d, true),
        );

        if (verFromConstraint === null) {
          throw new Error(`Cannot get version for '${d}'`);
        }

        ver = verFromConstraint;
      } else {
        ver = getLatest(d);
      }

      acc[d] = ver;
      return acc;
    }, {});
  }

  const pkgJsonContents: string = readFileSync('package.json', 'utf-8');
  const pkgJson: PackageJson = JSON.parse(pkgJsonContents);

  pkgJson.license = pkgJson.license || 'UNLICENSED';

  const prevScripts: Record<string, string> = pkgJson.scripts || {};

  pkgJson.scripts = sortObjectKeys({
    ...prevScripts,
    ...npmScripts,
  });

  pkgJson.engines = {
    ...pkgJson.engines,
    node: `^${answers.nodeVersion}`,
  };

  if (npmDeps.length > 0) {
    pkgJson.dependencies = sortObjectKeys({
      ...pkgJson.dependencies,
      ...versionifyDeps(npmDeps),
    });
  }

  pkgJson.devDependencies = sortObjectKeys({
    ...pkgJson.devDependencies,
    ...versionifyDeps(npmDevDeps),
  });

  writeFileSync('package.json', JSON.stringify(pkgJson, null, 2), 'utf-8');

  await createGitignore();
})();
