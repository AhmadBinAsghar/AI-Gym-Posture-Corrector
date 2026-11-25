import { PostureEngine, GUARDS } from '../src/utils/postureEngine';

const rad = d => (d * Math.PI) / 180;

/* ---------- realistic body generators (screen coords, y grows downward) ---------- */

// Side view, facing right. Ankle planted; `kneeDeg` is the interior knee angle
// (180 = standing, ~90 = deep squat); `backDeg` is forward lean of the trunk.
const squatPose = (kneeDeg, backDeg = 0) => {
  const ankle = { x: 200, y: 700 };
  const lean = rad((180 - kneeDeg) * 0.25); // shin tilts forward as the knee bends
  const knee = { x: ankle.x + 150 * Math.sin(lean), y: ankle.y - 150 * Math.cos(lean) };
  const ux = (ankle.x - knee.x) / 150;
  const uy = (ankle.y - knee.y) / 150;
  const k = rad(kneeDeg);
  const rotate = a => ({ x: ux * Math.cos(a) - uy * Math.sin(a), y: ux * Math.sin(a) + uy * Math.cos(a) });
  const [a, b] = [rotate(k), rotate(-k)];
  const dir = a.x < b.x ? a : b; // hip sits behind the knee
  const hip = { x: knee.x + 150 * dir.x, y: knee.y + 150 * dir.y };
  const shoulder = { x: hip.x + 180 * Math.sin(rad(backDeg)), y: hip.y - 180 * Math.cos(rad(backDeg)) };
  return { leftShoulder: shoulder, leftHip: hip, leftKnee: knee, leftAnkle: ankle };
};

// Arm hanging from the shoulder; `elbowDeg` 180 = straight, small = fully curled.
// `flareDeg` swings the upper arm away from the trunk.
const curlPose = (elbowDeg, flareDeg = 0) => {
  const shoulder = { x: 150, y: 100 };
  const elbow = {
    x: shoulder.x - 100 * Math.sin(rad(flareDeg)),
    y: shoulder.y + 100 * Math.cos(rad(flareDeg)),
  };
  const phi = rad(180 - elbowDeg);
  const wrist = { x: elbow.x + 100 * Math.sin(phi), y: elbow.y + 100 * Math.cos(phi) };
  return { leftShoulder: shoulder, leftElbow: elbow, leftWrist: wrist, leftHip: { x: 150, y: 280 } };
};

// Body roughly horizontal; `hipDrop` > 0 sags the hips, < 0 piks them.
const pushupPose = (elbowDeg, hipDrop = 0) => {
  const shoulder = { x: 100, y: 300 };
  const elbow = { x: 100, y: 380 };
  const phi = rad(180 - elbowDeg);
  const wrist = { x: elbow.x + 80 * Math.sin(phi), y: elbow.y + 80 * Math.cos(phi) };
  return {
    leftShoulder: shoulder,
    leftElbow: elbow,
    leftWrist: wrist,
    leftHip: { x: 250, y: 300 + hipDrop },
    leftKnee: { x: 400, y: 300 },
  };
};

/** Feeds `framesPerPose` frames per pose, `dt` ms apart, like a camera would. */
const run = (evaluate, poses, { framesPerPose = 4, dt = 100 } = {}) => {
  let state;
  let reps = 0;
  let tracked = 0;
  let t = 1000;
  let last;
  for (const pose of poses) {
    for (let i = 0; i < framesPerPose; i++) {
      last = evaluate(pose, state, t);
      state = last.nextState;
      if (last.isRepCompleted) reps++;
      if (last.isTracking !== false) tracked++;
      t += dt;
    }
  }
  return { reps, tracked, last };
};

const squat = (j, s, t) => PostureEngine.evaluateSquat(j, s, t);
const curl = (j, s, t) => PostureEngine.evaluateBicepCurl(j, s, t);
const pushup = (j, s, t) => PostureEngine.evaluatePushup(j, s, t);

// Deterministic pseudo-random numbers so the noise tests are repeatable.
const makeRandom = seed => {
  let s = seed;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
};

describe('calculateAngle', () => {
  test('computes right and straight angles', () => {
    expect(PostureEngine.calculateAngle({ x: 0, y: 100 }, { x: 0, y: 0 }, { x: 100, y: 0 })).toBe(90);
    expect(PostureEngine.calculateAngle({ x: 0, y: 100 }, { x: 0, y: 0 }, { x: 0, y: -100 })).toBe(180);
  });

  test('the squat generator really produces the knee angle it claims', () => {
    [175, 130, 95, 70].forEach(k => {
      const p = squatPose(k);
      expect(Math.abs(PostureEngine.calculateAngle(p.leftHip, p.leftKnee, p.leftAnkle) - k)).toBeLessThanOrEqual(1);
    });
  });
});

