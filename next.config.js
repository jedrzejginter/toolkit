const envalid = require('envalid');

const { filterEnv } = require('@ginterdev/toolkit/utils');

const env = envalid.cleanEnv(process.env, {
  API_URL: envalid.url({}),
});

module.exports = {
  env: filterEnv(env),
  poweredByHeader: false,
  reactStrictMode: true,
};
