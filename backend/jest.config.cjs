/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["<rootDir>/test", "<rootDir>/tests", "<rootDir>/e2e/tests"],
  moduleFileExtensions: ["ts", "js", "json"],
  clearMocks: true,
};

