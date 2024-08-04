export default () => ({
  debug: true,
  env: {
    params: {
      env: 'DEBUG=xstate-audition*',
    },
    type: 'node',
  },
  esmHooks: ['tsx/esm'],
  files: ['./src/**/*.ts', 'package.json'],
  runMode: 'onsave',
  testFramework: 'node',
  tests: ['./test/actor-runner.spec.ts'],
});
