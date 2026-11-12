import React from 'react';
import { View, Text } from 'react-native';
import { useSelector } from 'react-redux';

/**
 * "Stand here" body outline drawn over the camera preview.
 *
 * ML Kit can only judge a lift if it can see the joints that lift needs -- the whole body
 * for squats, the arm and shoulder for curls, the lying body line for pushups -- but the
 * preview gave the user no idea how close to stand, so they backed away until they happened
 * to fit. This shows them where that is and turns green the moment the engine accepts the
 * pose (state.exercise.isTracking), which is the same signal the skeleton uses.
 *
 * Cost: isTracking is a boolean, so this re-renders only when the user enters or leaves the
 * tracked pose -- never once per frame -- and the outline itself is a handful of plain views.
 */

const TRACKED = '#10B981';
const WAITING = 'rgba(255,255,255,0.55)';

const HINTS = {
  'Bicep Curls': 'Stand so your arm fills the outline',
  Pushups: 'Lie down so your body fills the outline',
  'Deep Squats': 'Stand so the outline covers you',
};

const BodyGuide = ({ width, height, activeExercise }) => {
  const isTracking = useSelector(state => state.exercise.isTracking);
  if (!width || !height) return null;

  const color = isTracking ? TRACKED : WAITING;
  const outline = {
    position: 'absolute',
    borderWidth: 2,
    borderColor: color,
    backgroundColor: 'transparent',
  };
  const parts = [];
  let hintY = height * 0.7;

  if (activeExercise === 'Pushups') {
    // Lying down: a head at one end of a body bar sitting low in the frame.
    const t = height * 0.13;
    const top = height * 0.52;
    const left = width * 0.07;
    parts.push(<View key="head" style={[outline, { left, top, width: t, height: t, borderRadius: t / 2 }]} />);
    parts.push(
      <View
        key="body"
        style={[outline, { left: left + t * 0.85, top: top + t * 0.12, width: width * 0.7, height: t * 0.76, borderRadius: t * 0.38 }]}
      />
    );
    hintY = top + t + 12;
  } else {
    const upperOnly = activeExercise === 'Bicep Curls';
    const h = height * (upperOnly ? 0.42 : 0.56);
    const top = height * (upperOnly ? 0.2 : 0.19);
    const cx = width / 2;

    const headD = 0.13 * h;
    const torsoW = 0.27 * h;
    const torsoH = 0.3 * h;
    const armW = 0.085 * h;
    const armH = (upperOnly ? 0.44 : 0.34) * h;
    const legW = 0.105 * h;
    const legH = 0.38 * h;

    const torsoTop = top + headD + 0.025 * h;
    const armTop = torsoTop + 0.01 * h;

    parts.push(<View key="head" style={[outline, { left: cx - headD / 2, top, width: headD, height: headD, borderRadius: headD / 2 }]} />);
    parts.push(
      <View key="torso" style={[outline, { left: cx - torsoW / 2, top: torsoTop, width: torsoW, height: torsoH, borderRadius: torsoW * 0.3 }]} />
    );
    parts.push(
      <View key="armL" style={[outline, { left: cx - torsoW / 2 - armW + 0.03 * h, top: armTop, width: armW, height: armH, borderRadius: armW / 2 }]} />
    );
    parts.push(
      <View key="armR" style={[outline, { left: cx + torsoW / 2 - 0.03 * h, top: armTop, width: armW, height: armH, borderRadius: armW / 2 }]} />
    );

    let bottom = armTop + armH;
    if (!upperOnly) {
      const legTop = torsoTop + torsoH - 0.02 * h;
      parts.push(
        <View key="legL" style={[outline, { left: cx - legW - 0.012 * h, top: legTop, width: legW, height: legH, borderRadius: legW / 2 }]} />
      );
      parts.push(
        <View key="legR" style={[outline, { left: cx + 0.012 * h, top: legTop, width: legW, height: legH, borderRadius: legW / 2 }]} />
      );
      bottom = legTop + legH;
    }
    hintY = bottom + 12;
  }

  return (
    <View
      style={{ position: 'absolute', top: 0, left: 0, width, height, opacity: isTracking ? 0.45 : 1 }}
      pointerEvents="none"
    >
      {parts}
      {!isTracking && (
        <Text
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: hintY,
            textAlign: 'center',
            color: '#FFFFFF',
            fontSize: 13,
            fontWeight: '700',
            textShadowColor: 'rgba(0,0,0,0.9)',
            textShadowRadius: 4,
            textShadowOffset: { width: 0, height: 1 },
          }}
        >
          {HINTS[activeExercise] || HINTS['Deep Squats']}
        </Text>
      )}
    </View>
  );
};

export default React.memo(BodyGuide);
