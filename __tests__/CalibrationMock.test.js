import { generateMockJoints } from '../src/utils/mockJoints';
import { PostureEngine, GUARDS } from '../src/utils/postureEngine';

const VIEW = { width: 360, height: 772 };
const base = { kneeSlider: 170, backSlider: 10, elbowSlider: 150, elbowTuckSlider: 10, hipSlider: 180 };
// The calibration panel starts its rep state already "stable" (see useCamera).
const seeded = () => ({ phase: 'UP', streak: GUARDS.stableFrames });
const range = (from, to, step) => Array.from({ length: Math.floor((to - from) / step) + 1 }, (_, i) => from + i * step);

const squat = over => PostureEngine.evaluateSquat(generateMockJoints('Deep Squats', { ...base, ...over }, VIEW), seeded(), 1000);
const curl = over => PostureEngine.evaluateBicepCurl(generateMockJoints('Bicep Curls', { ...base, ...over }, VIEW), seeded(), 1000);
const pushup = over => PostureEngine.evaluatePushup(generateMockJoints('Pushups', { ...base, ...over }, VIEW), seeded(), 1000);

// Names of the joints the engine flagged red, so we can prove the red lines land on
// the part the user actually got wrong (and nowhere else).
const redJoints = r =>
  Object.entries(r.joints)
    .filter(([, j]) => j && j.correct === false)
    .map(([name]) => name)
    .sort();

describe('calibration sliders drive the engine across their whole range', () => {
  test('squat: every knee/back slider combination is tracked', () => {
    for (const kneeSlider of range(30, 180, 15)) {
      for (const backSlider of range(0, 60, 5)) {
        expect(squat({ kneeSlider, backSlider }).isTracking).not.toBe(false);
      }
    }
  });

  test('squat: straight back is green, leaning past the limit turns red', () => {
    expect(squat({ backSlider: 10 }).isPostureCorrect).toBe(true);
    const leaning = squat({ backSlider: 45 });
    expect(leaning.isPostureCorrect).toBe(false);
    expect(leaning.warning).toContain('back straight');
  });

  test('squat: a back-lean only reddens the shoulders and hips, not the knees', () => {
    expect(redJoints(squat({ backSlider: 45 }))).toEqual([
      'leftHip',
      'leftShoulder',
      'rightHip',
      'rightShoulder',
    ]);
  });

  // The rule is kneeAngle < 60; the slider must be able to reach that zone.
  test('squat: the whole knee range is reachable and 60 is the too-deep boundary', () => {
    expect(squat({ kneeSlider: 65 }).isPostureCorrect).toBe(true); // just above the limit
    const deep = squat({ kneeSlider: 50 });
    expect(deep.isPostureCorrect).toBe(false);
    expect(deep.warning).toContain('too deep');
  });

  test('squat: a too-deep knee reddens only the knees, not the back', () => {
    expect(redJoints(squat({ kneeSlider: 50 }))).toEqual(['leftKnee', 'rightKnee']);
  });

  test('curl: every elbow/tuck slider combination is tracked', () => {
    for (const elbowSlider of range(30, 170, 20)) {
      for (const elbowTuckSlider of range(0, 45, 5)) {
        expect(curl({ elbowSlider, elbowTuckSlider }).isTracking).not.toBe(false);
      }
    }
  });

  test('curl: tucked elbow is green, flared elbow turns red', () => {
    expect(curl({ elbowTuckSlider: 10 }).isPostureCorrect).toBe(true);
    expect(curl({ elbowTuckSlider: 40 }).warning).toContain('elbow tucked');
  });

  test('curl: a flared elbow reddens only the elbows', () => {
    expect(redJoints(curl({ elbowTuckSlider: 40 }))).toEqual(['leftElbow', 'rightElbow']);
  });

  test('pushup: every hip slider position is tracked', () => {
    for (const hipSlider of range(140, 220, 10)) {
      expect(pushup({ hipSlider }).isTracking).not.toBe(false);
    }
  });

  test('pushup: straight is green; sagging and piking get their own cue', () => {
    expect(pushup({ hipSlider: 180 }).isPostureCorrect).toBe(true);
    expect(pushup({ hipSlider: 140 }).warning).toContain('sag your hips');
    expect(pushup({ hipSlider: 220 }).warning).toContain('Hips too high');
  });

  test('pushup: sagging or piking reddens only the hips', () => {
    expect(redJoints(pushup({ hipSlider: 140 }))).toEqual(['leftHip', 'rightHip']);
    expect(redJoints(pushup({ hipSlider: 220 }))).toEqual(['leftHip', 'rightHip']);
  });
});
