module.exports = {
    roots: ['<rootDir>'],
    setupFilesAfterEnv: ['<rootDir>/test/jest.setup.ts'],
    testEnvironment: 'node',
    transform: {
      '^.+\\.(ts|tsx)$': ['@swc/jest', {
        jsc: { parser: { syntax: 'typescript' }, target: 'es2020' },
        module: { type: 'commonjs' }
      }]
    },
    transformIgnorePatterns: ['/node_modules/'],
    modulePathIgnorePatterns: ['<rootDir>/dist/', '<rootDir>/.next/', '<rootDir>/build/'],
    maxWorkers: 1, // keep memory chill
  };
