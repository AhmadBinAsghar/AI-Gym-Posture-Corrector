import type { HybridObject } from 'react-native-nitro-modules';
import type { Frame } from 'react-native-vision-camera/lib/specs/instances/Frame.nitro';

export interface PoseLandmark {
  /** X in pixels of the upright (rotation-corrected) image. */
  x: number;
  /** Y in pixels of the upright (rotation-corrected) image. */
  y: number;
  /** ML Kit in-frame likelihood, 0..1. */
  confidence: number;
}

export interface PoseResult {
  /** Width of the upright image the landmarks refer to. */
  imageWidth: number;
  /** Height of the upright image the landmarks refer to. */
  imageHeight: number;
  /** The 33 ML Kit landmarks in ML Kit order, or empty if no person was found. */
  landmarks: PoseLandmark[];
}

export interface PoseLandmarker extends HybridObject<{ android: 'kotlin' }> {
  /** Runs ML Kit pose detection synchronously on one camera frame. */
  detect(frame: Frame): PoseResult;
}
