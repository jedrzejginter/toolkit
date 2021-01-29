const { ESLint } = require('eslint');

const eslint = new ESLint();

(async () => {
  const conf = await eslint.calculateConfigForFile('index.ts');

  // console.log('conf', JSON.stringify(conf.rules, null, 2));

  const e = Object.entries(conf.rules);

  const c = (cod) => {
    return { 0: 'off', 1: 'warn', 2: 'error' }[cod] || cod;
  };

  const f = e.map(([k, v]) => `${k}: ${c(v[0])}`).sort();

  console.log(f);
})();
