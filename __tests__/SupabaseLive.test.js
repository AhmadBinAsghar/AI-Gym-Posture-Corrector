/**
 * End-to-end check of the app's own auth + sync code against the REAL Supabase
 * project in .env. jest.config.js excludes it unless RUN_LIVE is set, so normal runs stay offline:
 *
 *   RUN_LIVE=1 npx jest __tests__/SupabaseLive.test.js
 *
 * Each run creates two throwaway accounts (needs "Confirm email" OFF). The anon
 * key cannot delete them: remove them in Supabase -> Authentication -> Users
 * (their workout rows cascade away).
 */
import { configureStore } from '@reduxjs/toolkit';
import auth, { registerWithEmail, loginWithEmail, logout } from '../src/redux/slices/authSlice';
import history, {
  addWorkoutLog,
  fetchCloudHistory,
  syncPendingQueue,
} from '../src/redux/slices/historySlice';
import { isSupabaseConfigured, SupabaseService } from '../src/api/supabase';
import { isCloudUser } from '../src/utils/user';

// In-memory AsyncStorage stand-in.
let mockMem;
jest.mock('../src/utils/storage', () => ({
  LocalStorage: {
    getSession: async () => mockMem.session,
    saveSession: async (user, token) => {
      mockMem.session = { user, token };
    },
    clearSession: async () => {
      mockMem.session = null;
    },
    getHistory: async () => mockMem.history,
    saveHistory: async v => {
      mockMem.history = v;
    },
    getSyncQueue: async () => mockMem.queue,
    saveSyncQueue: async v => {
      mockMem.queue = v;
    },
    addToSyncQueue: async log => {
      mockMem.queue = [...mockMem.queue, log];
    },
  },
}));

const makeStore = () => configureStore({ reducer: { auth, history } });
const stamp = Date.now();
const password = 'Live-test-' + stamp;
const emailA = `gpc-live-a-${stamp}@gmail.com`;
const emailB = `gpc-live-b-${stamp}@gmail.com`;
const workout = { exerciseName: 'Deep Squats', reps: 8, duration: 61, accuracy: 92, calories: 9 };
const settle = () => new Promise(r => setTimeout(r, 1500));

describe('live Supabase through the app code', () => {
  jest.setTimeout(60000);
  let store;
  let userA;

  beforeEach(() => {
    mockMem = { session: null, history: [], queue: [] };
    store = makeStore();
  });

  test('.env is loaded into the app', () => {
    expect(isSupabaseConfigured).toBe(true);
  });

  test('register -> workout saved locally, synced to the cloud, visible after re-login', async () => {
    const reg = await store.dispatch(registerWithEmail({ email: emailA, password, fullName: 'Live Tester A' }));
    expect(reg.meta.requestStatus).toBe('fulfilled');
    userA = store.getState().auth.user;
    expect(isCloudUser(userA)).toBe(true); // a real uuid, not the offline sandbox
    expect(userA.fullName).toBe('Live Tester A');

    await store.dispatch(addWorkoutLog({ userId: userA.id, logData: workout }));
    await settle(); // addWorkoutLog fires the sync in the background
    expect(mockMem.queue).toHaveLength(0);
    expect(store.getState().history.logs[0].isSynced).toBe(true);

    // Fresh device: no local data at all, only the cloud copy.
    await store.dispatch(logout());
    mockMem = { session: null, history: [], queue: [] };
    store = makeStore();
    const login = await store.dispatch(loginWithEmail({ email: emailA, password }));
    expect(login.meta.requestStatus).toBe('fulfilled');
    expect(store.getState().auth.user.id).toBe(userA.id);
    expect(store.getState().auth.user.fullName).toBe('Live Tester A');

    await store.dispatch(fetchCloudHistory(userA.id));
    const logs = store.getState().history.logs;
    expect(logs).toHaveLength(1);
    expect(logs[0]).toMatchObject({
      userId: userA.id,
      exerciseName: 'Deep Squats',
      reps: 8,
      duration: 61,
      accuracy: 92,
      calories: 9,
      isSynced: true,
    });
  });

  test('after an app restart the cloud session is restored and sync still works', async () => {
    // A fresh module registry = a freshly started app. It must find the session that the
    // Supabase client saved in storage; before this was fixed, it found none and every
    // upload was rejected by row-level security.
    let fresh;
    jest.isolateModules(() => {
      fresh = require('../src/api/supabase');
    });
    const { data } = await fresh.supabase.auth.getSession();
    expect(data.session?.user.id).toBe(userA.id);
    const rows = await fresh.SupabaseService.fetchWorkoutHistory(userA.id);
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.every(r => r.userId === userA.id)).toBe(true);
  });

  test('cloud calls without a login are refused with a clear message', async () => {
    await store.dispatch(logout());
    await expect(SupabaseService.fetchWorkoutHistory(userA.id)).rejects.toThrow(/log in again/i);
  });

  test('an offline workout stays queued, then uploads once the user syncs', async () => {
    await store.dispatch(loginWithEmail({ email: emailA, password }));
    const id = store.getState().auth.user.id;
    // Seed a log that never reached the cloud (as if recorded with no signal).
    const offline = { id: 'local-log-offline-1', userId: id, ...workout, exerciseName: 'Pushups', createdAt: new Date().toISOString(), isSynced: false };
    mockMem.history = [offline];
    mockMem.queue = [offline];
    await store.dispatch(syncPendingQueue({ userId: id }));
    expect(mockMem.queue).toHaveLength(0);
    await store.dispatch(fetchCloudHistory(id));
    const names = store.getState().history.logs.map(l => l.exerciseName).sort();
    expect(names).toEqual(['Deep Squats', 'Pushups']);
  });

  test('a second user cannot see the first user\'s workouts', async () => {
    const reg = await store.dispatch(registerWithEmail({ email: emailB, password, fullName: 'Live Tester B' }));
    expect(reg.meta.requestStatus).toBe('fulfilled');
    const b = store.getState().auth.user;
    expect(b.id).not.toBe(userA.id);
    await store.dispatch(fetchCloudHistory(b.id));
    expect(store.getState().history.logs).toHaveLength(0);
  });

  test('wrong password is rejected with a clear message', async () => {
    const res = await store.dispatch(loginWithEmail({ email: emailA, password: 'not-the-password' }));
    expect(res.meta.requestStatus).toBe('rejected');
    expect(store.getState().auth.isAuthenticated).toBe(false);
    expect(store.getState().auth.error).toMatch(/invalid login credentials/i);
  });
});
