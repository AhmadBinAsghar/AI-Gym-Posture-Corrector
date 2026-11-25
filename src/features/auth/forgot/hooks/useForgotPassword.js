import { useState } from 'react';
import { supabase, isSupabaseConfigured } from '../../../../api/supabase';
import { showDialog } from '../../../../components/AppDialog';
import { isValidEmail } from '../../../../utils/validation';

/**
 * Password reset by emailed code, done entirely inside the app (no web page or deep link):
 *   1. resetPasswordForEmail(email) -- Supabase emails a recovery message;
 *   2. verifyOtp({ email, token, type: 'recovery' }) with the 6-digit code from it, which
 *      signs the user in for this one purpose;
 *   3. updateUser({ password }) sets the new password, then sign out so they log in fresh.
 *
 * Needs the Supabase "Reset Password" email template to show the code ({{ .Token }});
 * the default template only has a link.
 */
const isNetworkError = e => /fetch|network/i.test(e?.message || '');
const friendly = e =>
  isNetworkError(e) ? 'Cannot reach the server. Check your internet connection.' : e?.message || 'Something went wrong.';

export const useForgotPassword = navigation => {
  const [step, setStep] = useState('email'); // 'email' -> 'reset'
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);

  const change = (setter, field) => value => {
    setter(value);
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: '' }));
  };

  const sendCode = async () => {
    if (isLoading) return;
    const trimmed = email.trim();
    if (!trimmed) return setErrors({ email: 'Email is required' });
    if (!isValidEmail(trimmed)) return setErrors({ email: 'Please enter a valid email address' });
    if (!isSupabaseConfigured) {
      showDialog('Not available', 'Password reset needs the online account service.', null, { icon: '☁️' });
      return;
    }
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(trimmed);
      if (error) throw error;
      setStep('reset');
      showDialog(
        'Check your email',
        `If an account exists for ${trimmed}, we sent it a 6-digit reset code. Enter it on the next screen.`,
        null,
        { icon: '📧' }
      );
    } catch (e) {
      showDialog('Could not send code', friendly(e), null, { icon: '📧' });
    } finally {
      setIsLoading(false);
    }
  };

  const resetPassword = async () => {
    if (isLoading) return;
    const next = {};
    if (!/^\d{6}$/.test(code.trim())) next.code = 'Enter the 6-digit code from the email';
    if (!password) next.password = 'Password is required';
    else if (password.length < 8) next.password = 'Password must be at least 8 characters';
    else if (password.length > 20) next.password = 'Password must be 20 characters or less';
    if (!confirmPassword) next.confirmPassword = 'Confirm password is required';
    else if (confirmPassword !== password) next.confirmPassword = 'Passwords do not match';
    if (Object.keys(next).length) return setErrors(next);

    setIsLoading(true);
    try {
      const { error: otpError } = await supabase.auth.verifyOtp({
        email: email.trim(),
        token: code.trim(),
        type: 'recovery',
      });
      if (otpError) throw otpError;
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw updateError;
      // The recovery sign-in was only for changing the password: log in normally next.
      await supabase.auth.signOut();
      showDialog('Password updated', 'You can now log in with your new password.', [
        { text: 'Log In', onPress: () => navigation.goBack() },
      ], { icon: '✅' });
    } catch (e) {
      const expired = /expired|invalid/i.test(e?.message || '');
      showDialog(
        'Reset failed',
        expired ? 'That code is wrong or has expired. Request a new one and try again.' : friendly(e),
        null,
        { icon: '🔒' }
      );
    } finally {
      setIsLoading(false);
    }
  };

  return {
    step,
    email,
    code,
    password,
    confirmPassword,
    errors,
    isLoading,
    handleChangeEmail: change(setEmail, 'email'),
    handleChangeCode: change(setCode, 'code'),
    handleChangePassword: change(setPassword, 'password'),
    handleChangeConfirmPassword: change(setConfirmPassword, 'confirmPassword'),
    sendCode,
    resetPassword,
    useDifferentEmail: () => {
      setStep('email');
      setCode('');
      setErrors({});
    },
    goBack: () => navigation.goBack(),
  };
};