describe('squat form', () => {
  test('upright standing is correct and silent', () => {
    const { last } = run(squat, [squatPose(175)], { framesPerPose: 8 });
    expect(last.isTracking).not.toBe(false);
    expect(last.isPostureCorrect).toBe(true);
    expect(last.warning).toBe('');
  });

  test('leaning the back too far forward is flagged red on shoulder and hip', () => {
    const { last } = run(squat, [squatPose(170, 50)], { framesPerPose: 8 });
    expect(last.isPostureCorrect).toBe(false);
    expect(last.warning).toContain('Keep your back straight');
    expect(last.joints.leftShoulder.correct).toBe(false);
    expect(last.joints.leftHip.correct).toBe(false);
  });

  test('squatting too deep warns about the knees', () => {
    const { last } = run(squat, [squatPose(50)], { framesPerPose: 8 });
    expect(last.isPostureCorrect).toBe(false);
    expect(last.warning).toContain('too deep');
    expect(last.joints.leftKnee.correct).toBe(false);
  });

  // Side view facing right: the shin tips forward by `shinDeg` from vertical, the knee bends
  // to `kneeDeg`, the trunk stays upright. Feet flat unless `heelUp` (px the heel rises).
  const legPose = (shinDeg, kneeDeg, heelUp = 0) => {
    const ankle = { x: 200, y: 700 };
    const knee = { x: ankle.x + 150 * Math.sin(rad(shinDeg)), y: ankle.y - 150 * Math.cos(rad(shinDeg)) };
    const ux = (ankle.x - knee.x) / 150;
    const uy = (ankle.y - knee.y) / 150;
    const rot = a => ({ x: ux * Math.cos(a) - uy * Math.sin(a), y: ux * Math.sin(a) + uy * Math.cos(a) });
    const [a, b] = [rot(rad(kneeDeg)), rot(-rad(kneeDeg))];
    const dir = a.x < b.x ? a : b; // hip behind the knee
    const hip = { x: knee.x + 150 * dir.x, y: knee.y + 150 * dir.y };
    return {
      leftShoulder: { x: hip.x + 20, y: hip.y - 180 },
      leftHip: hip,
      leftKnee: knee,
      leftAnkle: ankle,
      leftHeel: { x: ankle.x - 20, y: ankle.y + 15 - heelUp },
      leftFootIndex: { x: ankle.x + 60, y: ankle.y + 20 },
    };
  };

  test('knees past the toes with heels down is fine (the live knee-forward squat, shin ~33 deg)', () => {
    const { last } = run(squat, [legPose(33, 95)], { framesPerPose: 8 });
    expect(last.isTracking).not.toBe(false);
    expect(last.warning).toBe('');
    expect(last.isPostureCorrect).toBe(true);
  });

  test('extreme forward knee travel is flagged on the knee', () => {
    const { last } = run(squat, [legPose(55, 100)], { framesPerPose: 8 });
    expect(last.warning).toContain('Knees too far forward');
    expect(last.joints.leftKnee.correct).toBe(false);
  });

  // Heel lift is not judged: live, flat-footed standing already read the heel up to 89% of a
  // foot length above the toes, so the landmark cannot tell a real lift from noise.
  test('a heel reading above the toes does not raise a warning (too noisy to judge)', () => {
    const { last } = run(squat, [legPose(30, 100, 50)], { framesPerPose: 8 });
    expect(last.warning).toBe('');
    expect(last.isPostureCorrect).toBe(true);
  });
});

describe('squat rep counting', () => {
  test('counts one rep per full down/up cycle', () => {
    const poses = [175, 140, 100, 90, 100, 140, 170, 175, 100, 90, 100, 170].map(k => squatPose(k));
    expect(run(squat, poses).reps).toBe(2);
  });

  test('half squats that never reach depth are not counted', () => {
    const poses = [175, 150, 130, 150, 175, 150, 130, 150, 175].map(k => squatPose(k));
    expect(run(squat, poses).reps).toBe(0);
  });

  test('a bad-form bottom position does not count as a rep', () => {
    const poses = [175, 100, 170].map(k => squatPose(k, 55));
    expect(run(squat, poses).reps).toBe(0);
  });

  test('a one-frame glitch into the down pose is ignored (debounce)', () => {
    const frames = [...Array(8).fill(squatPose(175)), squatPose(95), ...Array(8).fill(squatPose(175))];
    expect(run(squat, frames, { framesPerPose: 1 }).reps).toBe(0);
  });

  test('reps cannot complete faster than the minimum rep time', () => {
    // each pose held just long enough to confirm, 30 ms per frame
    const poses = [175, 175, 175, 175, 175, 95, 95, 95, 175, 175, 175, 95, 95, 95, 175, 175, 175].map(k => squatPose(k));
    const { reps } = run(squat, poses, { framesPerPose: 1, dt: 30 });
    expect(GUARDS.minRepMs).toBeGreaterThan(30 * 6);
    expect(reps).toBe(1);
  });
});

