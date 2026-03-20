const { createRunOncePlugin, withEntitlementsPlist, withInfoPlist } = require('expo/config-plugins');

function ensureArrayValue(values, nextValue) {
  const current = Array.isArray(values) ? [...values] : [];
  if (!current.includes(nextValue)) {
    current.push(nextValue);
  }
  return current;
}

const withIosPushConfiguration = (config) => {
  config = withInfoPlist(config, (mod) => {
    mod.modResults.UIBackgroundModes = ensureArrayValue(
      mod.modResults.UIBackgroundModes,
      'remote-notification'
    );

    return mod;
  });

  config = withEntitlementsPlist(config, (mod) => {
    if (!mod.modResults['aps-environment']) {
      mod.modResults['aps-environment'] = 'development';
    }

    return mod;
  });

  return config;
};

module.exports = createRunOncePlugin(
  withIosPushConfiguration,
  'with-ios-push-configuration',
  '1.0.0'
);
