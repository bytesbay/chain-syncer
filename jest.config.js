let testPathIgnorePatterns = [
  '/node_modules/', 
  '/dist/',
  '__tests__/chain-syncer.test.ts',
  '__tests__/mono-mode.test.ts',
];

if(process.env['INTERGRATION_TESTS']) {
  testPathIgnorePatterns = testPathIgnorePatterns
    .filter(n => n !== '__tests__/chain-syncer.test.ts')
    .filter(n => n !== '__tests__/mono-mode.test.ts');
    
  testPathIgnorePatterns.push('__tests__/in-memory-adapter.test.ts');
}

module.exports = {
  testPathIgnorePatterns,
  preset: '@vue/cli-plugin-unit-jest/presets/typescript',
  testEnvironment: "node",
  maxWorkers: 1,
}
