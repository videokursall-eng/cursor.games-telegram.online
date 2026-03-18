module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: 'src',
  testRegex: '\\.spec\\.ts$',
  testPathIgnorePatterns: ['/node_modules/', 'backend\\.e2e\\.room-bot-flow'],
  transform: { '^.+\\.tsx?$': 'ts-jest' },
  transformIgnorePatterns: ['/node_modules/', '\\.js$'],
  collectCoverageFrom: ['**/*.ts'],
  coverageDirectory: '../coverage',
  testEnvironment: 'node',
};
