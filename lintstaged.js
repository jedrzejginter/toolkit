const lintStagedBase = require('./lintstaged-base');

module.exports = {
  ...lintStagedBase,
  'package.json': () => `node ${require.resolve('./scripts/exact-deps.js')}`,
};
