import React from 'react';
import { Alert } from 'react-native';
import TestRenderer, { act } from 'react-test-renderer';
import { useLogin } from '../src/features/auth/login/hooks/useLogin';
import { useRegister } from '../src/features/auth/register/hooks/useRegister';

const mockDispatch = jest.fn();
jest.mock('react-redux', () => ({ useDispatch: () => mockDispatch }));
jest.mock('../src/api/supabase', () => ({ isSupabaseConfigured: true, supabase: { auth: {} } }));
jest.mock('../src/utils/storage', () => ({ LocalStorage: {} }));
const mockResetTo = jest.fn();
jest.mock('../src/utils/navigationReset', () => ({ resetTo: (...a) => mockResetTo(...a) }));

// Renders a hook and exposes its latest return value.
const renderHook = hook => {
  const ref = { current: null };
  const Probe = () => {
    ref.current = hook();
    return null;
  };
  act(() => {
    TestRenderer.create(<Probe />);
  });
  return ref;
};

// Types into a field, then submits, all inside act().
const fill = (hook, values) =>
  act(() => {
    Object.entries(values).forEach(([setter, value]) => hook.current[setter](value));
  });
const submit = async fn => {
  await act(async () => {
    await fn();
  });
};

const nav = {};

beforeEach(() => {
  mockDispatch.mockReset();
  mockResetTo.mockReset();
  jest.spyOn(Alert, 'alert').mockImplementation(() => {}).mockClear();
});

describe('login validation', () => {
  test('empty fields show "required" errors and do not call the server', async () => {
    const h = renderHook(() => useLogin(nav));
    await submit(h.current.handleLogin);
    expect(h.current.errors.email).toBe('Email is required');
    expect(h.current.errors.password).toBe('Password is required');
    expect(mockDispatch).not.toHaveBeenCalled();
  });

  test.each(['plainaddress', 'no-at.com', 'a@b', 'a b@c.com@'])('rejects malformed email %s', async bad => {
    const h = renderHook(() => useLogin(nav));
    fill(h, { handleChangeEmail: bad, handleChangePassword: 'password1' });
    await submit(h.current.handleLogin);
    expect(h.current.errors.email).toBe('Please enter a valid email address');
    expect(mockDispatch).not.toHaveBeenCalled();
  });

  test('short password (under 8) is rejected', async () => {
    const h = renderHook(() => useLogin(nav));
    fill(h, { handleChangeEmail: 'a@b.co', handleChangePassword: '1234567' });
    await submit(h.current.handleLogin);
    expect(h.current.errors.password).toBe('Password must be at least 8 characters');
    expect(h.current.errors.email).toBe('');
  });

  test('password over 20 characters is rejected', async () => {
    const h = renderHook(() => useLogin(nav));
    fill(h, { handleChangeEmail: 'a@b.co', handleChangePassword: 'x'.repeat(21) });
    await submit(h.current.handleLogin);
    expect(h.current.errors.password).toBe('Password must be 20 characters or less');
  });

  test('email over 50 characters is rejected', async () => {
    const h = renderHook(() => useLogin(nav));
    fill(h, { handleChangeEmail: 'a'.repeat(48) + '@b.co', handleChangePassword: 'password1' });
    await submit(h.current.handleLogin);
    expect(h.current.errors.email).toBe('Email must be 50 characters or less');
  });

  test('typing clears that field\'s error', async () => {
    const h = renderHook(() => useLogin(nav));
    await submit(h.current.handleLogin);
    expect(h.current.errors.email).not.toBe('');
    fill(h, { handleChangeEmail: 'a' });
    expect(h.current.errors.email).toBe('');
    expect(h.current.errors.password).not.toBe('');
  });

  test('valid input dispatches login with a trimmed email and opens the dashboard', async () => {
    mockDispatch.mockReturnValue({ unwrap: async () => ({}) });
    const h = renderHook(() => useLogin(nav));
    fill(h, { handleChangeEmail: '  a@b.co  ', handleChangePassword: 'password1' });
    await submit(h.current.handleLogin);
    expect(mockDispatch).toHaveBeenCalledTimes(1);
    expect(mockResetTo).toHaveBeenCalledWith(nav, 'Dashboard');
    expect(Alert.alert).not.toHaveBeenCalled();
  });

  test('a server error (wrong password) shows an alert and stays on the screen', async () => {
    mockDispatch.mockReturnValue({
      unwrap: async () => {
        throw 'Invalid login credentials';
      },
    });
    const h = renderHook(() => useLogin(nav));
    fill(h, { handleChangeEmail: 'a@b.co', handleChangePassword: 'password1' });
    await submit(h.current.handleLogin);
    expect(Alert.alert).toHaveBeenCalledWith('Login failed', 'Invalid login credentials');
    expect(mockResetTo).not.toHaveBeenCalled();
    expect(h.current.isLoading).toBe(false); // the button is usable again
  });
});

