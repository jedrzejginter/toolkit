// Check, if all npm dependencies has been installed with --exact flag.
const readPkgUp = require('read-pkg-up');

const { packageJson: pkg } = readPkgUp.sync({ normalize: true });

const allDependencies = {
  ...pkg.dependencies,
  ...pkg.devDependencies,
  ...pkg.peerDependencies,
  ...pkg.optionalDependencies,
};

const unlockedDependencies = [];

Object.entries(allDependencies).forEach(([dependency, version]) => {
  if (/^[<>^~]/.test(version) || version === '*') {
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
