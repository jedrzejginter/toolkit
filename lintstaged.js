module.exports = {
  'package.json': () => `node ${require.resolve('./scripts/exact-deps.js')}`,
  '*.{json,md}': 'prettier --write',
  '*.{ts,tsx,js,jsx}': `eslint --ext '.js,.jsx,.ts,.tsx' --fix`,
};
