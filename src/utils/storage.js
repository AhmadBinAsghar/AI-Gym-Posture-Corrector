import AsyncStorage from '@react-native-async-storage/async-storage';

const KEYS = {
  USER_SESSION: '@gpc_user_session',
  WORKOUT_HISTORY: '@gpc_workout_history',
  SYNC_QUEUE: '@gpc_sync_queue',
};

export const LocalStorage = {
  /**
   * Session caching
   */
  async saveSession(user, token) {
    try {
      await AsyncStorage.setItem(KEYS.USER_SESSION, JSON.stringify({ user, token }));
    } catch (e) {
      console.error('Error saving local session:', e);
    }
  },

  async getSession() {
    try {
      const data = await AsyncStorage.getItem(KEYS.USER_SESSION);
      return data ? JSON.parse(data) : null;
    } catch (e) {
      console.error('Error loading local session:', e);
      return null;
    }
  },

  async clearSession() {
    try {
      await AsyncStorage.removeItem(KEYS.USER_SESSION);
    } catch (e) {
      console.error('Error clearing local session:', e);
    }
  },

  /**
   * Workout history local cache
   */
  async saveHistory(historyLogs) {
    try {
      await AsyncStorage.setItem(KEYS.WORKOUT_HISTORY, JSON.stringify(historyLogs));
    } catch (e) {
      console.error('Error caching workout logs locally:', e);
    }
  },

  async getHistory() {
    try {
      const data = await AsyncStorage.getItem(KEYS.WORKOUT_HISTORY);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.error('Error loading local workout logs:', e);
      return [];
    }
  },

  /**
   * Pending offline sync queue
   */
  async getSyncQueue() {
    try {
      const data = await AsyncStorage.getItem(KEYS.SYNC_QUEUE);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.error('Error loading sync queue:', e);
      return [];
    }
  },

  async saveSyncQueue(queue) {
    try {
      await AsyncStorage.setItem(KEYS.SYNC_QUEUE, JSON.stringify(queue));
    } catch (e) {
      console.error('Error saving sync queue:', e);
    }
  },

  async addToSyncQueue(log) {
    try {
      const queue = await this.getSyncQueue();
      queue.push(log);
      await this.saveSyncQueue(queue);
    } catch (e) {
      console.error('Error adding log to sync queue:', e);
    }
  },

  async clearSyncQueue() {
    try {
      await AsyncStorage.removeItem(KEYS.SYNC_QUEUE);
    } catch (e) {
      console.error('Error clearing sync queue:', e);
    }
  }
};
