const { LINT_STAGED_PRETTIER, LINT_STAGED_ESLINT } = require('./const');

module.exports = {
  [LINT_STAGED_PRETTIER]: 'prettier --write',
  [LINT_STAGED_ESLINT]:
    "eslint --ext '.js,.jsx,.ts,.tsx' --ignore-pattern '!.*.js' --fix",
};
