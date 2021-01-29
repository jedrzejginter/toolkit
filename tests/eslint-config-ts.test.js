const { ESLint } = require('eslint');
const getRules = require('./test-utils');

jest.mock('../eslint-env', () => {
  return {
    hasTypescript: true,
    hasReact: false,
    hasJest: false,
    hasNext: false,
    hasTestingLibrary: false,
  };
});

test('config for ts file', async () => {
  expect(await getRules('index.ts')).toMatchSnapshot();
});
