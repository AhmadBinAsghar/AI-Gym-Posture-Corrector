import { useEffect, useRef } from 'react';
import { Animated } from 'react-native';
import { useDispatch, useStore } from 'react-redux';
import { checkLocalSession } from '../../../redux/slices/authSlice';
import { resetTo } from '../../../utils/navigationReset';

export const useSplashAnimation = (navigation) => {
  const dispatch = useDispatch();
  const store = useStore();
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1.0,
        friction: 4,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
    ]).start();

    // Restore a saved login, then send returning users straight to the dashboard.
    let cancelled = false;
    const timer = setTimeout(async () => {
      await dispatch(checkLocalSession());
      if (cancelled) return;
      resetTo(navigation, store.getState().auth.isAuthenticated ? 'Dashboard' : 'Onboarding');
    }, 2500);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [navigation, scaleAnim, opacityAnim, dispatch, store]);

  return { scaleAnim, opacityAnim };
};