const { ESLint } = require('eslint');
const getRules = require('./test-utils');

jest.mock('../eslint-env', () => {
  return {
    hasTypescript: true,
    hasReact: true,
    hasJest: false,
    hasNext: false,
    hasTestingLibrary: false,
  };
});

test('config for tsx file', async () => {
  expect(await getRules('index.tsx')).toMatchSnapshot();
});
