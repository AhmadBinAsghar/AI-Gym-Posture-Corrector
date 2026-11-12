import { mapPoseToScreen, LANDMARK_NAMES } from '../src/utils/poseMapping';
import { createVoiceCoach } from '../src/utils/voiceFeedback';
import { PostureEngine } from '../src/utils/postureEngine';

const makePose = (overrides = {}, imageWidth = 480, imageHeight = 640) => {
  const landmarks = LANDMARK_NAMES.map(() => ({ x: 0, y: 0, confidence: 0 }));
  Object.entries(overrides).forEach(([name, lm]) => {
    landmarks[LANDMARK_NAMES.indexOf(name)] = { confidence: 0.9, ...lm };
  });
  return { imageWidth, imageHeight, landmarks };
};

describe('mapPoseToScreen', () => {
  test('returns null when nobody is detected', () => {
    expect(mapPoseToScreen(null, { width: 400, height: 800 })).toBeNull();
    expect(mapPoseToScreen({ imageWidth: 480, imageHeight: 640, landmarks: [] }, { width: 400, height: 800 })).toBeNull();
  });

  test('maps with cover scaling and centre crop', () => {
    // image 480x640 into 400x800 view: scale = max(400/480, 800/640) = 1.25, horizontal crop
    const pose = makePose({ leftShoulder: { x: 240, y: 320 } });
    const joints = mapPoseToScreen(pose, { width: 400, height: 800 });
    expect(joints.leftShoulder.x).toBeCloseTo(200); // image centre -> view centre
    expect(joints.leftShoulder.y).toBeCloseTo(400);
    expect(joints.leftShoulder.correct).toBe(true);
  });

  test('mirrors x when requested', () => {
    const pose = makePose({ leftShoulder: { x: 120, y: 320 } }, 480, 640);
    const normal = mapPoseToScreen(pose, { width: 480, height: 640 });
    const mirrored = mapPoseToScreen(pose, { width: 480, height: 640 }, { mirror: true });
    expect(normal.leftShoulder.x).toBeCloseTo(120);
    expect(mirrored.leftShoulder.x).toBeCloseTo(360);
  });

  test('drops low-confidence joints', () => {
    const pose = makePose({
      leftHip: { x: 100, y: 100 },
      leftKnee: { x: 100, y: 200, confidence: 0.1 },
    });
    const joints = mapPoseToScreen(pose, { width: 480, height: 640 });
    expect(joints.leftHip).toBeDefined();
    expect(joints.leftKnee).toBeUndefined();
  });
});

describe('mapPoseToScreen off-screen joints', () => {
  test('joints outside the visible area are dropped, even if ML Kit is confident', () => {
    const pose = makePose({
      leftHip: { x: 240, y: 320 },
      leftKnee: { x: 240, y: 900 }, // below the bottom of a 480x640 image
      leftAnkle: { x: -30, y: 300 }, // left of the picture
    });
    const joints = mapPoseToScreen(pose, { width: 480, height: 640 });
    expect(joints.leftHip).toBeDefined();
    expect(joints.leftKnee).toBeUndefined();
    expect(joints.leftAnkle).toBeUndefined();
  });

  test('returns null when every joint is off-screen', () => {
    const pose = makePose({ leftHip: { x: 900, y: 900 } });
    expect(mapPoseToScreen(pose, { width: 480, height: 640 })).toBeNull();
  });
});

describe('PostureEngine tracking', () => {
  test('missing joints are reported as not tracking', () => {
    const res = PostureEngine.evaluateSquat({ leftHip: { x: 1, y: 1 } }, { phase: 'UP' });
    expect(res.isTracking).toBe(false);
  });
});

describe('voice coach', () => {
  test('speaks new warnings, throttles repeats, then praises recovery', () => {
    const coach = createVoiceCoach({ repeatMs: 5000, minGapMs: 1500 });
    const bad = { isPostureCorrect: false, warning: 'Keep your back straight! 🧘' };
    const good = { isPostureCorrect: true, warning: '' };

    expect(coach.onPosture(bad, 0)).toBe('Keep your back straight!');
    expect(coach.onPosture(bad, 100)).toBeNull();
    expect(coach.onPosture(bad, 4000)).toBeNull();
    expect(coach.onPosture(bad, 5000)).toBe('Keep your back straight!');
    expect(coach.onPosture(good, 5200)).toBeNull(); // too soon after last cue
    expect(coach.onPosture(good, 7000)).toBe('Good form');
    expect(coach.onPosture(good, 9000)).toBeNull();
  });

  test('a different warning interrupts after the short gap', () => {
    const coach = createVoiceCoach();
    coach.onPosture({ isPostureCorrect: false, warning: 'Keep your back straight!' }, 0);
    expect(coach.onPosture({ isPostureCorrect: false, warning: 'Squatting too deep!' }, 2000)).toBe('Squatting too deep!');
  });

  test('announces reps', () => {
    expect(createVoiceCoach().onRep(3, 0)).toBe('3');
  });
});
