const { LINT_STAGED_PACKAGE_JSON } = require('./const');

module.exports = {
  [LINT_STAGED_PACKAGE_JSON]: () =>
    `node ${require.resolve('./scripts/exact-deps.js')}`,
};
