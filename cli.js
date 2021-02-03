#!/usr/bin/env node
const execa = require('execa');
const {
  mkdirSync,
  readFileSync,
  writeFileSync,
  copyFileSync,
  existsSync,
} = require('fs');
const inq = require('inquirer');
const minimist = require('minimist');
const fetch = require('node-fetch');
const { join, dirname } = require('path');
const maxSatisfying = require('semver/ranges/max-satisfying');

const cliArgs = minimist(process.argv.slice(2));

const pkg = require('./package.json');

function here(...p) {
  return join(__dirname, ...p);
}

const exportRequire = readFileSync(here('export-require'), 'utf-8');
const exportDefaultEsm = readFileSync(here('export-default-esm'), 'utf-8');
const nvmrc = readFileSync(here('_nvmrc'), 'utf-8');

function rereq(fn, dest) {
  const c = exportRequire.replace(/__IMPORT_SOURCE__/g, `${pkg.name}/${fn}`);
  writeFileSync(dest, c, 'utf-8');
}

function reexpesm(spec, fn, dest) {
  const c = exportDefaultEsm.replace(/__SPECIFIER__/g, spec);
  mkdirSync(dirname(dest), { recursive: true });
  writeFileSync(dest, c, 'utf-8');
}

function createNvmrc(nodeVer, dest) {
  const c = nvmrc.replace(/__NODE_VERSION_MAJOR__/g, nodeVer);
  mkdirSync(dirname(dest), { recursive: true });
  writeFileSync(dest, c, 'utf-8');
}

