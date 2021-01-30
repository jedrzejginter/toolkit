#!/usr/bin/env node
const { execSync } = require('child_process');
const {
  mkdirSync,
  readFileSync,
  writeFileSync,
  copyFileSync,
  existsSync,
} = require('fs');
const { join, dirname } = require('path');

const pkg = require('./package.json');

const args = process.argv.slice(2);
const [cmd, ...params] = args;

function here(...p) {
  return join(__dirname, ...p);
}

const exportRequired = readFileSync(here('export-require'), 'utf-8');

function q(s) {
  return `"${s}"`;
}

if (cmd === 'eject') {
  if (params.length === 0) {
    throw new Error('You have to specify list of files to eject');
  }

  mkdirSync('tmp', { recursive: true });
  execSync(`cp ${params.map(q).join(' ')} tmp`, { stdio: 'inherit' });
  return;
}

function rereq(fn, dest) {
  const c = exportRequired.replace('IMPORT_SOURCE', `${pkg.name}/${fn}`);
  writeFileSync(dest, c, 'utf-8');
}

function copy(fn, dest) {
  mkdirSync(dirname(dest || fn), { recursive: true });
  copyFileSync(here(fn), dest || fn);
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

const map = {
  husky: () => rereq('husky', '.huskyrc.js'),
  eslint: () => rereq('eslint', '.eslintrc.js'),
  lintstaged: () => rereq('lintstaged', '.lintstagedrc.js'),
  prettier: () => rereq('prettier', '.prettierrc.js'),
  tailwind: () => {
    copy('tailwindcss.css', 'src/assets/css/tailwind.css');
    copy('tailwindcss.js', 'tailwind.config.js');
    addNpmScript(
      'build:tailwind',
      `tailwind build src/assets/css/tailwind.css -o public/css/tailwind.out.css`,
    );
  },
  cp: () => {
    copy('dockerignore', '.dockerignore');
    copy('.gitattributes');
    copy('.npmrc');
    copy('nvmrc', '.nvmrc');
    copy('scripts/rewrite-pkg-json.js');
    addNpmScript('test', 'NODE_ENV=test jest');
    addNpmScript('typecheck', 'tsc --noEmit');
  },
};

if (cmd === 'setup') {
  Object.entries(map).forEach(([, fn]) => {
    fn();
  });
  return;
}

throw new Error('Unknown command');
