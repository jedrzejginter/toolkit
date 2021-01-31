// Check, if all npm dependencies has been installed with --exact flag.
const packageJson = require('../package.json');

const allDependencies = {
  ...packageJson.dependencies,
  ...packageJson.devDependencies,
  ...packageJson.peerDependencies,
  ...packageJson.optionalDependencies,
};

const unlockedDependencies = [];

Object.entries(allDependencies).forEach(([dependency, version]) => {
  if (!/^[\da-z]/i.test(version)) {
    unlockedDependencies.push([dependency, version]);
  }
});

if (unlockedDependencies.length > 0) {
  process.stderr.write(
    `All dependencies must be installed with --exact flag.\n`,
  );
  process.stderr.write(`Found some dependencies with unlocked version:\n`);

  for (const [dependency, version] of unlockedDependencies) {
    process.stderr.write(`  > ${dependency}: ${version}\n`);
  }

  process.exit(1);
}
