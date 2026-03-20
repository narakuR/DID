const fs = require('node:fs');
const path = require('node:path');
const {
  AndroidConfig,
  ConfigPlugin,
  createRunOncePlugin,
  withAppBuildGradle,
  withDangerousMod,
  withProjectBuildGradle,
} = require('expo/config-plugins');

const GOOGLE_SERVICES_CLASSPATH = "classpath('com.google.gms:google-services:4.4.2')";
const GOOGLE_SERVICES_PLUGIN = 'apply plugin: "com.google.gms.google-services"';

function ensureGoogleServicesClasspath(contents) {
  if (contents.includes(GOOGLE_SERVICES_CLASSPATH)) {
    return contents;
  }

  const dependenciesBlockRegex = /buildscript\s*\{[\s\S]*?dependencies\s*\{/;
  if (dependenciesBlockRegex.test(contents)) {
    return contents.replace(
      dependenciesBlockRegex,
      (match) => `${match}\n    ${GOOGLE_SERVICES_CLASSPATH}`
    );
  }

  return contents;
}

function ensureGoogleServicesPlugin(contents) {
  if (contents.includes(GOOGLE_SERVICES_PLUGIN)) {
    return contents;
  }

  const reactPlugin = 'apply plugin: "com.facebook.react"';
  if (contents.includes(reactPlugin)) {
    return contents.replace(
      reactPlugin,
      `${reactPlugin}\n${GOOGLE_SERVICES_PLUGIN}`
    );
  }

  return `${GOOGLE_SERVICES_PLUGIN}\n${contents}`;
}

const withAndroidFirebaseNativeSetup = (config) => {
  config = withProjectBuildGradle(config, (mod) => {
    mod.modResults.contents = ensureGoogleServicesClasspath(mod.modResults.contents);
    return mod;
  });

  config = withAppBuildGradle(config, (mod) => {
    mod.modResults.contents = ensureGoogleServicesPlugin(mod.modResults.contents);
    return mod;
  });

  config = withDangerousMod(config, [
    'android',
    async (mod) => {
      const googleServicesFile =
        mod.config.android?.googleServicesFile ||
        mod.config.android?.googleServicesFile?.toString();

      if (!googleServicesFile) {
        return mod;
      }

      const projectRoot = mod.modRequest.projectRoot;
      const sourcePath = path.resolve(projectRoot, googleServicesFile);
      const targetPath = path.join(
        mod.modRequest.platformProjectRoot,
        'app',
        AndroidConfig.Paths.GoogleServices.getFilePath()
      );

      if (!fs.existsSync(sourcePath)) {
        return mod;
      }

      fs.mkdirSync(path.dirname(targetPath), { recursive: true });
      fs.copyFileSync(sourcePath, targetPath);

      return mod;
    },
  ]);

  return config;
};

module.exports = createRunOncePlugin(
  withAndroidFirebaseNativeSetup,
  'with-android-firebase-native-setup',
  '1.0.0'
);
