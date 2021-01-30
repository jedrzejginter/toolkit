module.exports = {
  '*.{json,md}': 'prettier --write',
  '*.{ts,tsx,js,jsx}': `eslint --ext '.js,.jsx,.ts,.tsx' --fix`,
};
