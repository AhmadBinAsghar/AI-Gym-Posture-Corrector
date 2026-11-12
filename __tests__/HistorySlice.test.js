import { configureStore } from '@reduxjs/toolkit';
import reducer, {
  addWorkoutLog,
  syncPendingQueue,
  fetchCloudHistory,
  clearHistoryOffline,
  mergeCloudLogs,
} from '../src/redux/slices/historySlice';

// In-memory stand-ins for AsyncStorage and Supabase (names prefixed `mock` so jest allows them).
let mockMem;
const mockUpload = jest.fn();
const mockFetch = jest.fn();

jest.mock('../src/utils/storage', () => ({
  LocalStorage: {
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
jest.mock('../src/api/supabase', () => ({
  SupabaseService: {
    uploadWorkoutLogs: (...a) => mockUpload(...a),
    fetchWorkoutHistory: (...a) => mockFetch(...a),
  },
}));

const makeStore = () => configureStore({ reducer: { history: reducer } });
const logData = { exerciseName: 'Pushups', reps: 5, duration: 30, accuracy: 90, calories: 4 };
const CLOUD = 'user-uuid-1';
const settle = () => new Promise(r => setImmediate(r));

beforeEach(() => {
  mockMem = { history: [], queue: [] };
  mockUpload.mockReset();
  mockFetch.mockReset();
});

describe('history sync', () => {
  test('guest workouts are saved locally and never queued for upload', async () => {
    const store = makeStore();
    await store.dispatch(addWorkoutLog({ userId: 'guest-athlete', logData }));
    expect(mockMem.history).toHaveLength(1);
    expect(mockMem.queue).toHaveLength(0);
    expect(mockUpload).not.toHaveBeenCalled();
  });

  test('a signed-in workout is uploaded and marked synced', async () => {
    mockUpload.mockResolvedValue([]);
    const store = makeStore();
    await store.dispatch(addWorkoutLog({ userId: CLOUD, logData }));
    await settle();
    expect(mockUpload).toHaveBeenCalledTimes(1);
    expect(mockMem.queue).toHaveLength(0);
    expect(mockMem.history[0].isSynced).toBe(true);
    expect(store.getState().history.logs[0].isSynced).toBe(true);
  });

  test('a failed upload keeps the log queued for later', async () => {
    mockUpload.mockRejectedValue(new Error('Network request failed'));
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    const store = makeStore();
    await store.dispatch(addWorkoutLog({ userId: CLOUD, logData }));
    await settle();
    expect(mockMem.queue).toHaveLength(1);
    expect(mockMem.history[0].isSynced).toBe(false);
  });

  test('logs queued during an upload are not dropped', async () => {
    const late = { id: 'late', userId: CLOUD, isSynced: false };
    mockMem.queue = [{ id: 'a', userId: CLOUD, isSynced: false }];
    mockMem.history = [...mockMem.queue];
    mockUpload.mockImplementation(async () => {
      mockMem.queue = [...mockMem.queue, late];
    });
    await makeStore().dispatch(syncPendingQueue({ userId: CLOUD }));
    expect(mockMem.queue.map(l => l.id)).toEqual(['late']);
  });

  test('overlapping syncs upload only once', async () => {
    mockMem.queue = [{ id: 'a', userId: CLOUD, isSynced: false }];
    mockMem.history = [...mockMem.queue];
    mockUpload.mockResolvedValue([]);
    const store = makeStore();
    await Promise.all([
      store.dispatch(syncPendingQueue({ userId: CLOUD })),
      store.dispatch(syncPendingQueue({ userId: CLOUD })),
    ]);
    expect(mockUpload).toHaveBeenCalledTimes(1);
  });

  test('fetching the cloud copy keeps unsynced local logs and other users', async () => {
    const pending = { id: 'p', userId: CLOUD, isSynced: false, createdAt: '2026-01-03T00:00:00Z' };
    const stale = { id: 's', userId: CLOUD, isSynced: true, createdAt: '2026-01-01T00:00:00Z' };
    const other = { id: 'o', userId: 'someone-else', isSynced: true, createdAt: '2026-01-02T00:00:00Z' };
    mockMem.history = [pending, stale, other];
    mockFetch.mockResolvedValue([
      { id: 'c1', userId: CLOUD, isSynced: true, createdAt: '2026-01-01T00:00:00Z' },
    ]);
    const store = makeStore();
    await store.dispatch(fetchCloudHistory(CLOUD));
    expect(store.getState().history.logs.map(l => l.id)).toEqual(['p', 'o', 'c1']);
  });

  test('reset only removes the current users logs', async () => {
    mockMem.history = [
      { id: '1', userId: 'a' },
      { id: '2', userId: 'b' },
    ];
    mockMem.queue = [{ id: '1', userId: 'a' }];
    const store = makeStore();
    await store.dispatch(clearHistoryOffline('a'));
    expect(mockMem.history.map(l => l.id)).toEqual(['2']);
    expect(mockMem.queue).toEqual([]);
  });

  test('mergeCloudLogs sorts newest first', () => {
    const out = mergeCloudLogs(
      [],
      [
        { id: 'old', userId: CLOUD, createdAt: '2026-01-01T00:00:00Z' },
        { id: 'new', userId: CLOUD, createdAt: '2026-02-01T00:00:00Z' },
      ],
      CLOUD
    );
    expect(out.map(l => l.id)).toEqual(['new', 'old']);
  });
});
