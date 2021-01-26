const { ESLint } = require('eslint');

const eslint = new ESLint();

(async() => {
  const conf = await eslint.calculateConfigForFile('index.tsx');

  console.log('conf', JSON.stringify(conf, null, 2));

})();
