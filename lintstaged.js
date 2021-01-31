const { LINT_STAGED_PACKAGE_JSON } = require('./const');
const lintStagedBase = require('./lintstaged-base');

module.exports = {
  ...lintStagedBase,
  [LINT_STAGED_PACKAGE_JSON]: () =>
    `node ${require.resolve('./scripts/exact-deps.js')}`,
};
