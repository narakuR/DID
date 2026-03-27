/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/*.test.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  clearMocks: true,
  setupFiles: ['<rootDir>/jest.setup.ts'],
  watchman: false,
  testPathIgnorePatterns: ['/node_modules/'],
};