describe('register validation', () => {
  const valid = {
    handleChangeFullName: 'Ada Lovelace',
    handleChangeEmail: 'ada@b.co',
    handleChangePassword: 'password1',
    handleChangeConfirmPassword: 'password1',
  };

  test('empty form lists every required field', async () => {
    const h = renderHook(() => useRegister(nav));
    await submit(h.current.handleRegister);
    expect(h.current.errors).toEqual({
      fullName: 'Full name is required',
      email: 'Email is required',
      password: 'Password is required',
      confirmPassword: 'Confirm password is required',
    });
    expect(mockDispatch).not.toHaveBeenCalled();
  });

  test('name shorter than 3 characters is rejected, whitespace does not count', async () => {
    const h = renderHook(() => useRegister(nav));
    fill(h, { ...valid, handleChangeFullName: '  Al  ' });
    await submit(h.current.handleRegister);
    expect(h.current.errors.fullName).toBe('Full name must be at least 3 characters');
  });

  test('name over 40 characters is rejected', async () => {
    const h = renderHook(() => useRegister(nav));
    fill(h, { ...valid, handleChangeFullName: 'x'.repeat(41) });
    await submit(h.current.handleRegister);
    expect(h.current.errors.fullName).toBe('Full name must be 40 characters or less');
  });

  test('short password is rejected', async () => {
    const h = renderHook(() => useRegister(nav));
    fill(h, { ...valid, handleChangePassword: 'abc', handleChangeConfirmPassword: 'abc' });
    await submit(h.current.handleRegister);
    expect(h.current.errors.password).toBe('Password must be at least 8 characters');
  });

  test('mismatching confirmation is rejected', async () => {
    const h = renderHook(() => useRegister(nav));
    fill(h, { ...valid, handleChangeConfirmPassword: 'password2' });
    await submit(h.current.handleRegister);
    expect(h.current.errors.confirmPassword).toBe('Passwords do not match');
    expect(mockDispatch).not.toHaveBeenCalled();
  });

  test('valid form registers with trimmed name and email', async () => {
    mockDispatch.mockReturnValue({ unwrap: async () => ({}) });
    const h = renderHook(() => useRegister(nav));
    fill(h, { ...valid, handleChangeFullName: '  Ada Lovelace ', handleChangeEmail: ' ada@b.co ' });
    await submit(h.current.handleRegister);
    expect(mockDispatch).toHaveBeenCalledTimes(1);
    expect(mockResetTo).toHaveBeenCalledWith(nav, 'Dashboard');
  });

  test('"confirm your email" message from the server is shown, not swallowed', async () => {
    mockDispatch.mockReturnValue({
      unwrap: async () => {
        throw 'Account created. Please confirm your email, then log in.';
      },
    });
    const h = renderHook(() => useRegister(nav));
    fill(h, valid);
    await submit(h.current.handleRegister);
    expect(Alert.alert).toHaveBeenCalledWith('Registration', expect.stringMatching(/confirm your email/i));
    expect(mockResetTo).not.toHaveBeenCalled();
  });
});

describe('isValidEmail', () => {
  const { isValidEmail } = require('../src/utils/validation');
  test.each(['a@b.co', 'first.last@mail.example.com', 'a+tag@b.io'])('accepts %s', e => {
    expect(isValidEmail(e)).toBe(true);
  });
  test.each(['', 'a', 'a@b', 'a@b.', 'a@.com', 'a b@c.com', 'a@b.com@', '@b.com', 'a@@b.com', 'a@b.c', 'a@b..'])(
    'rejects %p',
    e => {
      expect(isValidEmail(e)).toBe(false);
    }
  );
});
