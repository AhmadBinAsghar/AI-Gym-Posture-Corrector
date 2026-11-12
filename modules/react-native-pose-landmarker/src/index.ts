import { NitroModules } from 'react-native-nitro-modules';
import type { PoseLandmarker } from './specs/PoseLandmarker.nitro';
import type { Speaker } from './specs/Speaker.nitro';

export type {
  PoseLandmarker,
  PoseLandmark,
  PoseResult,
} from './specs/PoseLandmarker.nitro';
export type { Speaker } from './specs/Speaker.nitro';

/** ML Kit landmark order (index -> name). */
export const LANDMARK_NAMES = [
  'nose', 'leftEyeInner', 'leftEye', 'leftEyeOuter', 'rightEyeInner', 'rightEye',
  'rightEyeOuter', 'leftEar', 'rightEar', 'mouthLeft', 'mouthRight',
  'leftShoulder', 'rightShoulder', 'leftElbow', 'rightElbow', 'leftWrist',
  'rightWrist', 'leftPinky', 'rightPinky', 'leftIndex', 'rightIndex',
  'leftThumb', 'rightThumb', 'leftHip', 'rightHip', 'leftKnee', 'rightKnee',
  'leftAnkle', 'rightAnkle', 'leftHeel', 'rightHeel', 'leftFootIndex',
  'rightFootIndex',
] as const;

export function createPoseLandmarker(): PoseLandmarker {
  return NitroModules.createHybridObject<PoseLandmarker>('PoseLandmarker');
}

export function createSpeaker(): Speaker {
  return NitroModules.createHybridObject<Speaker>('Speaker');
}
