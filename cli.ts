#!/usr/bin/env node
import copyfiles from 'copyfiles';
import execa from 'execa';
import { existsSync, promises as fs } from 'fs';
import Listr from 'listr';
import minimist from 'minimist';
import fetch from 'node-fetch';
import { join, dirname, parse } from 'path';
import semverMajor from 'semver/functions/major';
import semverIsValid from 'semver/functions/valid';
import maxSatisfying from 'semver/ranges/max-satisfying';
import type { PackageJson } from 'type-fest';

import pkg from './package.json';

const { mkdir, readFile, writeFile, copyFile } = fs;

type CliFlag =
  | 'tailwind'
  | 'drop-ie11'
  | 'docker'
  | 'react'
  | 'nextjs'
  | 'jest'
  | 'github-ci'
  | 'node'
  | 'typescript'
  | 'npm'
  | 'vscode'
  | 'no-install'
  // for testing only
  | 'dangerously-enable-ci-environment'
  | 'dangerously-set-github-ci-branch';

const cliFlags: Record<CliFlag, string> = {
  tailwind: '',
  'drop-ie11': '',
  'no-install': '',
  docker: '',
  react: '',
  nextjs: '',
  jest: '',
  'github-ci': '',
  node: '',
  typescript: '',
  npm: '',
  vscode: '',
  'dangerously-enable-ci-environment': '',
  'dangerously-set-github-ci-branch': '',
};

type CliArgs = Partial<Record<CliFlag, unknown>> & {
  _: any[];
};

type FeaturesArgs = {
  /** Add react support */
  react: boolean;
  /** Add next.js (automatically sets 'react' to true) */
  nextjs: boolean;
  /** Add jest */
  jest: boolean;
  /** Add github actions workflows */
  githubCI: boolean;
  /** Add tailwind support */
  tailwind: boolean;
  /** Add docker support */
  docker: boolean;
  /** Add typescript support */
  typescript: boolean;
  /** Add VSCode directory. */
  vscode: boolean;
};

type MetaFeatures = {
  /** Node version to use (must follow semver) */
  nodeVersion: string;
  /** Major version, extracted from 'nodeVersion' */
  nodeVersionMajor: string;
  /** Force tailwind v1 to support ie11 */
  tailwindV1: boolean;
  /** Use npm instead of yarn */
  npm: boolean;
  /** Don't install dependencies or fix codebase with 'lint' command */
  noInstall: boolean;
};

type Feature = keyof FeaturesArgs;

const cliArgs: CliArgs = minimist(process.argv.slice(2));

// detect unknown cli args - prevents typos
Object.keys(cliArgs).forEach((cliArg) => {
  // internal property from 'minimist'
  if (cliArg === '_') {
    return;
  }

  if (!Object.prototype.hasOwnProperty.call(cliFlags, cliArg)) {
    process.stderr.write(`Unrecognized argument: ${cliArg}\n`);
    process.exit(1);
  }
});

function isStringOrNumber(v: unknown): v is string | number {
  return typeof v === 'string' || typeof v === 'number';
}

function isExactlyTrue(v: unknown): v is true {
  return v === true;
}

const FALLBACK_NODE_VERSION = '12.20.1' as const;

// Ensure, that '--node' is valid semver
if (isStringOrNumber(cliArgs.node) && !semverIsValid(String(cliArgs.node))) {
  throw new Error(
    `Expected Node version to be a semver-compliant, got '${cliArgs.node}'`,
  );
}

const dropIE11: boolean = isExactlyTrue(cliArgs['drop-ie11']);

const features: FeaturesArgs = {
  react: isExactlyTrue(cliArgs.nextjs) || isExactlyTrue(cliArgs.react),
  nextjs: isExactlyTrue(cliArgs.nextjs),
  tailwind: isExactlyTrue(cliArgs.tailwind),
  docker: isExactlyTrue(cliArgs.docker),
  jest: isExactlyTrue(cliArgs.jest),
  typescript: isExactlyTrue(cliArgs.typescript),
  githubCI: isExactlyTrue(cliArgs['github-ci']),
  vscode: isExactlyTrue(cliArgs.vscode),
};

const nodeVersion =
  isStringOrNumber(cliArgs.node) && semverIsValid(String(cliArgs.node))
    ? String(cliArgs.node)
    : FALLBACK_NODE_VERSION;

const metaFeatures: MetaFeatures = {
  npm: isExactlyTrue(cliArgs.npm),
  tailwindV1: !dropIE11,
  nodeVersion,
  nodeVersionMajor: String(semverMajor(nodeVersion)),
  noInstall: isExactlyTrue(cliArgs['no-install']),
};

