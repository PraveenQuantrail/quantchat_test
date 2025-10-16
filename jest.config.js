module.exports = {
  testEnvironment: "node",
  setupFilesAfterEnv: ["./__tests__/setup.js"],
  coveragePathIgnorePatterns: [
    "/node_modules/",
    "/__tests__/"
  ],
  roots: ["<rootDir>"],
  collectCoverageFrom: [
    "**/*.js",
    "!**/node_modules/**",
    "!**/coverage/**",
    "!**/server.js",
    "!**/jest.config.js",
    "!**/__tests__/**"
  ],
  testPathIgnorePatterns: [
    "/node_modules/",
    "/config/",
    "/__tests__/setup.js"
  ],
  testMatch: [
    "**/__tests__/**/*.test.js"
  ]
};