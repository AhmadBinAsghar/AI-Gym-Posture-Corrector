import { configureStore } from '@reduxjs/toolkit';
import reducer, {
  checkLocalSession,
  loginWithEmail,
  registerWithEmail,
  setGuestUser,
  logout,
} from '../src/redux/slices/authSlice';
import { isCloudUser } from '../src/utils/user';

const mockSignIn = jest.fn();
const mockSignUp = jest.fn();
const mockGetSession = jest.fn();
let mockStored = null;

jest.mock('../src/api/supabase', () => ({
  isSupabaseConfigured: true,
  supabase: {
    auth: {
      signInWithPassword: (...a) => mockSignIn(...a),
      signUp: (...a) => mockSignUp(...a),
      getSession: (...a) => mockGetSession(...a),
      signOut: async () => {},
    },
  },
}));
jest.mock('../src/utils/storage', () => ({
  LocalStorage: {
    saveSession: async () => {},
    getSession: async () => mockStored,
    clearSession: async () => {},
  },
}));

const makeStore = () => configureStore({ reducer: { auth: reducer } });

describe('authSlice', () => {
  test('login stores the user and token', async () => {
    mockSignIn.mockResolvedValue({
      data: {
        user: { id: 'u1', email: 'a@b.co', user_metadata: { full_name: 'Ada' } },
        session: { access_token: 't' },
      },
      error: null,
    });
    const store = makeStore();
    await store.dispatch(loginWithEmail({ email: 'a@b.co', password: 'password1' }));
    const s = store.getState().auth;
    expect(s.isAuthenticated).toBe(true);
    expect(s.user).toEqual({ id: 'u1', email: 'a@b.co', fullName: 'Ada' });
  });

  test('wrong credentials surface the server message and stay logged out', async () => {
    mockSignIn.mockResolvedValue({ data: {}, error: new Error('Invalid login credentials') });
    const store = makeStore();
    await store.dispatch(loginWithEmail({ email: 'a@b.co', password: 'nope' }));
    expect(store.getState().auth.isAuthenticated).toBe(false);
    expect(store.getState().auth.error).toBe('Invalid login credentials');
  });

  test('register without a session (email confirmation) does not log the user in', async () => {
    mockSignUp.mockResolvedValue({
      data: { user: { id: 'u2', email: 'n@b.co' }, session: null },
      error: null,
    });
    const store = makeStore();
    await store.dispatch(registerWithEmail({ email: 'n@b.co', password: 'password1', fullName: 'New' }));
    expect(store.getState().auth.isAuthenticated).toBe(false);
    expect(store.getState().auth.error).toMatch(/confirm your email/i);
  });

  test('guest mode logs in locally and logout clears it', async () => {
    const store = makeStore();
    store.dispatch(setGuestUser());
    expect(store.getState().auth.isAuthenticated).toBe(true);
    expect(isCloudUser(store.getState().auth.user)).toBe(false);
    await store.dispatch(logout());
    expect(store.getState().auth.isAuthenticated).toBe(false);
  });

  describe('restoring the saved login on start-up', () => {
    const cloudSaved = { user: { id: 'u1', email: 'a@b.co', fullName: 'Ada' }, token: 'old-token' };

    beforeEach(() => {
      mockGetSession.mockReset();
      mockStored = null;
    });

    test('nothing saved: stays logged out', async () => {
      const store = makeStore();
      await store.dispatch(checkLocalSession());
      expect(store.getState().auth.isAuthenticated).toBe(false);
    });

    test('an online account picks up the live (refreshed) Supabase session', async () => {
      mockStored = cloudSaved;
      mockGetSession.mockResolvedValue({
        data: { session: { access_token: 'fresh-token', user: { id: 'u1', email: 'a@b.co' } } },
      });
      const store = makeStore();
      await store.dispatch(checkLocalSession());
      const s = store.getState().auth;
      expect(s.isAuthenticated).toBe(true);
      expect(s.token).toBe('fresh-token');
      expect(s.user.fullName).toBe('Ada'); // name kept from the saved login
    });

    test('offline or expired: the saved login is kept so the app still opens', async () => {
      mockStored = cloudSaved;
      mockGetSession.mockRejectedValue(new Error('Network request failed'));
      const store = makeStore();
      await store.dispatch(checkLocalSession());
      expect(store.getState().auth.isAuthenticated).toBe(true);
      expect(store.getState().auth.token).toBe('old-token');
    });

    test('no live session: the saved login is kept too', async () => {
      mockStored = cloudSaved;
      mockGetSession.mockResolvedValue({ data: { session: null } });
      const store = makeStore();
      await store.dispatch(checkLocalSession());
      expect(store.getState().auth.isAuthenticated).toBe(true);
    });

    test('a guest never touches Supabase', async () => {
      mockStored = { user: { id: 'guest-athlete', email: 'guest@aurafit.fit' }, token: 'guest-token' };
      const store = makeStore();
      await store.dispatch(checkLocalSession());
      expect(store.getState().auth.isAuthenticated).toBe(true);
      expect(mockGetSession).not.toHaveBeenCalled();
    });
  });

  test('isCloudUser rejects guests, sandbox users and empty users', () => {
    expect(isCloudUser({ id: 'guest-athlete' })).toBe(false);
    expect(isCloudUser({ id: 'mock-offline-uuid-1' })).toBe(false);
    expect(isCloudUser(null)).toBe(false);
    expect(isCloudUser({ id: '3f2c-real' })).toBe(true);
  });
});
