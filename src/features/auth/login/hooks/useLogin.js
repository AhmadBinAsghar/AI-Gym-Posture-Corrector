import { useState } from 'react';
import { showDialog } from '../../../../components/AppDialog';
import { useDispatch } from 'react-redux';
import { loginWithEmail, setGuestUser } from '../../../../redux/slices/authSlice';
import { resetTo } from '../../../../utils/navigationReset';
import { isValidEmail } from '../../../../utils/validation';

export const useLogin = (navigation) => {
  const dispatch = useDispatch();
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState({ email: '', password: '' });

  const validate = () => {
    let valid = true;
    const newErrors = { email: '', password: '' };

    if (!email) {
      newErrors.email = 'Email is required';
      valid = false;
    } else if (email.length > 50) {
      newErrors.email = 'Email must be 50 characters or less';
      valid = false;
    } else if (!isValidEmail(email.trim())) {
      newErrors.email = 'Please enter a valid email address';
      valid = false;
    }

    if (!password) {
      newErrors.password = 'Password is required';
      valid = false;
    } else if (password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
      valid = false;
    } else if (password.length > 20) {
      newErrors.password = 'Password must be 20 characters or less';
      valid = false;
    }

    setErrors(newErrors);
    return valid;
  };

  const handleChangeEmail = (text) => {
    setEmail(text);
    if (errors.email) {
      setErrors((prev) => ({ ...prev, email: '' }));
    }
  };

  const handleChangePassword = (text) => {
    setPassword(text);
    if (errors.password) {
      setErrors((prev) => ({ ...prev, password: '' }));
    }
  };

  const handleLogin = async () => {
    if (isLoading || !validate()) return;
    setIsLoading(true);
    try {
      await dispatch(loginWithEmail({ email: email.trim(), password })).unwrap();
      resetTo(navigation, 'Dashboard');
    } catch (message) {
      showDialog('Login failed', typeof message === 'string' ? message : 'Something went wrong.', null, { icon: '🔒' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleOfflineSandbox = () => {
    dispatch(setGuestUser());
    resetTo(navigation, 'Dashboard');
  };

  const handleGoToRegister = () => {
    navigation.navigate('Register');
  };

  return {
    email,
    password,
    errors,
    isLoading,
    handleChangeEmail,
    handleChangePassword,
    handleLogin,
    handleOfflineSandbox,
    handleGoToRegister,
  };
};