describe('bicep curl', () => {
  test('tucked elbow is correct; flared elbow is flagged', () => {
    expect(run(curl, [curlPose(170)], { framesPerPose: 8 }).last.isPostureCorrect).toBe(true);
    // The flare is judged only on a mostly straight arm (THRESHOLDS.curl.judgeFlareFrom). The
    // generator measures elbowDeg from vertical, so a 40 deg flare at 170 is a ~130 deg elbow.
    const flared = run(curl, [curlPose(170, 40)], { framesPerPose: 8 }).last;
    expect(flared.isPostureCorrect).toBe(false);
    expect(flared.warning).toContain('elbow tucked');
    expect(flared.joints.leftElbow.correct).toBe(false);
  });

  test('counts a rep from curled back to extended', () => {
    const poses = [170, 120, 40, 40, 120, 170].map(e => curlPose(e));
    expect(run(curl, poses).reps).toBe(1);
  });

  // The app seeds one shared rep state with a generic 'UP' (useCamera's postureStateRef) and
  // the squat and pushup both name their phases UP/DOWN, but the curl names them EXTENDED/
  // FLEXED. Matching the incoming name for equality left the curl stuck on that seeded 'UP',
  // so the counter never moved however well the form scored. This starts from the app's seed.
  test('counts reps when the shared rep state was seeded with the squat phase name', () => {
    let state = { phase: 'UP' };
    let reps = 0;
    let t = 1000;
    for (const pose of [170, 120, 40, 40, 120, 170].map(e => curlPose(e))) {
      for (let i = 0; i < 4; i++) {
        const result = curl(pose, state, t);
        state = result.nextState;
        if (result.isRepCompleted) reps++;
        t += 100;
      }
    }
    expect(reps).toBe(1);
  });

  test('a flared-elbow curl is not counted', () => {
    // Hangs flared first (as a real set starts), then curls: the top cannot be judged, but the
    // flare seen on the straight arm spoils the rep.
    const poses = [170, 170, 120, 40, 120, 170, 170, 120, 40, 120, 170].map(e => curlPose(e, 40));
    expect(run(curl, poses).reps).toBe(0);
  });

  // A curl is filmed from the front, so as the arm comes up the forearm swings towards the
  // camera and the length it projects onto the screen collapses -- to a couple of pixels at
  // the top of the rep. That used to be read as "not a body" ("Show your arm clearly" with
  // the skeleton blanking out), because the forearm was compared against the upper arm.
  // `projected` is the forearm's share of its true length on screen: 1 = hanging straight
  // down, 0 = pointing at the camera, below 0 = curled up past the shoulder line.
  const foreshortenedCurlPose = projected => {
    const shoulder = { x: 150, y: 120 };
    const elbow = { x: 150, y: 205 };
    return {
      leftShoulder: shoulder,
      leftElbow: elbow,
      leftWrist: { x: 150, y: elbow.y + 85 * projected },
      leftHip: { x: 150, y: 320 },
    };
  };

  test('a front-view curl stays tracked while the forearm foreshortens', () => {
    for (const projected of [1, 0.5, 0.05, -0.5, -0.9]) {
      expect(run(curl, [foreshortenedCurlPose(projected)], { framesPerPose: 8 }).last.isTracking).not.toBe(false);
    }
  });

  test('counts a front-view rep whose forearm collapses to a few pixels', () => {
    const poses = [1, 0.8, 0.3, 0.05, -0.2, -0.5, -0.5, -0.5, -0.2, 0.05, 0.3, 0.8, 1, 1, 1].map(foreshortenedCurlPose);
    expect(run(curl, poses, { framesPerPose: 1 }).reps).toBe(1);
  });

  // Captured live: in a front view ML Kit's elbow rides up from well below the shoulder to
  // level with it as the arm folds, so the elbow-to-trunk "tuck" angle reads 90+ deg on a
  // tucked arm and the elbow angle is meaningless. Only the wrist stays trustworthy.
  const frontViewTopOfCurl = {
    leftShoulder: { x: 150, y: 120 },
    leftElbow: { x: 215, y: 120 }, // level with the shoulder, ~the measured 69px upper arm
    leftWrist: { x: 170, y: 40 }, // high: above the shoulder
    leftHip: { x: 150, y: 320 },
  };
  const frontViewHanging = {
    leftShoulder: { x: 150, y: 120 },
    leftElbow: { x: 160, y: 189 },
    leftWrist: { x: 165, y: 300 },
    leftHip: { x: 150, y: 320 },
  };

  test('a front-view top of curl (elbow level with shoulder, wrist high) is tracked and not a fault', () => {
    const { last } = run(curl, [frontViewTopOfCurl], { framesPerPose: 8 });
    expect(last.isTracking).not.toBe(false);
    expect(last.isPostureCorrect).toBe(true);
    expect(last.warning).toBe('');
  });

  test('a sideways body or a straight arm raised to shoulder height is never a curl', () => {
    // Captured live while the phone was being set up: trunk lying ~horizontal, arm straight.
    const sideways = {
      leftShoulder: { x: 150, y: 373 },
      leftElbow: { x: 211, y: 383 },
      leftWrist: { x: 237, y: 383 },
      leftHip: { x: 260, y: 417 },
    };
    expect(run(curl, [sideways], { framesPerPose: 8 }).last.isTracking).toBe(false);
    // Upright trunk, but the arm lifted straight out sideways (a lateral raise).
    const straightRaise = { ...frontViewHanging, leftElbow: { x: 220, y: 130 }, leftWrist: { x: 300, y: 125 } };
    const poses = [frontViewHanging, straightRaise, frontViewHanging, straightRaise, frontViewHanging];
    expect(run(curl, poses, { framesPerPose: 6 }).reps).toBe(0);
  });

  // One real curl, logged on-device (S/E/W/H = shoulder/elbow/wrist/hip, screen px), every
  // logged frame stood for ~2 camera frames. At the top the elbow angle jittered 9-100 deg and
  // the wrist only rose to 0.21-0.42 of the trunk below the shoulder, and mid-lift the elbow
  // landmark drifted out (tuck 26-45 deg). The old thresholds never counted it.
  const capturedCurl = [
    [175, 239, 166, 395, 214, 501, 162, 516], [180, 241, 166, 407, 185, 529, 151, 539],
    [181, 244, 177, 398, 209, 517, 167, 539], [186, 254, 199, 400, 243, 506, 149, 573],
    [188, 252, 197, 413, 240, 510, 148, 559], [187, 248, 181, 409, 225, 543, 166, 556],
    [183, 240, 195, 374, 290, 396, 151, 522], [181, 246, 202, 383, 296, 445, 145, 521],
    [225, 249, 288, 350, 333, 331, 170, 491], [244, 224, 275, 330, 269, 279, 180, 466],
    [241, 227, 239, 340, 268, 329, 174, 465], [209, 221, 217, 314, 254, 287, 159, 459],
    [219, 225, 221, 322, 243, 307, 157, 463], [214, 224, 215, 324, 248, 276, 166, 461],
    [219, 222, 220, 327, 251, 322, 162, 450], [242, 211, 240, 327, 268, 332, 175, 440],
    [246, 223, 245, 321, 263, 291, 188, 453], [206, 233, 215, 348, 262, 312, 153, 467],
    [182, 239, 220, 365, 292, 327, 144, 475], [194, 243, 233, 363, 337, 348, 142, 486],
    [179, 242, 193, 372, 290, 383, 137, 493], [189, 239, 173, 391, 275, 463, 151, 509],
    [197, 249, 180, 403, 254, 503, 157, 527], [198, 248, 182, 405, 254, 470, 147, 529],
    [198, 237, 177, 393, 260, 462, 143, 507],
  ].map(([sx, sy, ex, ey, wx, wy, hx, hy]) => ({
    leftShoulder: { x: sx, y: sy },
    leftElbow: { x: ex, y: ey },
    leftWrist: { x: wx, y: wy },
    leftHip: { x: hx, y: hy },
  }));

  test('counts a real captured front-view curl exactly once', () => {
    expect(run(curl, capturedCurl, { framesPerPose: 2, dt: 40 }).reps).toBe(1);
  });

  // A brisk curl logged on-device: the top shows up in a single frame (elbow 41, wrist at
  // shoulder height) between 141 and 79 deg. The 3-frame confirmation used to drop it.
  const fastCurl = [
    [194, 120, 190, 200, 196, 300, 196, 340], // hanging
    [196, 121, 199, 196, 221, 280, 195, 340], // ~168 deg, starting up
    [196, 121, 214, 197, 191, 143, 195, 340], // top: ~10 deg, wrist at the shoulder
    [196, 121, 205, 200, 230, 205, 195, 340], // ~108 deg on the way down
    [194, 120, 190, 200, 196, 300, 196, 340], // hanging again
  ].map(([sx, sy, ex, ey, wx, wy, hx, hy]) => ({
    leftShoulder: { x: sx, y: sy },
    leftElbow: { x: ex, y: ey },
    leftWrist: { x: wx, y: wy },
    leftHip: { x: hx, y: hy },
  }));

  test('counts a brisk curl whose top lasts a single frame', () => {
    const frames = [...Array(8).fill(fastCurl[0]), fastCurl[1], fastCurl[2], fastCurl[3], ...Array(6).fill(fastCurl[4])];
    expect(run(curl, frames, { framesPerPose: 1, dt: 66 }).reps).toBe(1);
  });

  // Live: ML Kit put a hanging arm's wrist at the shoulder for a single frame, the frames on
  // both sides read the arm hanging straight, and that alone counted as a rep -- reps "even
  // though I didn't do one". A real fast curl is still on its way down on the next frame.
  test('a one-frame glitch to "fully curled" between hanging frames is not a rep', () => {
    const frames = [...Array(8).fill(fastCurl[0]), fastCurl[2], ...Array(8).fill(fastCurl[0])];
    expect(run(curl, frames, { framesPerPose: 1, dt: 66 }).reps).toBe(0);
  });

  test('repeated one-frame glitches never add up to reps', () => {
    const frames = [];
    for (let i = 0; i < 6; i++) frames.push(...Array(5).fill(fastCurl[0]), fastCurl[2]);
    frames.push(...Array(6).fill(fastCurl[0]));
    expect(run(curl, frames, { framesPerPose: 1, dt: 66 }).reps).toBe(0);
  });

  test('a single frame that is only half curled does not count', () => {
    const halfway = { ...fastCurl[3] }; // ~108 deg, wrist well below the shoulder
    const frames = [...Array(8).fill(fastCurl[0]), halfway, ...Array(6).fill(fastCurl[4])];
    expect(run(curl, frames, { framesPerPose: 1, dt: 66 }).reps).toBe(0);
  });

  const fromLog = rows =>
    rows.map(([sx, sy, ex, ey, wx, wy, hx, hy]) => ({
      leftShoulder: { x: sx, y: sy },
      leftElbow: { x: ex, y: ey },
      leftWrist: { x: wx, y: wy },
      leftHip: { x: hx, y: hy },
    }));

  // Logged on-device from a user sitting still: ML Kit hopped between the two arms nearly
  // every frame (note the shoulder alternating x~250 / x~185). One arm rested bent on the lap,
  // the other hung, so each hop read as a full curl -- this counted 6 reps with no movement.
  const seatedArmHopping = fromLog([
    [240, 320, 278, 409, 351, 363, 173, 513], [230, 316, 258, 420, 317, 416, 160, 519],
    [261, 326, 310, 422, 354, 377, 179, 515], [253, 325, 285, 422, 358, 367, 179, 525],
    [181, 324, 176, 479, 286, 491, 127, 548], [264, 328, 294, 425, 356, 369, 186, 521],
    [188, 324, 180, 483, 292, 493, 126, 559], [183, 329, 177, 497, 299, 503, 131, 566],
    [262, 328, 300, 425, 353, 378, 183, 522], [192, 329, 187, 496, 299, 498, 134, 559],
    [262, 330, 285, 434, 338, 404, 185, 527], [183, 326, 174, 490, 291, 496, 127, 559],
    [247, 322, 294, 421, 359, 367, 172, 521], [247, 322, 266, 412, 329, 391, 167, 521],
    [248, 321, 288, 424, 360, 378, 175, 528], [259, 325, 286, 421, 353, 373, 179, 526],
    [186, 326, 188, 497, 310, 510, 127, 557], [184, 331, 190, 499, 313, 504, 130, 569],
    [192, 337, 198, 501, 316, 502, 128, 564], [184, 325, 174, 483, 310, 509, 130, 561],
    [247, 322, 273, 422, 328, 394, 170, 522], [256, 327, 284, 421, 346, 379, 178, 525],
    [248, 322, 268, 422, 340, 393, 176, 521], [258, 333, 288, 428, 360, 382, 178, 537],
  ]);

  test('a seated user whose landmarks hop between arms gets no phantom reps', () => {
    expect(run(curl, seatedArmHopping, { framesPerPose: 2, dt: 100 }).reps).toBe(0);
  });

  // Logged on-device: standing side-on a few metres back (trunk ~150px). At the top of each
  // curl the elbow rides up beside the shoulder, leaving a 30-40px upper arm, and the old
  // trunk:upper-arm ratio rejected exactly those frames, so curls went uncounted.
  const sideOnTwoCurls = fromLog([
    [207, 116, 197, 190, 229, 221, 204, 269], [217, 120, 205, 197, 228, 230, 210, 266],
    [212, 119, 197, 195, 232, 218, 207, 269], [205, 117, 188, 195, 208, 243, 207, 270],
    [210, 117, 198, 193, 225, 227, 207, 268], [213, 115, 191, 190, 207, 232, 213, 260],
    [224, 118, 230, 175, 247, 168, 214, 251], [215, 111, 238, 132, 255, 127, 210, 258],
    [237, 109, 270, 120, 267, 64, 218, 253], [233, 110, 266, 149, 262, 90, 221, 250],
    [230, 106, 241, 171, 243, 190, 221, 249], [228, 108, 236, 172, 240, 194, 217, 251],
    [228, 107, 239, 163, 249, 183, 219, 258], [217, 110, 213, 180, 226, 239, 215, 263],
    [217, 109, 212, 179, 233, 232, 216, 261], [221, 107, 223, 168, 233, 221, 218, 261],
    [222, 109, 214, 180, 236, 233, 217, 262], [229, 100, 216, 159, 242, 186, 223, 255],
    [231, 101, 217, 170, 241, 208, 220, 260], [222, 111, 205, 182, 230, 247, 220, 265],
    [244, 104, 255, 128, 262, 83, 227, 257], [240, 116, 256, 148, 258, 128, 227, 265],
    [225, 113, 223, 193, 236, 204, 221, 259], [233, 124, 212, 206, 226, 252, 224, 267],
    [214, 116, 198, 192, 229, 215, 216, 261], [212, 117, 199, 195, 232, 229, 217, 271],
    [213, 112, 205, 189, 239, 227, 214, 268], [214, 111, 201, 177, 242, 171, 212, 271],
    [216, 114, 204, 197, 227, 263, 213, 273], [215, 116, 197, 199, 218, 268, 211, 274],
    [210, 116, 196, 195, 217, 264, 212, 278], [211, 116, 198, 201, 220, 269, 214, 280],
  ]);

  test('counts both side-on curls whose tops have a foreshortened upper arm', () => {
    expect(run(curl, sideOnTwoCurls, { framesPerPose: 2, dt: 100 }).reps).toBe(2);
  });

  // Both arms in view, facing the camera. `leftDeg`/`rightDeg` as in curlPose (180 = hanging).
  const twoArmPose = (leftDeg, rightDeg) => {
    const l = curlPose(leftDeg);
    const r = curlPose(rightDeg);
    const shift = p => ({ x: p.x + 160, y: p.y }); // right arm 160px across
    return {
      ...l,
      rightShoulder: shift(r.leftShoulder),
      rightElbow: shift(r.leftElbow),
      rightWrist: shift(r.leftWrist),
      rightHip: shift(r.leftHip),
    };
  };

  // Live: 10 right-arm curls then 5-6 left-arm curls showed 13 -- the engine stuck to the arm
  // it saw first, which kept hanging idle in view while the other one curled.
  test('counts curls with either arm while the other hangs idle in view', () => {
    const cycle = side => [170, 120, 40, 40, 120, 170].map(e => (side === 'right' ? twoArmPose(170, e) : twoArmPose(e, 170)));
    const poses = [...cycle('right'), ...cycle('right'), ...cycle('right'), ...cycle('left'), ...cycle('left')];
    expect(run(curl, poses).reps).toBe(5);
  });

  test('curling both arms together counts one rep per curl, not two', () => {
    const poses = [170, 120, 40, 40, 120, 170, 170, 120, 40, 40, 120, 170].map(e => twoArmPose(e, e));
    expect(run(curl, poses).reps).toBe(2);
  });

  // Side-on (shoulders nearly overlapping), ML Kit sometimes puts both labels on the one
  // curling arm, then snaps the 'right' label back onto the idle hanging arm while the real
  // arm is still up. Live this counted once on the way up and again on the way down.
  test('side-on: a curl seen by both labels, one snapping back early, counts once', () => {
    const sideOn = (leftDeg, rightDeg) => {
      const l = curlPose(leftDeg);
      const r = curlPose(rightDeg);
      const shift = p => ({ x: p.x + 20, y: p.y }); // side-on: shoulders 20px apart
      return {
        ...l,
        rightShoulder: shift(r.leftShoulder),
        rightElbow: shift(r.leftElbow),
        rightWrist: shift(r.leftWrist),
        rightHip: shift(r.leftHip),
      };
    };
    const poses = [
      sideOn(170, 170), sideOn(170, 170), sideOn(120, 170),
      sideOn(40, 40), sideOn(40, 40), // both labels on the curling arm
      sideOn(40, 170), sideOn(40, 170), sideOn(40, 170), // 'right' snaps back; real arm still up
      sideOn(120, 170), sideOn(170, 170), sideOn(170, 170), // real arm comes down
    ];
    expect(run(curl, poses).reps).toBe(1);
  });

  // Live, right-arm set side-on: the label that snapped away (and counted) then jumped BACK
  // onto the still-raised arm, looked like a fresh curl, and counted again on the way down.
  test('side-on: a label that snaps away and jumps back onto the raised arm counts once', () => {
    const sideOn = (leftDeg, rightDeg) => {
      const l = curlPose(leftDeg);
      const r = curlPose(rightDeg);
      const shift = p => ({ x: p.x + 20, y: p.y });
      return {
        ...l,
        rightShoulder: shift(r.leftShoulder),
        rightElbow: shift(r.leftElbow),
        rightWrist: shift(r.leftWrist),
        rightHip: shift(r.leftHip),
      };
    };
    const poses = [
      sideOn(170, 170), sideOn(170, 170), sideOn(170, 120),
      sideOn(40, 40), sideOn(40, 40), // both labels on the curling (right) arm
      sideOn(170, 40), sideOn(170, 40), // 'left' snaps back to the hanging arm -> counts
      sideOn(40, 40), sideOn(40, 40), // ...and jumps back onto the raised arm
      sideOn(170, 120), sideOn(170, 170), sideOn(170, 170), // arm comes down
    ];
    expect(run(curl, poses).reps).toBe(1);
  });

  test('alternating arms counts every curl', () => {
    const poses = [
      ...[170, 120, 40, 40, 120, 170].map(e => twoArmPose(e, 170)),
      ...[170, 120, 40, 40, 120, 170].map(e => twoArmPose(170, e)),
      ...[170, 120, 40, 40, 120, 170].map(e => twoArmPose(e, 170)),
    ];
    expect(run(curl, poses).reps).toBe(3);
  });

  test('a hanging tucked arm in the captured curl is not flagged', () => {
    const { last } = run(curl, capturedCurl.slice(0, 6), { framesPerPose: 2, dt: 40 });
    expect(last.isPostureCorrect).toBe(true);
  });

  test('counts front-view reps where the elbow rides up to the shoulder', () => {
    const poses = [frontViewHanging, frontViewTopOfCurl, frontViewHanging, frontViewTopOfCurl, frontViewHanging];
    expect(run(curl, poses, { framesPerPose: 6 }).reps).toBe(2);
  });
});

