import { useState } from 'react';
import { Alert } from 'react-native';
import { useDispatch } from 'react-redux';
import { registerWithEmail } from '../../../../redux/slices/authSlice';
import { resetTo } from '../../../../utils/navigationReset';
import { isValidEmail } from '../../../../utils/validation';

export const useRegister = (navigation) => {
  const dispatch = useDispatch();
  const [isLoading, setIsLoading] = useState(false);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
  });

  const validate = () => {
    let valid = true;
    const newErrors = {
      fullName: '',
      email: '',
      password: '',
      confirmPassword: '',
    };

    if (!fullName.trim()) {
      newErrors.fullName = 'Full name is required';
      valid = false;
    } else if (fullName.trim().length < 3) {
      newErrors.fullName = 'Full name must be at least 3 characters';
      valid = false;
    } else if (fullName.trim().length > 40) {
      newErrors.fullName = 'Full name must be 40 characters or less';
      valid = false;
    }

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

    if (!confirmPassword) {
      newErrors.confirmPassword = 'Confirm password is required';
      valid = false;
    } else if (confirmPassword !== password) {
      newErrors.confirmPassword = 'Passwords do not match';
      valid = false;
    }

    setErrors(newErrors);
    return valid;
  };

  const handleChangeFullName = (text) => {
    setFullName(text);
    if (errors.fullName) {
      setErrors((prev) => ({ ...prev, fullName: '' }));
    }
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

  const handleChangeConfirmPassword = (text) => {
    setConfirmPassword(text);
    if (errors.confirmPassword) {
      setErrors((prev) => ({ ...prev, confirmPassword: '' }));
    }
  };

  const handleRegister = async () => {
    if (isLoading || !validate()) return;
    setIsLoading(true);
    try {
      await dispatch(
        registerWithEmail({ email: email.trim(), password, fullName: fullName.trim() })
      ).unwrap();
      resetTo(navigation, 'Dashboard');
    } catch (message) {
      Alert.alert('Registration', typeof message === 'string' ? message : 'Something went wrong.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoToLogin = () => {
    navigation.navigate('Login');
  };

  return {
    fullName,
    email,
    password,
    confirmPassword,
    errors,
    isLoading,
    handleChangeFullName,
    handleChangeEmail,
    handleChangePassword,
    handleChangeConfirmPassword,
    handleRegister,
    handleGoToLogin,
  };
};
