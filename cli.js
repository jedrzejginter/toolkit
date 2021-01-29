#!/usr/bin/env node
const { execSync } = require('child_process');
const { mkdirSync } = require('fs');

const args = process.argv.slice(2);
const [cmd, ...params] = args;

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

throw new Error('Unknown command');
