module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests', '<rootDir>/src'],
  testMatch: ['**/tests/unit/**/*.test.ts'],
  collectCoverageFrom: ['src/**/*.ts', '!src/frontend/**'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'json'],
};
