const { writeFileSync } = require('fs');

const packageJson = require('../package.json');

function filterDependencies(oldDependencies, shouldBeRemoved) {
  const newDependencies = {};

  for (const dependencyName in oldDependencies) {
    if (!shouldBeRemoved(dependencyName)) {
      newDependencies[dependencyName] = oldDependencies[dependencyName];
    }
  }

  return newDependencies;
}

// We cannot just remove devDependencies,
// because we still need "@types/.." for transpilation.
function checkIfShouldBeRemoved(dependencyName) {
  return (
    /^(eslint|prettier|@typescript-eslint\/|@testing-library\/)/.test(
      dependencyName,
    ) ||
    ['@next/bundle-analyzer', 'husky', 'jest', 'lint-staged', 'msw'].includes(
      dependencyName,
    )
  );
}

packageJson.dependencies = filterDependencies(
  packageJson.dependencies,
  checkIfShouldBeRemoved,
);
packageJson.devDependencies = filterDependencies(
  packageJson.devDependencies,
  checkIfShouldBeRemoved,
);

// This will be saved in directory the script is run from.
writeFileSync('package.json', JSON.stringify(packageJson, null, 2), 'utf-8');
