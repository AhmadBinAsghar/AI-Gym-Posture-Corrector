import { useEffect, useRef } from 'react';
import NetInfo from '@react-native-community/netinfo';
import { useDispatch, useSelector } from 'react-redux';
import { syncPendingQueue, fetchCloudHistory } from '../redux/slices/historySlice';
import { isCloudUser } from '../utils/user';

/**
 * App-wide offline-first sync.
 *
 * Workouts are always written to the device first (see `addWorkoutLog`), so the app
 * stays fully usable without internet. This hook is what gets them to the cloud on
 * its own: whenever the connection comes back - or on launch, if already online - it
 * flushes the queued uploads and refreshes the cloud copy. Nothing is deleted on
 * failure, so an interrupted sync simply retries the next time the network returns.
 */
export const useAutoSync = () => {
  const dispatch = useDispatch();
  const user = useSelector(state => state.auth.user);
  const wasOnline = useRef(null);

  useEffect(() => {
    // Guests and offline-sandbox accounts have nowhere to upload to.
    if (!isCloudUser(user)) return undefined;

    const runSync = async () => {
      try {
        await dispatch(syncPendingQueue({ userId: user.id })).unwrap();
      } catch (e) {
        return; // no connection (or session expired): the queue is kept for later
      }
      try {
        await dispatch(fetchCloudHistory(user.id)).unwrap();
      } catch (e) {
        // Pull failed: the local cache still shows everything the user has done.
      }
    };

    const unsubscribe = NetInfo.addEventListener(state => {
      const online = !!state.isConnected;
      const cameOnline = wasOnline.current === false && online;
      wasOnline.current = online;
      if (cameOnline) runSync();
    });

    // The app may already be online at launch - e.g. it was closed while offline and
    // reopened once the connection returned. In that case no change event fires.
    NetInfo.fetch().then(state => {
      wasOnline.current = !!state.isConnected;
      if (state.isConnected) runSync();
    });

    return unsubscribe;
  }, [dispatch, user]);
};
