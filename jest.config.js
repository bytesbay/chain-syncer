let testPathIgnorePatterns = [
  '/node_modules/', 
  '/dist/',
  '__tests__/chain-syncer.test.js',
  '__tests__/mono-mode.test.js',
];

if(process.env['INTERGRATION_TESTS']) {
  testPathIgnorePatterns = testPathIgnorePatterns
    .filter(n => n !== '__tests__/chain-syncer.test.js')
    .filter(n => n !== '__tests__/mono-mode.test.js');
    
  testPathIgnorePatterns.push('__tests__/in-memory-adapter.test.js');
}

module.exports = {
  testPathIgnorePatterns,
  preset: '@vue/cli-plugin-unit-jest',
  testEnvironment: "node",
  maxWorkers: 1,
}
