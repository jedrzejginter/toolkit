const envalid = require('envalid');

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

// This requires `.env` file to always exists when running Next.js
const env = envalid.cleanEnv(process.env, {
  API_URL: envalid.url({}),
});

module.exports = {
  // Populate process.env with our environment variables.
  env: filterEnv(env),

  // We don't benefit from exposing that our app is running Next.js
  // so why not to hide this information.
  poweredByHeader: false,

  // React's Strict Mode is a development mode only feature for highlighting
  // potential problems in an application. It helps to identify unsafe
  // lifecycles, legacy API usage, and a number of other features.
  reactStrictMode: true,

  // Custom webpack config.
  webpack: (config) => config,
};
