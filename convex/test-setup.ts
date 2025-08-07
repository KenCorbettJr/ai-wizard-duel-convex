import { vi } from "vitest";

// Global test setup for Convex tests
// This file suppresses console output during tests for cleaner test results

// Store original console methods
const originalConsole = {
  log: console.log,
  error: console.error,
  warn: console.warn,
  info: console.info,
};

// Mock console methods globally for all tests
console.log = vi.fn();
console.error = vi.fn();
console.warn = vi.fn();
console.info = vi.fn();

// Restore console methods after all tests (if needed for debugging)
// Uncomment the lines below if you need to see console output during development
// afterAll(() => {
//   console.log = originalConsole.log;
//   console.error = originalConsole.error;
//   console.warn = originalConsole.warn;
//   console.info = originalConsole.info;
// });
