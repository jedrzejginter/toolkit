#!/usr/bin/env node
/* eslint-disable no-console */
const { ESLint } = require('eslint');

const eslint = new ESLint();

const [filename, rule] = process.argv.slice(2);

(async () => {
  const conf = await eslint.calculateConfigForFile(filename);

  if (rule) {
    console.log(conf.rules[rule]);
    return;
  }

  console.log(JSON.stringify(conf, null, 2));
})();