describe('pushup', () => {
  test('straight body is fine; sagging and piking hips get the right cue', () => {
    expect(run(pushup, [pushupPose(170, 0)], { framesPerPose: 8 }).last.isPostureCorrect).toBe(true);
    expect(run(pushup, [pushupPose(170, 90)], { framesPerPose: 8 }).last.warning).toContain('sag your hips');
    expect(run(pushup, [pushupPose(170, -90)], { framesPerPose: 8 }).last.warning).toContain('Hips too high');
  });

  test('counts a rep per full down/up cycle', () => {
    const poses = [170, 130, 90, 85, 130, 165, 170].map(e => pushupPose(e));
    expect(run(pushup, poses).reps).toBe(1);
  });

  // Live at ~5fps: four quick reps whose tops lasted 1-2 frames at only 140-150 were all
  // missed (the old rule wanted 155 for 3 frames). Elbow angles per frame, 200ms apart.
  test('counts fast reps whose top lasts only a couple of frames', () => {
    const start = [165, 165, 165, 165, 165, 165];
    const rep = [120, 90, 80, 85, 145, 148];
    const poses = [...start, ...rep, ...rep, ...rep, ...rep, 160, 160].map(e => pushupPose(e));
    expect(run(pushup, poses, { framesPerPose: 1, dt: 200 }).reps).toBe(4);
  });

  // Landmarks captured live (landscape, 960x540) at the bottom of a rep: the left forearm
  // collapsed to ~19px while the right arm stayed clean. This used to drop tracking.
  const P = (x, y) => ({ x, y, correct: true });
  const liveBottom = {
    leftShoulder: P(243, 178), leftElbow: P(307, 174), leftWrist: P(315, 191),
    leftHip: P(368, 180), leftKnee: P(463, 197), leftAnkle: P(562, 198),
    rightShoulder: P(227, 171), rightElbow: P(282, 160), rightWrist: P(280, 214),
    rightHip: P(360, 171), rightKnee: P(463, 196), rightAnkle: P(569, 200),
  };

  // Captured live: a visibly sagging body. The knees dropped with the hips, so shoulder-hip-
  // knee read 166 ("straight") and the old knee-based check called this correct posture.
  const liveSag = {
    leftShoulder: P(290, 7), leftElbow: P(302, 120), leftWrist: P(277, 204),
    leftHip: P(448, 157), leftKnee: P(521, 199), leftAnkle: P(695, 192),
    rightShoulder: P(269, 27), rightElbow: P(265, 177), rightWrist: P(206, 261),
    rightHip: P(446, 168), rightKnee: P(617, 215), rightAnkle: P(773, 184),
  };

  test('a sag is judged against the ankle, so dropped knees cannot hide it', () => {
    const r = run(pushup, [liveSag], { framesPerPose: 8 }).last;
    expect(r.warning).toContain('sag your hips');
    expect(r.joints.leftHip.correct).toBe(false);
  });

  test('falls back to the other side when one forearm collapses at the bottom', () => {
    const r = run(pushup, [liveBottom], { framesPerPose: 8 });
    expect(r.last.isTracking).not.toBe(false);
    expect(r.last.warning).toBe('');
  });

  test('a tracked body survives a few junk frames without re-earning the streak', () => {
    let state;
    for (let i = 0; i < 8; i++) state = pushup(pushupPose(170), state, 1000 + i * 100).nextState;
    const junk = { leftShoulder: P(100, 300) }; // nothing plausible
    for (let i = 0; i < GUARDS.maxMisses; i++) {
      const r = pushup(junk, state, 2000 + i * 100);
      expect(r.warning).toBe(''); // no "Position for pushup" flash
      state = r.nextState;
    }
    // The very next good frame is scored straight away.
    expect(pushup(pushupPose(170), state, 3000).isTracking).not.toBe(false);
    // But a body that stays gone is dropped.
    for (let i = 0; i <= GUARDS.maxMisses; i++) state = pushup(junk, state, 4000 + i * 100).nextState;
    expect(pushup(junk, state, 5000).warning).toBe('Position for pushup');
  });
});

