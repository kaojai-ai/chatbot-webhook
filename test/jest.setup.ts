// jest.setup.ts
import { jest } from '@jest/globals';

beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});
