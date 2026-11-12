import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { SupabaseService } from '../../api/supabase';
import { LocalStorage } from '../../utils/storage';
import { isCloudUser } from '../../utils/user';

/**
 * Combines the device's logs with the cloud copy for one user.
 *  - other users' logs are left untouched
 *  - the cloud copy is the truth for everything already synced
 *  - logs still waiting in the offline queue are kept so they are never lost
 */
export const mergeCloudLogs = (localLogs, cloudLogs, userId) => {
  const others = localLogs.filter(log => log.userId !== userId);
  const pending = localLogs.filter(log => log.userId === userId && !log.isSynced);
  return [...pending, ...cloudLogs, ...others].sort(
    (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
  );
};

/**
 * Thunk to load history logs from local cache (extremely fast & offline-ready!)
 */
export const loadLocalHistory = createAsyncThunk(
  'history/loadLocal',
  async (_, { rejectWithValue }) => {
    try {
      return await LocalStorage.getHistory();
    } catch (e) {
      return rejectWithValue(e.message);
    }
  }
);

/**
 * Thunk to pull full history from Supabase Cloud (updates local cache)
 */
export const fetchCloudHistory = createAsyncThunk(
  'history/fetchCloud',
  async (userId, { rejectWithValue }) => {
    try {
      const cloudLogs = await SupabaseService.fetchWorkoutHistory(userId);
      const merged = mergeCloudLogs(await LocalStorage.getHistory(), cloudLogs, userId);
      await LocalStorage.saveHistory(merged);
      return merged;
    } catch (e) {
      return rejectWithValue(e.message);
    }
  }
);

// Not Redux state: `history` is persisted, and a stale `true` would block sync forever.
let syncInFlight = false;

/**
 * Synchronizes any pending offline logs from the queue up to Supabase Cloud
 */
export const syncPendingQueue = createAsyncThunk(
  'history/syncQueue',
  async ({ userId }, { rejectWithValue }) => {
    syncInFlight = true;
    try {
      const queue = await LocalStorage.getSyncQueue();
      const mine = queue.filter(log => log.userId === userId);
      if (mine.length === 0) return [];

      await SupabaseService.uploadWorkoutLogs(userId, mine);

      // Re-read the queue: logs added while the upload was running must survive.
      const syncedIds = mine.map(log => log.id);
      const remaining = (await LocalStorage.getSyncQueue()).filter(log => !syncedIds.includes(log.id));
      await LocalStorage.saveSyncQueue(remaining);

      const localLogs = await LocalStorage.getHistory();
      await LocalStorage.saveHistory(
        localLogs.map(log => (syncedIds.includes(log.id) ? { ...log, isSynced: true } : log))
      );
      return syncedIds;
    } catch (e) {
      console.warn('Sync failed, items will remain in the offline queue:', e.message);
      return rejectWithValue(e.message);
    } finally {
      syncInFlight = false;
    }
  },
  {
    // Two overlapping uploads would insert the same rows twice.
    condition: () => !syncInFlight,
  }
);

/**
 * Add a workout log offline-first! Saves to local cache, adds to sync queue, and attempts cloud push.
 */
export const addWorkoutLog = createAsyncThunk(
  'history/addLog',
  async ({ userId, logData }, { dispatch, rejectWithValue }) => {
    const newLog = {
      id: 'local-log-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
      userId,
      exerciseName: logData.exerciseName,
      duration: logData.duration,
      reps: logData.reps,
      accuracy: logData.accuracy,
      calories: logData.calories,
      createdAt: new Date().toISOString(),
      isSynced: false,
    };

    try {
      const currentLogs = await LocalStorage.getHistory();
      await LocalStorage.saveHistory([newLog, ...currentLogs]);

      // Guests never sync: they have no cloud account to upload to.
      if (isCloudUser({ id: userId })) {
        await LocalStorage.addToSyncQueue(newLog);
        dispatch(syncPendingQueue({ userId }));
      }

      return newLog;
    } catch (e) {
      return rejectWithValue(e.message);
    }
  }
);

/**
 * Deletes one user's logs (and their queued uploads) from this device.
 */
export const clearHistoryOffline = createAsyncThunk(
  'history/clearOffline',
  async (userId, { rejectWithValue }) => {
    try {
      const logs = await LocalStorage.getHistory();
      await LocalStorage.saveHistory(logs.filter(log => log.userId !== userId));
      const queue = await LocalStorage.getSyncQueue();
      await LocalStorage.saveSyncQueue(queue.filter(log => log.userId !== userId));
      return userId;
    } catch (e) {
      return rejectWithValue(e.message);
    }
  }
);

const initialState = {
  logs: [],
  isSyncing: false,
  isLoading: false,
  error: null,
};

const historySlice = createSlice({
  name: 'history',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(loadLocalHistory.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(loadLocalHistory.fulfilled, (state, action) => {
        state.isLoading = false;
        state.logs = action.payload;
      })
      .addCase(loadLocalHistory.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      .addCase(fetchCloudHistory.pending, (state) => {
        state.isSyncing = true;
      })
      .addCase(fetchCloudHistory.fulfilled, (state, action) => {
        state.isSyncing = false;
        state.logs = action.payload;
      })
      .addCase(fetchCloudHistory.rejected, (state) => {
        state.isSyncing = false;
      })
      .addCase(addWorkoutLog.fulfilled, (state, action) => {
        state.logs = [action.payload, ...state.logs];
      })
      .addCase(syncPendingQueue.pending, (state) => {
        state.isSyncing = true;
      })
      .addCase(syncPendingQueue.fulfilled, (state, action) => {
        state.isSyncing = false;
        const syncedIds = action.payload;
        // update local redux logs to show green synced badges
        state.logs = state.logs.map(log =>
          syncedIds.includes(log.id) ? { ...log, isSynced: true } : log
        );
      })
      .addCase(syncPendingQueue.rejected, (state) => {
        state.isSyncing = false;
      })
      .addCase(clearHistoryOffline.fulfilled, (state, action) => {
        state.logs = state.logs.filter(log => log.userId !== action.payload);
      });
  },
});

export default historySlice.reducer;
