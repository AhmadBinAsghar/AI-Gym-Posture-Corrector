/* eslint-env jest */
// AsyncStorage is a native module; tests get an in-memory stand-in. The Map lives on
// `global` so a module registry created with jest.isolateModules (an "app restart" in
// tests) still sees what the "previous run" saved.
jest.mock('@react-native-async-storage/async-storage', () => {
  const store = (global.__ASYNC_STORAGE__ = global.__ASYNC_STORAGE__ || new Map());
  const api = {
    getItem: async key => (store.has(key) ? store.get(key) : null),
    setItem: async (key, value) => {
      store.set(key, String(value));
    },
    removeItem: async key => {
      store.delete(key);
    },
    clear: async () => store.clear(),
    getAllKeys: async () => [...store.keys()],
    multiGet: async keys => keys.map(k => [k, store.has(k) ? store.get(k) : null]),
    multiSet: async pairs => pairs.forEach(([k, v]) => store.set(k, String(v))),
    multiRemove: async keys => keys.forEach(k => store.delete(k)),
  };
  return { __esModule: true, default: api, ...api };
});
