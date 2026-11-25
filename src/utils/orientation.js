import { NativeModules } from 'react-native';

/**
 * Screen orientation lock (Android native module, see OrientationModule.kt). The app is
 * portrait everywhere except the pushup camera, which films a body lying down and needs the
 * wide side of the screen. A no-op where the module does not exist (iOS, Jest).
 */
const native = NativeModules.OrientationLock;

/** The exercises filmed lying down, which get a landscape camera. */
export const LANDSCAPE_EXERCISES = ['Pushups'];

export const wantsLandscape = exercise => LANDSCAPE_EXERCISES.includes(exercise);

export const lockLandscape = () => native?.lockLandscape?.();
export const lockPortrait = () => native?.lockPortrait?.();
