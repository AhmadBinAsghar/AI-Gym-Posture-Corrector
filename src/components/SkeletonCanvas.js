import React from 'react';
import { View } from 'react-native';
import { useSelector } from 'react-redux';

const GOOD = '#10B981';
const BAD = '#EF4444';

const BONES = [
  // Upper body
  ['leftShoulder', 'rightShoulder'],
  ['leftShoulder', 'leftElbow'],
  ['leftElbow', 'leftWrist'],
  ['rightShoulder', 'rightElbow'],
  ['rightElbow', 'rightWrist'],
  // Torso
  ['leftShoulder', 'leftHip'],
  ['rightShoulder', 'rightHip'],
  ['leftHip', 'rightHip'],
  // Lower body
  ['leftHip', 'leftKnee'],
  ['leftKnee', 'leftAnkle'],
  ['rightHip', 'rightKnee'],
  ['rightKnee', 'rightAnkle'],
  // Feet (the squat's heel check reddens these)
  ['leftAnkle', 'leftHeel'],
  ['leftHeel', 'leftFootIndex'],
  ['rightAnkle', 'rightHeel'],
  ['rightHeel', 'rightFootIndex'],
];

// Bone thickness. The rounded ends double as the joint markers, which is why there is no
// separate dot per joint (see the note below).
const BONE_HEIGHT = 6;

const isPlaced = joint => !!joint && !(joint.x === 0 && joint.y === 0);

/**
 * Skeleton overlay built from plain views. It used to be drawn with Skia, but on the
 * target phone the Skia surface never presented a frame (RNSkia: "updateAndRelease()
 * failed"), so the skeleton was invisible. Views have no GPU-surface dependency.
 *
 * width/height must be explicit: an absolute-fill style resolved to 0px high for native
 * views here.
 *
 * The joints are read straight from the store rather than passed down as a prop: they change
 * on every camera frame, and subscribing here means only this overlay re-draws per frame
 * instead of the whole camera screen. That keeps the skeleton glued to the body.
 *
 * ON VIEW COUNT: this component is rebuilt on every tracked frame, and on the target phone a
 * render costs roughly 1ms per view, measured with a React.Profiler. The camera can only hand
 * out a new pose every ~31ms, and detection and drawing share the JS thread, so the achievable
 * tracking rate is 1 / (detect + render): every view that is not essential directly slows the
 * lines down. That is why
 *   - the views are built inline instead of through <Bone>/<Joint> components (a component
 *     wrapper per bone added a React element, a memo comparison that can never help because
 *     the props change every frame, and a second element on top of that), and
 *   - the decorative glow layer, the joint ring/core pair and the standalone joint dots are
 *     gone. Dropping the 13 joint dots alone took the render from ~35ms to ~11ms and lifted
 *     tracking from ~17 to ~24 poses/second. The rounded bone ends still mark the joints.
 */
const SkeletonCanvas = ({ width, height }) => {
  const joints = useSelector(state => state.exercise.joints);
  if (!joints || !width || !height) return null;

  const bones = [];

  for (let i = 0; i < BONES.length; i += 1) {
    const from = BONES[i][0];
    const to = BONES[i][1];
    const a = joints[from];
    const b = joints[to];
    if (!isPlaced(a) || !isPlaced(b)) continue;
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const length = Math.sqrt(dx * dx + dy * dy);
    if (length < 1) continue;
    bones.push(
      <View
        key={`${from}-${to}`}
        style={{
          position: 'absolute',
          left: (a.x + b.x) / 2 - length / 2,
          top: (a.y + b.y) / 2 - BONE_HEIGHT / 2,
          width: length,
          height: BONE_HEIGHT,
          borderRadius: BONE_HEIGHT / 2,
          backgroundColor: a.correct !== false && b.correct !== false ? GOOD : BAD,
          transform: [{ rotate: `${(Math.atan2(dy, dx) * 180) / Math.PI}deg` }],
        }}
      />
    );
  }

  return (
    <View style={{ position: 'absolute', top: 0, left: 0, width, height }} pointerEvents="none">
      {bones}
    </View>
  );
};

// Memoised on width/height: HUD updates (reps, accuracy, ...) re-render the camera screen
// but leave the overlay alone. Its per-frame redraws come from the store subscription above.
export default React.memo(SkeletonCanvas);
