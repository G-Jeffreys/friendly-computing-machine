const nextJest = require("next/jest.js")

const createJestConfig = nextJest({ dir: "./" })

const customJestConfig = {
  setupFilesAfterEnv: ["<rootDir>/test/setup-tests.ts"],
  testEnvironment: "jest-environment-jsdom",
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/$1"
  }
}

module.exports = createJestConfig(customJestConfig)
