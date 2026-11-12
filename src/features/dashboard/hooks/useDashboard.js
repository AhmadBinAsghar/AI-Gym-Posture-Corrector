import { useMemo } from 'react';
import { Alert } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { logout } from '../../../redux/slices/authSlice';
import { startWorkout } from '../../../redux/slices/exerciseSlice';
import { useNavigation } from '@react-navigation/native';
import { resetTo } from '../../../utils/navigationReset';

const EXERCISES = [
  {
    id: 'squats',
    name: 'Deep Squats',
    target: 'Quads, Glutes & Hamstrings',
    difficulty: 'Intermediate',
    duration: '3 Sets x 10 Reps',
    icon: '🏋️',
  },
  {
    id: 'curls',
    name: 'Bicep Curls',
    target: 'Biceps & Forearms',
    difficulty: 'Beginner',
    duration: '3 Sets x 12 Reps',
    icon: '💪',
  },
  {
    id: 'pushups',
    name: 'Pushups',
    target: 'Chest, Shoulders & Triceps',
    difficulty: 'Intermediate',
    duration: '3 Sets x 15 Reps',
    icon: '🧘',
  },
];

export const useDashboard = () => {
  const dispatch = useDispatch();
  const navigation = useNavigation();
  const user = useSelector((state) => state.auth.user);
  const allLogs = useSelector((state) => state.history.logs);
  // Only this account's workouts count towards its stats.
  const logs = useMemo(
    () => (allLogs || []).filter((log) => log.userId === user?.id),
    [allLogs, user?.id]
  );

  const totalWorkouts = logs.length;
  const averageAccuracy = useMemo(() => {
    if (totalWorkouts === 0) {
      return 0;
    }
    const sum = logs.reduce((acc, log) => acc + (log.accuracy || 0), 0);
    return Math.round(sum / totalWorkouts);
  }, [logs, totalWorkouts]);

  const handleSelectExercise = (exerciseName) => {
    dispatch(startWorkout(exerciseName));
    navigation.navigate('Camera');
  };

  const handleLogout = () => {
    Alert.alert(
      'Log Out',
      'Are you sure you want to end your current session?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          style: 'destructive',
          onPress: () => {
            dispatch(logout());
            resetTo(navigation, 'Login');
          },
        },
      ]
    );
  };

  const handleViewHistory = () => {
    navigation.navigate('History');
  };

  return {
    user,
    logs,
    totalWorkouts,
    averageAccuracy,
    exercises: EXERCISES,
    handleSelectExercise,
    handleLogout,
    handleViewHistory,
  };
};
