import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { supabase, isSupabaseConfigured } from '../../api/supabase';
import { LocalStorage } from '../../utils/storage';
import { GUEST_USER, isCloudUser } from '../../utils/user';

export const checkLocalSession = createAsyncThunk(
  'auth/checkSession',
  async (_, { rejectWithValue }) => {
    try {
      const session = await LocalStorage.getSession();
      if (!session) return null;

      // For an online account, use the live Supabase session (it refreshes expired tokens).
      // If it is unavailable (offline, expired), keep the saved login so the app still
      // opens; syncing will then ask the user to log in again.
      if (isCloudUser(session.user) && isSupabaseConfigured) {
        try {
          const { data } = await supabase.auth.getSession();
          if (data?.session) {
            return {
              user: { ...session.user, id: data.session.user.id, email: data.session.user.email },
              token: data.session.access_token,
            };
          }
        } catch (e) {
          // fall through to the saved login
        }
      }
      return session; // { user, token }
    } catch (e) {
      return rejectWithValue(e.message);
    }
  }
);

const isNetworkError = e => /fetch|network/i.test(e?.message || '');

// Offline sandbox accounts are a development convenience only: they skip real
// authentication, so they must never exist in a release build.
const offlineMockSession = async email => {
  const mockUser = { id: 'mock-offline-uuid-' + Date.now(), email };
  await LocalStorage.saveSession(mockUser, 'mock-token');
  return { user: mockUser, token: 'mock-token' };
};

export const loginWithEmail = createAsyncThunk(
  'auth/login',
  async ({ email, password }, { rejectWithValue }) => {
    try {
      if (!isSupabaseConfigured) throw new Error('Network request failed: Supabase is not configured');
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;

      const sessionData = {
        user: {
          id: data.user.id,
          email: data.user.email,
          fullName: data.user.user_metadata?.full_name || '',
        },
        token: data.session.access_token,
      };

      await LocalStorage.saveSession(sessionData.user, sessionData.token);
      return sessionData;
    } catch (e) {
      if (__DEV__ && isNetworkError(e)) {
        const savedSession = await LocalStorage.getSession();
        if (savedSession && savedSession.user.email === email) {
          return savedSession;
        }
        return await offlineMockSession(email);
      }
      return rejectWithValue(
        isNetworkError(e) ? 'Cannot reach the server. Check your connection, or use Guest mode.' : e.message
      );
    }
  }
);

export const registerWithEmail = createAsyncThunk(
  'auth/register',
  async ({ email, password, fullName }, { rejectWithValue }) => {
    try {
      if (!isSupabaseConfigured) throw new Error('Network request failed: Supabase is not configured');
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName } },
      });
      if (error) throw error;

      // With email confirmation enabled there is no session yet: do not pretend
      // the user is signed in (a placeholder token would fail every cloud call).
      if (!data.session) {
        return rejectWithValue('Account created. Please confirm your email, then log in.');
      }

      const sessionData = {
        user: { id: data.user.id, email: data.user.email, fullName: fullName || '' },
        token: data.session.access_token,
      };

      await LocalStorage.saveSession(sessionData.user, sessionData.token);
      return sessionData;
    } catch (e) {
      if (__DEV__ && isNetworkError(e)) {
        const session = await offlineMockSession(email);
        session.user.fullName = fullName || '';
        return session;
      }
      return rejectWithValue(
        isNetworkError(e) ? 'Cannot reach the server. Check your connection, or use Guest mode.' : e.message
      );
    }
  }
);

export const logout = createAsyncThunk(
  'auth/logout',
  async (_, { rejectWithValue }) => {
    try {
      await supabase.auth.signOut();
      await LocalStorage.clearSession();
      return null;
    } catch (e) {
      await LocalStorage.clearSession(); // force local logout
      return null;
    }
  }
);

const initialState = {
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    // bypass onboarding / direct mock auth for testing
    setGuestUser: (state) => {
      state.user = GUEST_USER;
      state.token = 'guest-token';
      state.isAuthenticated = true;
      state.isLoading = false;
    }
  },
  extraReducers: (builder) => {
    builder
      // checkLocalSession
      .addCase(checkLocalSession.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(checkLocalSession.fulfilled, (state, action) => {
        state.isLoading = false;
        if (action.payload) {
          state.user = action.payload.user;
          state.token = action.payload.token;
          state.isAuthenticated = true;
        }
      })
      .addCase(checkLocalSession.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      // loginWithEmail
      .addCase(loginWithEmail.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(loginWithEmail.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload.user;
        state.token = action.payload.token;
        state.isAuthenticated = true;
      })
      .addCase(loginWithEmail.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      // registerWithEmail
      .addCase(registerWithEmail.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(registerWithEmail.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload.user;
        state.token = action.payload.token;
        state.isAuthenticated = true;
      })
      .addCase(registerWithEmail.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      // logout
      .addCase(logout.fulfilled, (state) => {
        state.user = null;
        state.token = null;
        state.isAuthenticated = false;
        state.isLoading = false;
        state.error = null;
      });
  },
});

export const { clearError, setGuestUser } = authSlice.actions;
export default authSlice.reducer;
