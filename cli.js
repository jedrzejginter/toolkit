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

const cliArgs = minimist(process.argv.slice(2));

const pkg = require('./package.json');

function here(...p) {
  return join(__dirname, ...p);
}

const exportRequire = readFileSync(here('export-require'), 'utf-8');
const exportDefaultEsm = readFileSync(here('export-default-esm'), 'utf-8');

function rereq(fn, dest) {
  const c = exportRequire.replace(/__IMPORT_SOURCE__/g, `${pkg.name}/${fn}`);
  writeFileSync(dest, c, 'utf-8');
}

function reexpesm(spec, fn, dest) {
  const c = exportDefaultEsm.replace(/__SPECIFIER__/g, spec);
  mkdirSync(dirname(dest), { recursive: true });
  writeFileSync(dest, c, 'utf-8');
}

function copy(fn, dest, modifiers = []) {
  mkdirSync(dirname(dest || fn), { recursive: true });
  copyFileSync(here(fn), dest || fn);
  modifiers.forEach((modify) => modify(dest || fn));
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

    return ['tailwindcss'];
  },
  docker: ({ nodeVersion }) => {
    copy('_dockerignore', '.dockerignore');
    copy('_Dockerfile', 'Dockerfile', [
      (fn) => addNodeVersion(fn, nodeVersion === '12' ? '12.20.1' : '14.15.4'),
    ]);
    copy('scripts/rewrite-pkg-json.js');

    return [];
  },
  jest: () => {
    addNpmScript('test', 'NODE_ENV=test jest');

    return ['jest'];
  },
  typescript: () => {
    // for very simple project we might not need typescript
    copy('_tsconfig.eslint.json', 'tsconfig.eslint.json');
    copy('_tsconfig.json', 'tsconfig.json');
    addNpmScript('typecheck', 'tsc --noEmit');

    return [
      'typescript',
      '@types/node',
      '@typescript-eslint/eslint-plugin',
      '@typescript-eslint/parser',
    ];
  },
  nextjs: ({ files }) => {
    copy('_env.example', '.env.example');
    copy('_next.config.js', 'next.config.js', [fixImports]);

    if (files.includes('typescript')) {
      copy('_env-dts', 'types/env.d.ts');
    }

    addNpmScript('build', 'NODE_ENV=production next build');
    // eslint-disable-next-line no-template-curly-in-string
    addNpmScript('dev', 'NODE_ENV=development next -p ${PORT:3001}');
    addNpmScript('start', 'NODE_ENV=production next start');

    return ['envalid', 'next'];
  },
  always: ({ nodeVersion, files }) => {
    copy('_gitattributes', '.gitattributes');
    copy('_npmrc', '.npmrc');
    copy(`nvmrc-${nodeVersion}`, '.nvmrc');

    // those are basic tools that we will have anyway, no option to opt out
    rereq('husky', '.huskyrc.js');
    rereq('lintstaged', '.lintstagedrc.js');
    rereq('eslint', '.eslintrc.js');
    rereq('prettier', '.prettierrc.js');

    copyReactComp('Checkbox');
    copyReactComp('Input');
    copyReactComp('Spinner');

    return [
      'eslint-config-prettier',
      'eslint-import-resolver-alias',
      'eslint-plugin-import',
      'eslint-plugin-prettier',
      'eslint',
      'husky',
      'lint-staged',
      'prettier',
      'prettier-plugin-package',
      'react',
      'react-dom',
      files.includes('typescript') && '@types/react',
      files.includes('typescript') && '@types/react-dom',
    ].filter(Boolean);
  },
};

(async () => {
  const choices = Object.keys(map)
    .filter((k) =>
      ['tailwind', 'docker', 'typescript', 'jest', 'nextjs'].includes(k),
    )
    .map((k) => ({ message: k, value: k, checked: true }));

  let answers = {
    files: choices,
    nodeVersion: 12,
    packager: 'yarn',
  };

  if (1 + 2 === 1) {
    answers = await inq.prompt([
      {
        type: 'list',
        name: 'nodeVersion',
        message: 'Which version of Node do you want to use?',
        choices: ['12', '14'],
        default: '14',
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
        choices,
      },
    ]);
  }

  const steps = ['always', ...answers.files];

  const npmDeps = [];

  steps.forEach((step) => {
    const exec = hasOwn(map, step) ? map[step] : null;

    if (exec === null) {
      return;
    }

    npmDeps.push(...exec(answers));
  });

  const [executable, ...cmdArgs] =
    answers.packager === 'npm'
      ? ['npm', 'add', '--save-dev', '--save-exact']
      : ['yarn', 'add', '--dev', '--exact'];

  if (cliArgs['dry-run']) {
    process.stdout.write(
      'Skipping dependencies install due to --dry-run flag\n',
    );
    return;
  }

  await execa(executable, [...cmdArgs, ...npmDeps], {
    stdio: 'inherit',
  });
})();
