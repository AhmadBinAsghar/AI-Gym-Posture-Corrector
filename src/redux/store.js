import { configureStore } from '@reduxjs/toolkit';
import { persistStore, persistReducer } from 'redux-persist';
import AsyncStorage from '@react-native-async-storage/async-storage';
import authReducer from './slices/authSlice';
import exerciseReducer from './slices/exerciseSlice';
import historyReducer from './slices/historySlice';

const persistConfig = {
  key: 'root',
  storage: AsyncStorage,
  whitelist: ['auth', 'history'], // not 'exercise': joints change every frame,
};

const rootReducer = {
  auth: authReducer,
  exercise: exerciseReducer,
  history: historyReducer,
};

const persistedReducer = persistReducer(persistConfig, (state, action) => {
  return {
    auth: rootReducer.auth(state?.auth, action),
    exercise: rootReducer.exercise(state?.exercise, action),
    history: rootReducer.history(state?.history, action),
  };
});

export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      // These dev-only checks deep-walk the whole store on every dispatch. updateSkeleton fires
      // ~30x a second with a full joint set, and walking that on the JS thread -- which the
      // camera frames queue behind -- made the skeleton visibly trail the body in debug builds.
      serializableCheck: {
        ignoredActions: ['persist/PERSIST', 'persist/REHYDRATE', 'exercise/updateSkeleton'],
        ignoredPaths: ['exercise'],
      },
      immutableCheck: { ignoredPaths: ['exercise'] },
    }),
});

export const persistor = persistStore(store);