type MergedFeatures = FeaturesArgs & MetaFeatures;

const mergedFeatures: MergedFeatures = {
  ...metaFeatures,
  ...features,
};

type ReactComponent = 'Checkbox' | 'Input' | 'Spinner';

function here(...p: string[]): string {
  return join(__dirname, ...p);
}

(async () => {
  const exportRequire = await readFile(here('export-require'), 'utf-8');
  const exportDefaultEsm = await readFile(here('export-default-esm'), 'utf-8');
  const nvmrc = await readFile(here('_nvmrc'), 'utf-8');

  async function rereq(fn: string, dest: string): Promise<void> {
    const c = exportRequire.replace(/__IMPORT_SOURCE__/g, `${pkg.name}/${fn}`);
    await writeFile(dest, c, 'utf-8');
  }

  async function reexpesm(spec: string, dest: string): Promise<void> {
    const c = exportDefaultEsm.replace(/__SPECIFIER__/g, spec);
    await mkdir(dirname(dest), { recursive: true });
    await writeFile(dest, c, 'utf-8');
  }

  async function createNvmrc(nodeVer: string, dest: string): Promise<void> {
    const c = nvmrc.replace(/__NODE_VERSION_MAJOR__/g, nodeVer);
    await mkdir(dirname(dest), { recursive: true });
    await writeFile(dest, c, 'utf-8');
  }

  async function copy(
    src: string,
    dest: string,
    modifiers: ((c: string) => string)[] = [],
  ): Promise<void> {
    await mkdir(dirname(dest || src), { recursive: true });

    if (modifiers.length === 0) {
      await copyFile(here(src), dest || src);
      return;
    }

    const contents = await readFile(here(src), 'utf-8');
    const finalContents = modifiers.reduce(
      (acc, modifier) => modifier(acc),
      contents,
    );

    await writeFile(dest || src, finalContents, 'utf-8');
  }

  function copyDir(src: string, dest: string): Promise<void> {
    return new Promise((resolve) => {
      copyfiles([join(here(src), '/*'), dest], { up: true }, () => {
        resolve();
      });
    });
  }

  async function copyReactComp(cname: ReactComponent): Promise<void> {
    const fn = `${cname}.tsx`;

    await copy(join('react-components', fn), `src/components/${cname}/${fn}`);
    await reexpesm(cname, `src/components/${cname}/index.ts`);
  }

  function fixImports(c: string): string {
    return c.replace(/(require\(['"]).(\/)/g, `$1${pkg.name}$2`);
  }

  async function createGitignore(): Promise<void> {
    const res = await fetch(
      'https://raw.githubusercontent.com/github/gitignore/master/Node.gitignore',
    );

    const contents = await res.text();
    await writeFile('.gitignore', contents, 'utf-8');
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

  type FeatureConfig = {
    scripts: Record<string, string>;
    deps: NpmDep[];
    devDeps: NpmDep[];
  };

  type FeatureResolver = (feat: MergedFeatures) => Promise<FeatureConfig>;

  async function commonFeatures(feat: MergedFeatures): Promise<FeatureConfig> {
    await Promise.all([
      copy('_gitattributes', '.gitattributes'),
      copy('_npmrc', '.npmrc'),
      createNvmrc(feat.nodeVersionMajor, '.nvmrc'),
      rereq('husky', '.huskyrc.js'),
      rereq('lintstaged', '.lintstagedrc.js'),
      rereq('eslint', '.eslintrc.js'),
      rereq('prettier', '.prettierrc.js'),
    ]);

    const airbnbConfig: NpmDep = feat.typescript
      ? 'eslint-config-airbnb-typescript'
      : feat.react
      ? 'eslint-config-airbnb'
      : 'eslint-config-airbnb-base';

    const eslintExt = feat.typescript
      ? feat.react
        ? ['.js', '.jsx', '.ts', '.tsx']
        : ['.js', '.ts']
      : feat.react
      ? ['.js', '.jsx']
      : ['.js'];

    return {
      scripts: {
        eslint: `eslint --ext '${eslintExt.join(
          ',',
        )}' --ignore-pattern '!.*.js'`,
        lint: `yarn run eslint .`,
      },
      deps: filterFalsy(['@ginterdev/toolkit']),
      devDeps: [
        airbnbConfig,
        'eslint-config-prettier',
        'eslint-import-resolver-alias',
        'eslint-plugin-import',
        'eslint-plugin-prettier',
        'eslint',
        'husky',
        'lint-staged',
        'prettier',
        'prettier-plugin-package',
      ],
    };
  }

  const featuresResolversMap: Record<Feature, FeatureResolver> = {
    react: async (feat) => {
      await Promise.all([
        copyReactComp('Checkbox'),
        copyReactComp('Input'),
        copyReactComp('Spinner'),
      ]);

      return {
        scripts: {},
        deps: ['react', 'react-dom'],
        devDeps: filterFalsy([
          'eslint-plugin-jsx-a11y',
          'eslint-plugin-react',
          'eslint-plugin-react-hooks',
          feat.typescript && '@types/react',
          feat.typescript && '@types/react-dom',
        ]),
      };
    },
    tailwind: async (feat) => {
      await copy('_tailwind.css', 'src/assets/css/tailwind.css');
      await copy('_tailwind.config.js', 'tailwind.config.js', [fixImports]);

      if (!feat.tailwindV1) {
        await rereq('postcss', 'postcss.config.js');
      }

      return {
        scripts: {
          'build:tailwind': `tailwind build src/assets/css/tailwind.css --output public/css/tailwind.out.css`,
        },
        deps: ['tailwindcss', 'autoprefixer', 'postcss'],
        devDeps: [],
      };
    },
    docker: async (feat) => {
      await Promise.all([
        copy('_dockerignore', '.dockerignore'),
        copy('_Dockerfile', 'Dockerfile', [
          (c) => c.replace(/__NODE_VERSION__/g, feat.nodeVersion),
        ]),
        copy('scripts/rewrite-pkg-json.js', 'scripts/rewrite-pkg-json.js'),
      ]);

      return { scripts: {}, deps: [], devDeps: [] };
    },
    jest: async () => ({
      scripts: {
        test: 'NODE_ENV=test jest',
      },
      deps: [],
      devDeps: ['jest', 'eslint-plugin-jest'],
    }),
    typescript: async () => {
      await copy('_tsconfig.eslint.json', 'tsconfig.eslint.json');
      await copy('_tsconfig.json', 'tsconfig.json');

      return {
        scripts: {
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
    githubCI: async (feat) => {
      await copy('_github/workflows/ci.yml', '.github/workflows/ci.yml', [
        (c) => c.replace(/__NODE_VERSION__/, feat.nodeVersion),
        (c) =>
          c.replace(
            /__CI_BRANCH__/,
            typeof cliArgs['dangerously-set-github-ci-branch'] === 'string'
              ? cliArgs['dangerously-set-github-ci-branch']
              : 'main',
          ),
      ]);
      return { scripts: {}, deps: [], devDeps: [] };
    },
    vscode: async () => {
      await copyDir('_vscode', '.vscode');
      return { scripts: {}, deps: [], devDeps: [] };
    },
    nextjs: async (feat) => {
      await Promise.all([
        copy('_env.example', '.env.example'),
        copy('_env.example', '.env'),
        copy('_next.config.js', 'next.config.js', [fixImports]),
        copy('_next-babelrc.js', '.babelrc.js'),
        copyDir('next-pages', 'pages'),
        copyDir('icons', 'src/assets/icons'),
      ]);

      if (feat.typescript) {
        copy('_env-dts', 'dts/env.d.ts');
        copy('_babel-plugins-dts', 'dts/babel-plugins.d.ts');
      }

      return {
        scripts: {
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

  function isNotTaggedVer(v: string): boolean {
    return /^\d+\.\d+\.\d+$/.test(v);
  }

  async function getVersions(
    dep: string,
    removeTaggedVersions: boolean = true,
  ): Promise<string[]> {
    const { stdout } = await execa('npm', ['view', dep, 'versions', '--json'], {
      stderr: 'inherit',
    });

    const ver = JSON.parse(stdout);

    return removeTaggedVersions ? ver.filter(isNotTaggedVer) : ver;
  }

  async function getLatest(d: string): Promise<string> {
    const { stdout } = await execa('npm', ['view', d, 'version'], {
      stderr: 'inherit',
    });
    return stdout;
  }

  const constraints: Record<
    string,
    ((versions: string[]) => string | null) | null
  > = {
    // no support for v5 for now (version 5 is free
    // only for open source projects)
    husky: (v: string[]) => maxSatisfying(v, '<5'),
    // tailwind v2 has dropped support for IE11
    tailwindcss: mergedFeatures.tailwindV1
      ? (v: string[]) => maxSatisfying(v, '<2')
      : null,
  };

  async function versionifyDeps(
    deps: string[],
  ): Promise<Record<string, string>> {
    const promises = deps.map(async (dependency: string) => {
      const constraint = constraints[dependency];
      let ver: string = 'latest';

      if (dependency === pkg.name) {
        ver = cliArgs['dangerously-enable-ci-environment']
          ? // this is how `npm pack` will name the tarball
            `file:./ginterdev-toolkit-${pkg.version}.tgz`
          : pkg.version;
      } else if (constraint) {
        const allDependencyVersions = await getVersions(dependency, true);
        const verFromConstraint: string | null = constraint(
          allDependencyVersions,
        );

        if (verFromConstraint === null) {
          throw new Error(`Cannot get version for '${dependency}'`);
        }

        ver = verFromConstraint;
      } else {
        ver = await getLatest(dependency);
      }

      return [dependency, ver];
    });

    const resolvedDependencies = await Promise.all(promises);

    return resolvedDependencies.reduce(
      (list, [dependency, version]) => ({
        ...list,
        [dependency]: version,
      }),
      {},
    );
  }

  // this is for typescript only
  function objectEntries<T extends string, S>(o: Record<T, S>): [T, S][] {
    return Object.entries(o) as [T, S][];
  }

  type ListrContext = {
    packageJsonReady?: boolean;
    dependenciesReady?: boolean;
  };

  const npmDeps: NpmDep[] = [];
  const npmDevDeps: NpmDep[] = [];
  let npmScripts: Record<string, string> = {};

  const tasks = new Listr<ListrContext>([
    {
      title: 'Create source code files',
      task: async () => {
        const featuresResolvers: FeatureResolver[] = [commonFeatures];
        const entries: [Feature, FeatureResolver][] = objectEntries(
          featuresResolversMap,
        );

        entries.forEach(([feature, resolver]: [Feature, FeatureResolver]) => {
          if (features[feature]) {
            featuresResolvers.push(resolver);
          }
        });

        const promises = featuresResolvers.map((resolver) =>
          resolver(mergedFeatures),
        );

        const allConfigsResolved = await Promise.all(promises);

        allConfigsResolved.forEach(({ deps, devDeps, scripts }) => {
          npmDeps.push(...deps);
          npmDevDeps.push(...devDeps);
          npmScripts = { ...npmScripts, ...scripts };
        });
      },
    },
    {
      title: 'Prepare package.json with correct dependencies',
      task: async (ctx) => {
        // this is crucial, because if we don't have package.json here
        // yarn/npm will install deps in parent dir (this is weird)
        if (!existsSync('package.json')) {
          await writeFile('package.json', '{}', 'utf-8');
        }

        const pkgJsonContents: string = await readFile('package.json', 'utf-8');
        const pkgJson: PackageJson = JSON.parse(pkgJsonContents);

        // this is similar what 'npm/yarn init -y' do
        pkgJson.name = pkgJson.name || parse(process.cwd()).name;

        pkgJson.license = pkgJson.license || 'UNLICENSED';
        pkgJson.version = pkgJson.version || '0.0.0';

        const prevScripts: Record<string, string> = pkgJson.scripts || {};

        pkgJson.scripts = sortObjectKeys({
          ...prevScripts,
          ...npmScripts,
        });

        pkgJson.engines = {
          ...pkgJson.engines,
          node: `^${mergedFeatures.nodeVersionMajor}`,
        };

        if (npmDeps.length > 0) {
          const versionedDeps = await versionifyDeps(npmDeps);

          pkgJson.dependencies = sortObjectKeys({
            ...pkgJson.dependencies,
            ...versionedDeps,
          });
        }

        const versionedDevDeps = await versionifyDeps(npmDevDeps);

        pkgJson.devDependencies = sortObjectKeys({
          ...pkgJson.devDependencies,
          ...versionedDevDeps,
        });

        await writeFile(
          'package.json',
          JSON.stringify(pkgJson, null, 2),
          'utf-8',
        );

        ctx.packageJsonReady = true;
      },
    },
    {
      title: 'Create .gitignore file',
      task: createGitignore,
    },
    {
      title: 'Installing dependencies',
      enabled: (ctx) => ctx.packageJsonReady === true,
      skip: () => mergedFeatures.noInstall,
      task: async (ctx) => {
        await execa.command(mergedFeatures.npm ? 'npm i' : 'yarn install', {
          stderr: 'inherit',
        });

        ctx.dependenciesReady = true;
      },
    },
    {
      title: 'Format codebase',
      enabled: (ctx) => ctx.dependenciesReady === true,
      skip: () => mergedFeatures.noInstall,
      task: async () => {
        await execa(
          mergedFeatures.npm ? 'npm' : 'yarn',
          ['run', 'lint', '--fix'],
          {
            stderr: 'inherit',
          },
        );
      },
    },
  ]);

  await tasks.run({
    packageJsonReady: false,
    dependenciesReady: false,
  });
})();
