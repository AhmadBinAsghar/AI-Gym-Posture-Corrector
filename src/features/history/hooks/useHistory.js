import { useEffect, useMemo, useState } from 'react';
import { Alert } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import NetInfo from '@react-native-community/netinfo';
import {
  loadLocalHistory,
  syncPendingQueue,
  fetchCloudHistory,
  clearHistoryOffline,
} from '../../../redux/slices/historySlice';
import { isCloudUser } from '../../../utils/user';

export const useHistory = () => {
  const dispatch = useDispatch();
  const navigation = useNavigation();
  const [isConnected, setIsConnected] = useState(true);

  const user = useSelector(state => state.auth.user);
  const history = useSelector(state => state.history);
  // Show only the signed-in account's workouts.
  const logs = useMemo(
    () => history.logs.filter(log => log.userId === user?.id),
    [history.logs, user?.id]
  );

  useEffect(() => {
    dispatch(loadLocalHistory());
  }, [dispatch]);

  // Listen for network changes
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsConnected(state.isConnected);
    });
    // fetch initial state
    NetInfo.fetch().then(state => setIsConnected(state.isConnected));
    return () => unsubscribe();
  }, []);

  const handleSync = async () => {
    if (!isCloudUser(user)) return;
    try {
      await dispatch(syncPendingQueue({ userId: user.id })).unwrap();
      await dispatch(fetchCloudHistory(user.id)).unwrap();
    } catch (e) {
      // A skipped sync (one already running) is not an error worth showing.
      if (e?.name === 'ConditionError') return;
      const needsLogin = typeof e === 'string' && /log in again/i.test(e);
      Alert.alert(
        'Sync failed',
        needsLogin ? e : 'Could not reach the cloud. Your workouts are safe on this device.'
      );
    }
  };

  const handleClear = () => {
    Alert.alert(
      'Reset local history?',
      'This deletes your workouts from this device, including any not yet synced.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => dispatch(clearHistoryOffline(user?.id)),
        },
      ]
    );
  };

  const handleGoBack = () => {
    navigation.replace('Dashboard');
  };

  return {
    goBack: handleGoBack,
    logs,
    isSyncing: history.isSyncing,
    isLoading: history.isLoading,
    canSync: isCloudUser(user) && !!isConnected,
    handleSync,
    handleClear,
  };
};
