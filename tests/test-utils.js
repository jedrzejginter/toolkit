const { ESLint } = require('eslint');

const eslint = new ESLint();

module.exports = async (file) => {
  const conf = await eslint.calculateConfigForFile(file);

  const e = Object.entries(conf.rules);

  const c = (cod) => {
    return { 0: 'off', 1: 'warn', 2: 'error' }[cod] || cod;
  };

  const f = e.map(([k, v]) => `${k}: ${c(v[0])}`).sort();

  return f;
};
