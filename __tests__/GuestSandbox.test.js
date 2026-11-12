import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import auth, { logout } from '../src/redux/slices/authSlice';
import exercise, { startWorkout, updateSkeleton, stopWorkout } from '../src/redux/slices/exerciseSlice';
import history, { addWorkoutLog, loadLocalHistory } from '../src/redux/slices/historySlice';
import { useLogin } from '../src/features/auth/login/hooks/useLogin';
import { useDashboard } from '../src/features/dashboard/hooks/useDashboard';
import { useHistory } from '../src/features/history/hooks/useHistory';

// Offline phone: every network call fails. In-memory AsyncStorage.
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
const mockResetTo = jest.fn();
jest.mock('../src/utils/navigationReset', () => ({ resetTo: (...a) => mockResetTo(...a) }));
const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate, replace: mockNavigate, dispatch: jest.fn(), goBack: jest.fn() }),
  CommonActions: { reset: jest.fn() },
}));
jest.mock('@react-native-community/netinfo', () => ({
  __esModule: true,
  default: {
    addEventListener: () => () => {},
    fetch: async () => ({ isConnected: false }),
  },
}));

const makeStore = () => configureStore({ reducer: { auth, exercise, history } });
const settle = () => new Promise(r => setTimeout(r, 50));

// `useAll` is a custom hook that calls the hooks under test and returns what we assert on.
const renderHooks = (store, useAll) => {
  const out = {};
  const Probe = () => {
    Object.assign(out, useAll());
    return null;
  };
  act(() => {
    TestRenderer.create(
      <Provider store={store}>
        <Probe />
      </Provider>
    );
  });
  return out;
};

describe('guest offline sandbox', () => {
  let store;
  let fetchSpy;

  beforeEach(() => {
    mockMem = { session: null, history: [], queue: [] };
    mockResetTo.mockReset();
    store = makeStore();
    fetchSpy = jest.spyOn(global, 'fetch').mockRejectedValue(new TypeError('Network request failed'));
  });
  afterEach(() => fetchSpy.mockRestore());

  test('the Guest button signs in locally with no network call and opens the dashboard', () => {
    const h = renderHooks(store, function useAll() {
      return { login: useLogin({}) };
    });
    act(() => h.login.handleOfflineSandbox());
    const { isAuthenticated, user, token } = store.getState().auth;
    expect(isAuthenticated).toBe(true);
    expect(user).toMatchObject({ id: 'guest-athlete', fullName: 'Guest' });
    expect(token).toBe('guest-token');
    expect(mockResetTo).toHaveBeenCalledWith(expect.anything(), 'Dashboard');
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  test('a guest workout is recorded, saved on the device, never queued or uploaded', async () => {
    const h = renderHooks(store, function useAll() {
      return { login: useLogin({}) };
    });
    act(() => h.login.handleOfflineSandbox());

    store.dispatch(startWorkout('Pushups'));
    for (let i = 0; i < 4; i++) {
      store.dispatch(updateSkeleton({ joints: {}, isPostureCorrect: i !== 1, warning: '', isRepCompleted: i === 3 }));
    }
    store.dispatch(stopWorkout());
    const w = store.getState().exercise;
    expect(w.reps).toBe(1);
    expect(w.accuracyScore).toBe(75);

    await store.dispatch(
      addWorkoutLog({
        userId: store.getState().auth.user.id,
        logData: { exerciseName: w.activeExercise, reps: w.reps, duration: 12, accuracy: w.accuracyScore, calories: 1 },
      })
    );
    await settle();
    expect(mockMem.history).toHaveLength(1);
    expect(mockMem.history[0]).toMatchObject({ userId: 'guest-athlete', exerciseName: 'Pushups', isSynced: false });
    expect(mockMem.queue).toHaveLength(0); // nothing waiting to upload
    expect(fetchSpy).not.toHaveBeenCalled(); // and no upload attempted
  });

  test('dashboard stats and history list show the guest\'s own workouts', async () => {
    const h = renderHooks(store, function useAll() {
      return { login: useLogin({}), dash: useDashboard(), hist: useHistory() };
    });
    act(() => h.login.handleOfflineSandbox());
    mockMem.history = [
      { id: 'g1', userId: 'guest-athlete', exerciseName: 'Deep Squats', accuracy: 80, createdAt: '2026-01-02T00:00:00Z' },
      { id: 'g2', userId: 'guest-athlete', exerciseName: 'Pushups', accuracy: 60, createdAt: '2026-01-01T00:00:00Z' },
      { id: 'x1', userId: 'someone-else', exerciseName: 'Pushups', accuracy: 10, createdAt: '2026-01-03T00:00:00Z' },
    ];
    await act(async () => {
      await store.dispatch(loadLocalHistory());
    });
    expect(h.dash.totalWorkouts).toBe(2);
    expect(h.dash.averageAccuracy).toBe(70);
    expect(h.hist.logs.map(l => l.id)).toEqual(['g1', 'g2']);
    expect(h.hist.canSync).toBe(false); // the Sync button is disabled for guests
  });

  test('logging out of guest mode works with no network', async () => {
    const h = renderHooks(store, function useAll() {
      return { login: useLogin({}) };
    });
    act(() => h.login.handleOfflineSandbox());
    await store.dispatch(logout());
    expect(store.getState().auth.isAuthenticated).toBe(false);
    expect(store.getState().auth.user).toBeNull();
  });
});
