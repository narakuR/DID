/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/*.test.ts'],
  transform: {
    '^.+\\.(ts|tsx|js|jsx|mjs)$': [
      'ts-jest',
      {
        tsconfig: {
          allowJs: true,
        },
      },
    ],
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  clearMocks: true,
  setupFiles: ['<rootDir>/jest.setup.ts'],
  watchman: false,
  testPathIgnorePatterns: ['/node_modules/'],
  transformIgnorePatterns: [
    'node_modules/(?!(expo-secure-store|expo-crypto|@noble/curves|@noble/hashes|@owf/mdoc|cbor-x|did-resolver|@digitalcredentials/did-method-key|@digitalcredentials/did-io|@digitalcredentials/x25519-key-agreement-key-2020|@digitalbazaar/ed25519-verification-key-2020|base58-universal|base64url-universal|crypto-ld)/)',
  ],
};
