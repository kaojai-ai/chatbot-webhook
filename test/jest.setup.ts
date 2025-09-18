// jest.setup.ts
import { jest } from '@jest/globals';

process.env.NODE_ENV = 'test';

beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});
