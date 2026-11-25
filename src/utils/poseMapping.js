/**
 * Converts raw ML Kit pose output (pixels of the upright camera image) into
 * on-screen joint coordinates that the PostureEngine and SkeletonCanvas use.
 */

// ML Kit landmark order (index -> name). Must match the native module.
export const LANDMARK_NAMES = [
  'nose', 'leftEyeInner', 'leftEye', 'leftEyeOuter', 'rightEyeInner', 'rightEye',
  'rightEyeOuter', 'leftEar', 'rightEar', 'mouthLeft', 'mouthRight',
  'leftShoulder', 'rightShoulder', 'leftElbow', 'rightElbow', 'leftWrist',
  'rightWrist', 'leftPinky', 'rightPinky', 'leftIndex', 'rightIndex',
  'leftThumb', 'rightThumb', 'leftHip', 'rightHip', 'leftKnee', 'rightKnee',
  'leftAnkle', 'rightAnkle', 'leftHeel', 'rightHeel', 'leftFootIndex',
  'rightFootIndex',
];

// Only the joints the app draws / evaluates.
export const TRACKED_JOINTS = [
  'nose',
  'leftShoulder', 'rightShoulder',
  'leftElbow', 'rightElbow',
  'leftWrist', 'rightWrist',
  'leftHip', 'rightHip',
  'leftKnee', 'rightKnee',
  'leftAnkle', 'rightAnkle',
  // The squat's heel-lift check needs the foot.
  'leftHeel', 'rightHeel',
  'leftFootIndex', 'rightFootIndex',
];

export const MIN_CONFIDENCE = 0.5;

/**
 * @param {{imageWidth:number,imageHeight:number,landmarks:Array<{x:number,y:number,confidence:number}>}} pose
 * @param {{width:number,height:number}} view   size of the camera preview on screen
 * @param {{mirror?:boolean,minConfidence?:number}} [opts]
 * @returns {Object|null} joints keyed by name ({x,y,correct}); low-confidence joints are omitted.
 *                        null when no person was detected.
 */
export const mapPoseToScreen = (pose, view, opts = {}) => {
  const { mirror = false, minConfidence = MIN_CONFIDENCE } = opts;
  if (!pose || !pose.landmarks || pose.landmarks.length === 0) return null;
  const { imageWidth, imageHeight, landmarks } = pose;
  if (!imageWidth || !imageHeight || !view.width || !view.height) return null;

  // The Camera preview uses resizeMode="cover": uniform scale, centre-cropped.
  const scale = Math.max(view.width / imageWidth, view.height / imageHeight);
  const offsetX = (view.width - imageWidth * scale) / 2;
  const offsetY = (view.height - imageHeight * scale) / 2;

  const joints = {};
  for (const name of TRACKED_JOINTS) {
    const lm = landmarks[LANDMARK_NAMES.indexOf(name)];
    if (!lm || lm.confidence < minConfidence) continue;
    const ux = mirror ? imageWidth - lm.x : lm.x;
    const x = ux * scale + offsetX;
    const y = lm.y * scale + offsetY;
    // ML Kit still reports joints it guesses outside the picture (a leg below the
    // frame, say); a joint we cannot see must not be evaluated.
    if (x < 0 || x > view.width || y < 0 || y > view.height) continue;
    joints[name] = { x, y, correct: true };
  }
  return Object.keys(joints).length > 0 ? joints : null;
};
