// Filter env variables for Next config.
// https://github.com/zeit/next.js/blob/master/errors/env-key-not-allowed.md
function filterEnv(allEnv) {
  const cleanEnv = {};

  for (const envName in allEnv) {
    if (!/^(__|NODE_)/.test(envName)) {
      cleanEnv[envName] = allEnv[envName];
    }
  }

  return cleanEnv;
}

function createIncrement(initialValue = 1) {
  let value = initialValue;

  return function increment() {
    value += 1;
    return value;
  };
}

const zIndex = createIncrement(0);

module.exports.zIndex = zIndex;
module.exports.filterEnv = filterEnv;
