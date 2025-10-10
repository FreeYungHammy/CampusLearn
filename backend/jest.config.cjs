/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ["<rootDir>/tests"],
  verbose: true,
  moduleNameMapper: {
    '^@xenova/transformers$': '<rootDir>/tests/__mocks__/fileMock.js',
  },
};
