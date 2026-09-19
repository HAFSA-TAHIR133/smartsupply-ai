/** @type {import('jest').Config} */
const config = {
  // Use node test environment
  testEnvironment: "node",

  // Support ES Modules
  transform: {},

  // Automatically clear mock calls and instances between every test
  clearMocks: true,

  // Ignore New Relic agent during Jest unit runs to prevent port/agent conflicts
  moduleNameMapper: {
    "^newrelic$": "<rootDir>/__mocks__/newrelic.js"
  },

  // File patterns Jest uses to detect test files
  testMatch: [
    "**/tests/**/*.test.js",
    "**/__tests__/**/*.js"
  ],

  // Verbose test output format
  verbose: true
};

export default config;