function copy(src, dest, modifiers = []) {
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

function copyDir(src, dest) {
  execa('cp', ['-R', here(src), dest], {
    stdio: 'inherit',
  });
}

const hasOwn = (o, p) => Object.prototype.hasOwnProperty.call(o, p);

function addNpmScript(name, scr) {
  if (!existsSync('package.json')) {
    writeFileSync('package.json', '{}', 'utf-8');
  }

  const p = JSON.parse(readFileSync('./package.json'));

  if (!hasOwn(p, 'scripts')) {
    p.scripts = {};
  }

  p.scripts[name] = scr;

  writeFileSync('package.json', JSON.stringify(p, null, 2), 'utf-8');
}

function copyReactComp(cname) {
  const fn = `${cname}.tsx`;

  copy(join('react-components', fn), `src/components/${cname}/${fn}`);
  reexpesm(cname, fn, `src/components/${cname}/index.ts`);
}

function fixImports(c) {
  return c.replace(/(require\(['"]).(\/)/g, `$1${pkg.name}$2`);
}

function createGitignore() {
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

const map = {
  tailwind: ({ ie11 }) => {
    copy('_tailwind.css', 'src/assets/css/tailwind.css');
    copy('_tailwind.config.js', 'tailwind.config.js', [fixImports]);
    addNpmScript(
      'build:tailwind',
      `tailwind build src/assets/css/tailwind.css --output public/css/tailwind.out.css`,
    );

    if (!ie11) {
      rereq('postcss', 'postcss.config.js');
    }

    return { deps: ['tailwindcss', 'autoprefixer', 'postcss'], devDeps: [] };
  },
  docker: ({ fullNodeVersion }) => {
    copy('_dockerignore', '.dockerignore');
    copy('_Dockerfile', 'Dockerfile', [
      (c) => c.replace(/__NODE_VERSION__/g, fullNodeVersion),
    ]);
    copy('scripts/rewrite-pkg-json.js');

    return { deps: [], devDeps: [] };
  },
  jest: () => {
    addNpmScript('test', 'NODE_ENV=test jest');

    return { deps: [], devDeps: ['jest'] };
  },
  typescript: () => {
    // for very simple project we might not need typescript
    copy('_tsconfig.eslint.json', 'tsconfig.eslint.json');
    copy('_tsconfig.json', 'tsconfig.json');
    addNpmScript('typecheck', 'tsc --noEmit');

    return {
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
    return { deps: [], devDeps: [] };
  },
  vscode: () => {
    copyDir('_vscode', '.vscode');
    return { deps: [], devDeps: [] };
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

    addNpmScript('build', 'NODE_ENV=production next build');
    // eslint-disable-next-line no-template-curly-in-string
    addNpmScript('dev', 'NODE_ENV=development next -p ${PORT:-3001}');
    addNpmScript('start', 'NODE_ENV=production next start');

    return {
      deps: ['envalid', 'next'],
      devDeps: [
        'babel-plugin-module-resolver',
        'babel-plugin-inline-react-svg',
      ],
    };
  },
  always: ({ nodeVersion, files }) => {
    copy('_gitattributes', '.gitattributes');
    copy('_npmrc', '.npmrc');
    createNvmrc(nodeVersion, '.nvmrc');

    // those are basic tools that we will have anyway, no option to opt out
    rereq('husky', '.huskyrc.js');
    rereq('lintstaged', '.lintstagedrc.js');
    rereq('eslint', '.eslintrc.js');
    rereq('prettier', '.prettierrc.js');

    addNpmScript(
      'eslint',
      `eslint --ext '.js,.jsx,.ts,.tsx' --ignore-pattern '!.*.js' --fix`,
    );
    addNpmScript('lint', `yarn run eslint .`);

    copyReactComp('Checkbox');
    copyReactComp('Input');
    copyReactComp('Spinner');

    const hasReact = files.includes('nextjs');
    const hasJest = files.includes('jest');
    const hasTypescript = files.includes('typescript');

    const airbnbConfig = hasTypescript
      ? 'airbnb-typescript'
      : hasReact
      ? 'airbnb'
      : 'airbnb-base';

    return {
      deps: [
        '@ginterdev/toolkit',
        hasReact && 'react',
        hasReact && 'react-dom',
      ].filter(Boolean),
      devDeps: [
        `eslint-config-${airbnbConfig}`,
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
      ].filter(Boolean),
    };
  },
};

(async () => {
  const features = Object.keys(map).filter((k) =>
    [
      'tailwind',
      'docker',
      'typescript',
      'jest',
      'nextjs',
      'vscode',
      'gh-actions',
    ].includes(k),
  );

  let answers = {
    files: features,
    nodeVersion: '12',
    packager: 'yarn',
    ie11: true,
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

  const steps = ['always', ...answers.files];

  const npmDeps = [];
  const npmDevDeps = [];

  steps.forEach(async (step) => {
    const exec = hasOwn(map, step) ? map[step] : null;

    if (exec === null) {
      return;
    }

    const { deps, devDeps } = exec({
      ...answers,
      fullNodeVersion: answers.nodeVersion === '12' ? '12.20.1' : '14.15.4',
    });

    npmDeps.push(...deps);
    npmDevDeps.push(...devDeps);
  });

  // this is crucial, because if we don't have package.json here
  // yarn/npm will install deps in parent dir (this is weird)
  if (!existsSync('package.json')) {
    await execa('npm', ['init', '-y'], { stdio: 'inherit' });
  }

  function isNotTaggedVer(v) {
    return /^\d+\.\d+\.\d+$/.test(v);
  }

  function getVersions(dep, removeTaggedVersions = true) {
    const out = execa.sync('npm', ['view', dep, 'versions', '--json'], {
      stderr: 'inherit',
    }).stdout;

    const ver = JSON.parse(out);

    return removeTaggedVersions ? ver.filter(isNotTaggedVer) : ver;
  }

  function getLatest(d) {
    return execa.sync('npm', ['view', d, 'version'], { stderr: 'inherit' })
      .stdout;
  }

  const constraints = {
    // no support for v5 for now (version 5 is free
    // only for open source projects)
    husky: (v) => maxSatisfying(v, '<5'),
    // tailwind v2 has dropped support for IE11
    tailwindcss: answers.ie11 ? (v) => maxSatisfying(v, '<2') : undefined,
  };

  function versionifyDeps(deps) {
    return deps.reduce((acc, d) => {
      const constraint = constraints[d];
      let ver = 'latest';

      if (d === pkg.name) {
        ver = cliArgs.ci
          ? // this is how `npm pack` will name the tarball
            `file:./ginterdev-toolkit-${pkg.version}.tgz`
          : pkg.version;
      } else if (constraint) {
        ver = constraint(getVersions(d, true));
      } else {
        ver = getLatest(d);
      }

      acc[d] = ver;
      return acc;
    }, {});
  }

  let pkgJson = readFileSync('package.json', 'utf-8');
  pkgJson = JSON.parse(pkgJson);

  if (npmDeps.length > 0) {
    pkgJson.dependencies = {
      ...versionifyDeps(npmDeps),
      ...pkgJson.dependencies,
    };
  }

  pkgJson.devDependencies = {
    ...versionifyDeps(npmDevDeps),
    ...pkgJson.devDependencies,
  };

  pkgJson.license = pkgJson.license || 'UNLICENSED';

  writeFileSync('package.json', JSON.stringify(pkgJson, null, 2), 'utf-8');

  await createGitignore();
})();
