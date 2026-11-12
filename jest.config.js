module.exports = {
  preset: '@react-native/jest-preset',
  setupFiles: ['<rootDir>/jest.setup.js'],
  // Redux Toolkit and its helpers ship untranspiled ES modules.
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|@reduxjs/toolkit|react-redux|use-sync-external-store|immer|redux|redux-thunk|reselect)/)',
  ],
  // The live Supabase test creates real accounts, so it only runs on request:
  //   RUN_LIVE=1 npx jest __tests__/SupabaseLive.test.js
  testPathIgnorePatterns: ['/node_modules/', ...(process.env.RUN_LIVE ? [] : ['SupabaseLive'])],
};
