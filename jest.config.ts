import nextJest from "next/jest.js"

const createJestConfig = nextJest({
  dir: "./"
})

const customConfig = {
  testEnvironment: "jest-environment-jsdom",
  setupFilesAfterEnv: ["<rootDir>/test/setup-tests.ts"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/$1",
    "^uuid$": "<rootDir>/node_modules/uuid"
  }
}

export default createJestConfig(customConfig)