describe('noise rejection (the phantom-rep bug)', () => {
  const noisy = (random, names, spread = 360) =>
    Object.fromEntries(
      names.map(n => [n, { x: 180 + (random() - 0.5) * spread, y: 380 + (random() - 0.5) * spread, correct: true }])
    );

  const frames = (build, count = 300) => {
    const random = makeRandom(7);
    return Array.from({ length: count }, () => build(random));
  };

  test.each([
    ['squat', squat, ['leftShoulder', 'leftHip', 'leftKnee', 'leftAnkle']],
    ['curl', curl, ['leftShoulder', 'leftElbow', 'leftWrist', 'leftHip']],
    ['pushup', pushup, ['leftShoulder', 'leftElbow', 'leftWrist', 'leftHip', 'leftKnee']],
  ])('%s: scattered, guessed joints never produce reps or scores', (_name, evaluate, names) => {
    const poses = frames(random => noisy(random, names));
    const { reps, tracked } = run(evaluate, poses, { framesPerPose: 1 });
    expect(reps).toBe(0);
    expect(tracked).toBeLessThanOrEqual(3); // essentially nothing is scored
  });

  test('a person standing still with shaky landmarks gets no reps', () => {
    const random = makeRandom(11);
    const base = squatPose(175);
    const poses = Array.from({ length: 300 }, () =>
      Object.fromEntries(
        Object.entries(base).map(([n, p]) => [n, { x: p.x + (random() - 0.5) * 30, y: p.y + (random() - 0.5) * 30, correct: true }])
      )
    );
    expect(run(squat, poses, { framesPerPose: 1 }).reps).toBe(0);
  });

  test('a lying-down / upside-down body is rejected for squats', () => {
    const p = squatPose(175);
    const upsideDown = { ...p, leftShoulder: { ...p.leftHip, y: p.leftHip.y + 180 } };
    expect(run(squat, [upsideDown], { framesPerPose: 10 }).tracked).toBe(0);
  });

  test('a vertical body is rejected for pushups', () => {
    const standing = {
      leftShoulder: { x: 150, y: 100 },
      leftElbow: { x: 150, y: 190 },
      leftWrist: { x: 150, y: 280 },
      leftHip: { x: 150, y: 280 },
      leftKnee: { x: 150, y: 430 },
    };
    expect(run(pushup, [standing], { framesPerPose: 10 }).tracked).toBe(0);
  });

  test('a body must look plausible for several frames before it is scored', () => {
    let state;
    const flags = [];
    for (let i = 0; i < GUARDS.stableFrames + 1; i++) {
      const r = squat(squatPose(175), state, 1000 + i * 100);
      state = r.nextState;
      flags.push(r.isTracking !== false);
    }
    expect(flags.slice(0, GUARDS.stableFrames - 1).every(f => f === false)).toBe(true);
    expect(flags[GUARDS.stableFrames - 1]).toBe(true);
  });

  test('losing the body resets the stability streak', () => {
    let state;
    for (let i = 0; i < 10; i++) state = squat(squatPose(175), state, i * 100).nextState;
    state = squat({}, state, 2000).nextState; // nobody in view
    expect(squat(squatPose(175), state, 2100).isTracking).toBe(false);
  });
});
