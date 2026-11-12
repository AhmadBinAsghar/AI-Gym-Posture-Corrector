import {
  PostureEngine,
  isFacingCamera,
  TURN_SIDEWAYS_WARNING,
} from '../src/utils/postureEngine';
import { generateMockJoints } from '../src/utils/mockJoints';

const view = { width: 400, height: 800 };
const sliders = { kneeSlider: 170, backSlider: 10, elbowSlider: 160, elbowTuckSlider: 10, hipSlider: 180 };

/** Front view: shoulders and hips are a full body-width apart. */
const frontView = () => ({
  leftShoulder: { x: 120, y: 300 },
  rightShoulder: { x: 280, y: 300 },
  leftHip: { x: 160, y: 520 },
  rightHip: { x: 240, y: 520 },
  leftKnee: { x: 160, y: 680 },
  rightKnee: { x: 240, y: 680 },
  leftAnkle: { x: 160, y: 820 },
  rightAnkle: { x: 240, y: 820 },
  leftElbow: { x: 120, y: 400 },
  rightElbow: { x: 280, y: 400 },
  leftWrist: { x: 120, y: 500 },
  rightWrist: { x: 280, y: 500 },
});

describe('facing the camera', () => {
  test('detects a front view and not a side view', () => {
    expect(isFacingCamera(frontView())).toBe(true);
    expect(isFacingCamera(generateMockJoints('Deep Squats', sliders, view))).toBe(false);
    expect(isFacingCamera(generateMockJoints('Pushups', sliders, view))).toBe(false);
  });

  test('missing shoulders or hips is not "facing"', () => {
    expect(isFacingCamera({})).toBe(false);
    expect(isFacingCamera(null)).toBe(false);
    const { leftHip, ...noHip } = frontView();
    expect(leftHip).toBeDefined();
    expect(isFacingCamera(noHip)).toBe(false);
  });

  test('a squat from the front asks the user to turn instead of scoring', () => {
    let state;
    for (let i = 0; i < 20; i++) {
      const r = PostureEngine.evaluateSquat(frontView(), state, i * 100);
      expect(r.isTracking).toBe(false);
      expect(r.warning).toBe(TURN_SIDEWAYS_WARNING);
      expect(r.isRepCompleted).toBeFalsy();
      state = r.nextState;
    }
    expect(state.streak).toBe(0);
  });

  test('a pushup from the front asks the user to turn', () => {
    const r = PostureEngine.evaluatePushup(frontView(), undefined, 0);
    expect(r.isTracking).toBe(false);
    expect(r.warning).toBe(TURN_SIDEWAYS_WARNING);
  });

  test('turning sideways resumes tracking after the usual stable frames', () => {
    const side = generateMockJoints('Deep Squats', sliders, view);
    let state;
    let last;
    for (let i = 0; i < 10; i++) {
      last = PostureEngine.evaluateSquat(side, state, i * 100);
      state = last.nextState;
    }
    expect(last.isTracking).not.toBe(false);
  });

  test('curls are not blocked from the front (elbow angles are visible)', () => {
    const joints = generateMockJoints('Bicep Curls', sliders, view);
    let state;
    let last;
    for (let i = 0; i < 10; i++) {
      last = PostureEngine.evaluateBicepCurl(joints, state, i * 100);
      state = last.nextState;
    }
    expect(last.isTracking).not.toBe(false);
  });
});
