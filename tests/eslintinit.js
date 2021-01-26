const { ESLint } = require('eslint');

const eslint = new ESLint();

const conf = eslint.calculateConfigForFile('index.js');

module.exports.getErrors = async function getErrors(code, filePath = 'index.js') {
  const results = await eslint.lintText(code, { filePath });

  const messages = results.reduce((acc, result) => {
    if (!Array.isArray(result.messages)) {
      return acc;
    }

    const newAcc = [...acc];
    newAcc.push(...result.messages);

    return newAcc;
  }, []);

  return messages.map(({ message, column = 0, line = 0 }) => `${line}:${column} ${message}`);
};
