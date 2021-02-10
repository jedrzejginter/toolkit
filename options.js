const { existsSync } = require('fs');
const readPkgUp = require('read-pkg-up');

const readResult = readPkgUp.sync({ normalize: true });
const packageJson = readResult ? readResult.packageJson : {};

const allDeps = {
  ...packageJson.dependencies,
  ...packageJson.devDependencies,
};

function hasAnyDep(...deps) {
  return deps.some((dep) => Object.prototype.hasOwnProperty.call(allDeps, dep));
}

module.exports = {
  hasTypescript: hasAnyDep('typescript') || existsSync('tsconfig.json'),
  hasReact: hasAnyDep('react'),
  hasJest: hasAnyDep('jest'),
  hasNext: hasAnyDep('next') || existsSync('next.config.js'),
  hasTailwind: hasAnyDep('tailwindcss') || existsSync('tailwind.config.js'),
  hasTestingLibrary: hasAnyDep(
    '@testing-library/jest-dom',
    '@testing-library/react',
  ),
};
