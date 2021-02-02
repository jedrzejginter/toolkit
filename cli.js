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

function copy(fn, dest, modifiers = []) {
  mkdirSync(dirname(dest || fn), { recursive: true });
  copyFileSync(here(fn), dest || fn);
  modifiers.forEach((modify) => modify(dest || fn));
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

function modifyFileContents(fn, pred) {
  let contents = readFileSync(fn, 'utf-8');
  contents = pred(contents);
  writeFileSync(fn, contents, 'utf-8');
}

function fixImports(fn) {
  modifyFileContents(fn, (c) =>
    c.replace(/(require\(['"]).(\/)/g, `$1${pkg.name}$2`),
  );
}

function addNodeVersion(fn, ver) {
  modifyFileContents(fn, (c) => c.replace(/__NODE_VERSION__/g, ver));
}

const map = {
  tailwind: () => {
    copy('_tailwind.css', 'src/assets/css/tailwind.css');
    copy('_tailwind.config.js', 'tailwind.config.js', [fixImports]);
    addNpmScript(
      'build:tailwind',
      `tailwind build src/assets/css/tailwind.css -o public/css/tailwind.out.css`,
    );

    return { deps: ['tailwindcss'], devDeps: [] };
  },
  docker: ({ nodeVersion }) => {
    copy('_dockerignore', '.dockerignore');
    copy('_Dockerfile', 'Dockerfile', [
      (fn) => addNodeVersion(fn, nodeVersion === '12' ? '12.20.1' : '14.15.4'),
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
  'gh-actions': () => {
    copyDir('_github', '.github');
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

    if (files.includes('typescript')) {
      copy('_env-dts', 'types/env.d.ts');
      copy('_babel-plugins-dts', 'types/babel-plugins.d.ts');
    }

    addNpmScript('build', 'NODE_ENV=production next build');
    // eslint-disable-next-line no-template-curly-in-string
    addNpmScript('dev', 'NODE_ENV=development next -p ${PORT:3001}');
    addNpmScript('start', 'NODE_ENV=production next start');

    return {
      deps: ['envalid', 'next'],
      devDeps: ['babel-plugin-inline-react-svg'],
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

    copyReactComp('Checkbox');
    copyReactComp('Input');
    copyReactComp('Spinner');

    return {
      deps: ['react', 'react-dom'],
      devDeps: [
        '@ginterdev/toolkit',
        'eslint-config-prettier',
        'eslint-import-resolver-alias',
        'eslint-plugin-import',
        'eslint-plugin-prettier',
        'eslint',
        'husky',
        'lint-staged',
        'prettier',
        'prettier-plugin-package',
        files.includes('typescript') && '@types/react',
        files.includes('typescript') && '@types/react-dom',
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

  steps.forEach((step) => {
    const exec = hasOwn(map, step) ? map[step] : null;

    if (exec === null) {
      return;
    }

    const { deps, devDeps } = exec(answers);

    npmDeps.push(...deps);
    npmDevDeps.push(...devDeps);
  });

  // this is crucial, because if we don't have package.json here
  // yarn/npm will install deps in parent dir (this is weird)
  if (!existsSync('package.json')) {
    await execa('npm', ['init', '-y'], { stdio: 'inherit' });
  }

  function getVersions(dep) {
    const out = execa.sync('npm', ['view', dep, 'versions', '--json'], {
      stderr: 'inherit',
    }).stdout;

    return JSON.parse(out);
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
      const versions = getVersions(d);
      const constraint = constraints[d];
      let ver = versions[versions.length - 1];

      if (cliArgs.ci && /ginterdev\/toolkit/.test(d)) {
        // this is how `npm pack` will name the tarball
        ver = `file:./ginterdev-toolkit-${pkg.version}.tgz`;
      }

      if (typeof constraint === 'function') {
        ver = constraint(versions);
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

  writeFileSync('package.json', JSON.stringify(pkgJson, null, 2), 'utf-8');
})();
