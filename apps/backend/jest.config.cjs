/** P19.2+P19.3: run platform tests only. Empty pre-existing *.test.js files are excluded, not "fixed". */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/*.p19.test.ts', '**/*.sac3.test.ts'],
  testPathIgnorePatterns: ['/node_modules/', '/dist/'],
};
