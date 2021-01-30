module.exports = {
  // Written as function, because this is how we can skip passing filenames
  // to the command.
  'package.json': () => `node ${require.resolve('./scripts/exact-deps.js')}`,

  // Format JSON and markdown files.
  // This includes 'prettier-plugin-package' for formatting package.json
  '*.{json,md}': 'prettier --write',

  // It's important to omit path here so only staged files are passed
  // to eslint.
  '*.{ts,tsx,js,jsx}': `eslint --ext '.js,.jsx,.ts,.tsx' --fix`,
};
