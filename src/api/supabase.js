import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL as EnvUrl, SUPABASE_ANON_KEY as EnvKey } from '@env';

// Real values live in .env (git-ignored); see .env.example. The placeholders only
// keep createClient from throwing when .env is missing - the app then runs offline/guest.
const PLACEHOLDER_URL = 'https://your-project-id.supabase.co';
const PLACEHOLDER_KEY = 'your-anon-key-here';

const SUPABASE_URL = (EnvUrl || '').trim() || PLACEHOLDER_URL;
const SUPABASE_ANON_KEY = (EnvKey || '').trim() || PLACEHOLDER_KEY;

export const isSupabaseConfigured =
  SUPABASE_URL !== PLACEHOLDER_URL && SUPABASE_ANON_KEY !== PLACEHOLDER_KEY;

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    // Supabase must keep (and refresh) its own session. With persistSession off, the app
    // looked logged in after a restart but the client had no session, so row-level
    // security rejected every upload and fetch.
    storage: AsyncStorage,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
  },
});

// Refresh tokens only while the app is in the foreground (Supabase's React Native advice).
if (isSupabaseConfigured) {
  const syncAutoRefresh = state => {
    if (state === 'active') supabase.auth.startAutoRefresh();
    else supabase.auth.stopAutoRefresh();
  };
  syncAutoRefresh(AppState.currentState);
  AppState.addEventListener('change', syncAutoRefresh);
}

const NOT_SIGNED_IN = 'Not signed in to the cloud. Please log in again to sync.';

/** Cloud calls only make sense with a live session that belongs to this user. */
const requireSession = async userId => {
  const { data } = await supabase.auth.getSession();
  if (!data?.session || data.session.user.id !== userId) throw new Error(NOT_SIGNED_IN);
};

/**
 * Supabase DB Service for Workout History logs
 */
export const SupabaseService = {
  /**
   * Uploads an array of workout logs to the cloud.
   * @param {string} userId - User UUID
   * @param {Array} logs - Workout logs to upload
   * @returns {Promise<Array>} - Successfully uploaded logs
   */
  async uploadWorkoutLogs(userId, logs) {
    if (!userId || !logs || logs.length === 0) return [];
    if (!isSupabaseConfigured) throw new Error('Network request failed: Supabase is not configured');
    await requireSession(userId);

    try {
      const formattedLogs = logs.map(log => ({
        user_id: userId,
        exercise_name: log.exerciseName,
        duration: log.duration,
        reps: log.reps,
        accuracy: log.accuracy,
        calories: log.calories,
        created_at: log.createdAt || new Date().toISOString(),
      }));

      const { data, error } = await supabase
        .from('exercise_history')
        .insert(formattedLogs)
        .select();

      if (error) throw error;
      return data;
    } catch (e) {
      console.warn('Supabase DB Sync failed (might be offline):', e.message);
      throw e;
    }
  },

  /**
   * Fetch all workout history for a user from Supabase.
   * @param {string} userId - User UUID
   * @returns {Promise<Array>} - List of user logs
   */
  async fetchWorkoutHistory(userId) {
    if (!userId) return [];
    if (!isSupabaseConfigured) throw new Error('Network request failed: Supabase is not configured');
    await requireSession(userId);

    try {
      const { data, error } = await supabase
        .from('exercise_history')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // format to match local redux keys
      return data.map(item => ({
        id: item.id,
        exerciseName: item.exercise_name,
        duration: item.duration,
        reps: item.reps,
        accuracy: item.accuracy,
        calories: item.calories,
        createdAt: item.created_at,
        userId,
        isSynced: true,
      }));
    } catch (e) {
      console.warn('Supabase DB Fetch failed (might be offline):', e.message);
      throw e;
    }
  }
};
