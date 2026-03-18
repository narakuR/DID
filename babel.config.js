module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      [
        'module-resolver',
        {
          root: ['./src'],
          extensions: ['.ios.js', '.android.js', '.js', '.ts', '.tsx', '.json'],
          alias: {
            '@': './src',
            '@/components': './src/components',
            '@/screens': './src/screens',
            '@/store': './src/store',
            '@/services': './src/services',
            '@/hooks': './src/hooks',
            '@/i18n': './src/i18n',
            '@/constants': './src/constants',
            '@/types': './src/types',
            '@/navigation': './src/navigation',
            '@/assets': './src/assets',
            '@/utils': './src/utils',
          },
        },
      ],
      'react-native-reanimated/plugin',
    ],
  };
};
