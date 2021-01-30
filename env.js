const { existsSync } = require('fs');
const readPkgUp = require('read-pkg-up');

const { packageJson } = readPkgUp.sync({ normalize: true });

function hasAnyDep(...deps) {
  return deps.some((dep) =>
    Object.prototype.hasOwnProperty.call(
      {
        ...packageJson.dependencies,
        ...packageJson.devDependencies,
      },
      dep,
    ),
  );
}

module.exports = {
  hasTypescript: hasAnyDep('typescript') || existsSync('tsconfig.json'),
  hasReact: hasAnyDep('react'),
  hasJest: hasAnyDep('jest'),
  hasNext: hasAnyDep('next') || existsSync('next.config.js'),
  hasTestingLibrary: hasAnyDep(
    '@testing-library/jest-dom',
    '@testing-library/react',
  ),
};
