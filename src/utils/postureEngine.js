/**
 * Core Intelligent Posture Evaluation Engine (IPEE)
 * Calculates angles between body vectors and checks posture form rules.
 */

/** Single source of truth for every angle limit (degrees); the calibration UI reads these too. */
export const THRESHOLDS = {
  squat: { backMax: 35, kneeTooDeep: 60, downAt: 105, upAt: 160 },
  // handAtShoulder / handAtHip are ratios, not degrees: how far the wrist hangs below the
  // shoulder as a fraction of the trunk. See evaluateBicepCurl for why the curl needs them.
  // Tuned on a live front-view capture: the top of a real curl read elbow 30-70 deg (noisy,
  // spiking to 80-100) and wrist drop 0.21-0.42; a hanging arm read 150-167 deg and 0.78-0.96.
  // judgeFlareFrom: the flare is only judged with the arm this straight -- the elbow landmark
  // wanders outward once the forearm comes up towards the camera.
  curl: { tuckMax: 25, flexedAt: 70, extendedAt: 145, handAtShoulder: 0.35, handAtHip: 0.6, judgeFlareFrom: 120, surelyFlexedAt: 50 },
  pushup: { hipMin: 150, downAt: 100, upAt: 155 },
};

/**
 * Guards against ML Kit's guesses: it reports plausible-looking landmarks even when only
 * part of a body (or nobody) is in view, and those jitter. Without these guards the rep
 * counter fired on noise.
 */
export const GUARDS = {
  stableFrames: 5, // a plausible body must be seen this many frames in a row before scoring
  confirmFrames: 3, // a phase change must hold this many consecutive frames
  minRepMs: 700, // no rep can complete sooner than this after the previous one
  minSegmentPx: 20, // shorter limb segments are landmark noise, not a body
  maxLimbRatio: 2.5, // thigh:shin and upper-arm:forearm lengths must be similar
  maxTorsoRatio: 3.5, // torso vs limb length must be human-like
  facingRatio: 0.65, // shoulder width / torso height above this = facing the camera (side view is ~0.1-0.4)
  // Shoulder or hip moving more than this share of the trunk between two frames is a
  // different arm, not motion. Live: real motion peaked at ~0.17; ML Kit hopping between the
  // two arms of a seated user jumped 0.27-0.37 (and counted 6 phantom curls).
  maxJumpRatio: 0.25,};

const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

/** Both are real lengths and neither is more than `max` times the other. */
const similarLength = (a, b, max) =>
  a >= GUARDS.minSegmentPx && b >= GUARDS.minSegmentPx && a / b <= max && b / a <= max;

export const TURN_SIDEWAYS_WARNING = 'Turn sideways so I can check your form';

/**
 * True when the user faces (or backs onto) the camera: the two shoulders are far apart
 * compared with the torso height. From the side they nearly overlap. Squat depth, back
 * lean and pushup sag cannot be judged from the front, so those exercises ask the user
 * to turn instead of scoring a misleading angle.
 */
export const isFacingCamera = joints => {
  const { leftShoulder: ls, rightShoulder: rs, leftHip: lh, rightHip: rh } = joints || {};
  if (!ls || !rs || !lh || !rh) return false;
  const width = dist(ls, rs);
  const torso = dist(
    { x: (ls.x + rs.x) / 2, y: (ls.y + rs.y) / 2 },
    { x: (lh.x + rh.x) / 2, y: (lh.y + rh.y) / 2 }
  );
  return torso >= GUARDS.minSegmentPx && width / torso > GUARDS.facingRatio;
};

const turnSideways = (joints, prevState) => ({
  joints,
  isPostureCorrect: true,
  isTracking: false,
  warning: TURN_SIDEWAYS_WARNING,
  nextState: { ...prevState, pending: null, streak: 0 },
});

/**
 * Where the ankle would sit if the shin hung straight down from the knee. Used only when
 * ML Kit loses the foot: standing close enough for the whole body to fill the frame puts
 * the feet at -- or just past -- the bottom edge, and the landmark is dropped there.
 */
const shinFoot = (hip, knee) => ({
  x: knee.x,
  y: knee.y + Math.max(dist(hip, knee), GUARDS.minSegmentPx),
});

const isPlausibleSquat = (shoulder, hip, knee, ankle) =>
  similarLength(dist(hip, knee), dist(knee, ankle), GUARDS.maxLimbRatio) &&
  similarLength(dist(shoulder, hip), dist(hip, knee), GUARDS.maxTorsoRatio) &&
  shoulder.y < hip.y && // head end up
  ankle.y > hip.y; // feet below the hips (the knee can drop below the ankle line when very deep)

/**
 * A curl is judged from the front, so the forearm swings towards the camera and the length
 * it projects onto the screen shrinks right through the rep -- measured off a real arm it
 * fell from ~90px to ~20px at the top of the curl, and ML Kit sometimes drops the wrist
 * landmark next to the elbow altogether. Comparing forearm to upper arm therefore threw
 * away perfectly good reps ("Show your arm clearly", skeleton blinking out mid-curl), so
 * the forearm is no longer part of the test.
 *
 * The upper arm can't be held to a trunk ratio either: filmed side-on from a few metres, the
 * trunk measured ~150px while ML Kit's elbow rode up beside the shoulder at the top of the
 * curl, leaving a 30-40px upper arm -- so the top of every rep was thrown out as "not a
 * body". It only has to be a real segment no longer than the trunk. Noise is mostly caught
 * by the upright-trunk test below and by the arm-continuity check in evaluateBicepCurl.
 */
const isPlausibleCurl = (shoulder, elbow, hip) =>
  dist(shoulder, hip) >= 2 * GUARDS.minSegmentPx &&
  dist(shoulder, elbow) >= GUARDS.minSegmentPx / 2 &&
  dist(shoulder, elbow) <= dist(shoulder, hip) * 1.2 &&
  // From the front, ML Kit's elbow rides up to shoulder level at the top of the curl, so
  // "level with the shoulder" must still pass; a head landmark sits well above it.
  elbow.y > shoulder.y - GUARDS.minSegmentPx &&
  // A curl is done standing: the trunk is closer to vertical than horizontal. Captured live,
  // a sideways "body" (trunk 110px across, 44px down) was otherwise accepted and scored.
  hip.y - shoulder.y > Math.abs(hip.x - shoulder.x);

const isPlausiblePushup = (shoulder, hip, knee, elbow, wrist) =>
  similarLength(dist(shoulder, elbow), dist(elbow, wrist), GUARDS.maxLimbRatio) &&
  similarLength(dist(shoulder, hip), dist(hip, knee), GUARDS.maxTorsoRatio) &&
  // body line must be closer to horizontal than vertical
  Math.abs(shoulder.x - knee.x) > 1.2 * Math.abs(shoulder.y - knee.y);

/**
 * Debounced rep state machine. A change from 'up' to 'down' (or back) is accepted only
 * after GUARDS.confirmFrames consecutive frames agree, and a completed rep is only
 * counted if at least GUARDS.minRepMs passed since the previous one.
 */
const advancePhase = (prevState, { upPhase, downPhase, inDown, inUp, downSure = false }, now) => {
  // Anything that is not the down phase counts as the up phase. The rep state carried between
  // frames is seeded generically (useCamera starts it at 'UP'), and the squat and pushup both
  // happen to name their phases UP/DOWN -- but a curl names them EXTENDED/FLEXED. Matching the
  // incoming name for equality meant a curl could never leave that seeded 'UP': `target` stayed
  // null on every frame, so `isRepCompleted` was never true and the counter sat at zero.
  const phase = prevState?.phase === downPhase ? downPhase : upPhase;
  const lastRepAt = prevState?.lastRepAt ?? -Infinity;
  const pending = prevState?.pending;

  let target = null;
  if (phase === upPhase && inDown) target = downPhase;
  else if (phase === downPhase && inUp) target = upPhase;

  if (!target) return { phase, lastRepAt, pending: null, isRepCompleted: false };

  const count = (pending && pending.to === target ? pending.count : 0) + 1;
  // `downSure`: the caller has independent evidence the down position is real (see the
  // curl), so a quick rep whose bottom lasts only a frame or two is not thrown away.
  const sure = target === downPhase && downSure;
  if (!sure && count < GUARDS.confirmFrames) {
    return { phase, lastRepAt, pending: { to: target, count }, isRepCompleted: false };
  }
  const completesRep = target === upPhase && now - lastRepAt >= GUARDS.minRepMs;
  return {
    phase: target,
    lastRepAt: completesRep ? now : lastRepAt,
    pending: null,
    isRepCompleted: completesRep,
  };
};

export const PostureEngine = {
  /**
   * Calculates the angle in degrees between three points (A, B, C) where B is the vertex/joint.
   */
  calculateAngle(a, b, c) {
    if (!a || !b || !c) return 180;
    
    // Vector BA
    const ba = { x: a.x - b.x, y: a.y - b.y };
    // Vector BC
    const bc = { x: c.x - b.x, y: c.y - b.y };

    const dotProduct = ba.x * bc.x + ba.y * bc.y;
    const magBA = Math.sqrt(ba.x * ba.x + ba.y * ba.y);
    const magBC = Math.sqrt(bc.x * bc.x + bc.y * bc.y);

    if (magBA === 0 || magBC === 0) return 0;

    const cosTheta = dotProduct / (magBA * magBC);
    // Clamp cosTheta to avoid NaN in acos due to floating point inaccuracies
    const cosThetaClamped = Math.max(-1, Math.min(1, cosTheta));
    
    const angleRad = Math.acos(cosThetaClamped);
    return Math.round(angleRad * (180 / Math.PI));
  },

  /**
   * Evaluates Deep Squats
   * Targets: knee bend to <= 105 deg without going below 60 deg, back lean vs vertical <= 35 deg.
   */
  evaluateSquat(joints, prevState, now = Date.now()) {
    if (isFacingCamera(joints)) return turnSideways(joints, prevState);

    // The squat is judged from the shoulder-hip-knee chain, so only those are required. The
    // ankle is the joint ML Kit loses first -- stand close enough for the whole body to fill
    // the frame and the feet sit at, or just past, the bottom edge, where the landmark is
    // dropped. Instead of rejecting the pose over a missing foot, stand in for it with where
    // a vertical shin would put it, which keeps the knee angle (and so the rep count) usable.
    const leftSideVisible = joints.leftShoulder && joints.leftHip && joints.leftKnee;
    const rightSideVisible = joints.rightShoulder && joints.rightHip && joints.rightKnee;

    const shoulder = leftSideVisible ? joints.leftShoulder : joints.rightShoulder;
    const hip = leftSideVisible ? joints.leftHip : joints.rightHip;
    const knee = leftSideVisible ? joints.leftKnee : joints.rightKnee;
    const ankle = leftSideVisible ? joints.leftAnkle : joints.rightAnkle;
    const foot = ankle || (hip && knee ? shinFoot(hip, knee) : null);

    if (!shoulder || !hip || !knee || !foot || !isPlausibleSquat(shoulder, hip, knee, foot)) {
      return { joints, isPostureCorrect: true, isTracking: false, warning: 'Position yourself clearly in frame', nextState: { ...prevState, pending: null, streak: 0 } };
    }

    // A real body stays plausible; noise rarely does for several frames in a row.
    const streak = (prevState?.streak || 0) + 1;
    if (streak < GUARDS.stableFrames) {
      return { joints, isPostureCorrect: true, isTracking: false, warning: '', nextState: { ...prevState, pending: null, streak } };
    }

    // 1. Calculate main joints
    const kneeAngle = this.calculateAngle(hip, knee, foot);
    
    // Back lean angle (relative to the vertical line through the hip)
    const hipVertical = { x: hip.x, y: hip.y - 100 };
    const backAngle = this.calculateAngle(shoulder, hip, hipVertical);

    let isPostureCorrect = true;
    let warning = '';
    
    const checkedJoints = JSON.parse(JSON.stringify(joints));
    
    // Back check: if back bends too far forward (> 35 deg)
    if (backAngle > THRESHOLDS.squat.backMax) {
      isPostureCorrect = false;
      warning = 'Keep your back straight! 🧘';
      if (leftSideVisible) {
        checkedJoints.leftShoulder.correct = false;
        checkedJoints.leftHip.correct = false;
      }
      if (rightSideVisible) {
        checkedJoints.rightShoulder.correct = false;
        checkedJoints.rightHip.correct = false;
      }
    }

    // Knee depth check
    if (kneeAngle < THRESHOLDS.squat.kneeTooDeep) {
      isPostureCorrect = false;
      warning = 'Squatting too deep! Protect knees. ⚠️';
      if (leftSideVisible) checkedJoints.leftKnee.correct = false;
      if (rightSideVisible) checkedJoints.rightKnee.correct = false;
    }

    // Repetition state tracking
    const { isRepCompleted, ...nextState } = advancePhase(
      prevState,
      {
        upPhase: 'UP',
        downPhase: 'DOWN',
        inDown: kneeAngle <= THRESHOLDS.squat.downAt && isPostureCorrect,
        inUp: kneeAngle >= THRESHOLDS.squat.upAt,
      },
      now
    );

    return { joints: checkedJoints, isPostureCorrect, warning, isRepCompleted, nextState: { ...nextState, streak } };
  },

  /**
   * Evaluates Bicep Curls
   * Rule: Elbow acts as a pivot, shoulder remains stationary (tucked to trunk).
   */
  evaluateBicepCurl(joints, prevState, now = Date.now()) {
    const complete = s =>
      joints[`${s}Shoulder`] && joints[`${s}Elbow`] && joints[`${s}Wrist`] && joints[`${s}Hip`];
    // Each arm is followed on its own, with its own rep state. Following a single arm (the
    // first one seen) ignored the other entirely: live, 10 right-arm curls then 5-6 left-arm
    // curls showed 13, because the idle right arm stayed in view and kept being watched.
    const arms = {};
    let anyPlausible = false;
    let anyTracked = false;
    const flaredSides = [];
    let counted = false;
    let countedSide = null;
    let lastRepAt = prevState?.lastRepAt ?? -Infinity;
    // A seed without per-arm state (the calibration preview starts "already stable" with a
    // top-level streak) applies to both arms.
    const seed = prevState?.streak ? { streak: prevState.streak } : undefined;
    for (const side of ['left', 'right']) {
      const prevArm = prevState?.arms?.[side] ?? seed;
      const arm = complete(side)
        ? evaluateCurlArm(
            {
              shoulder: joints[`${side}Shoulder`],
              elbow: joints[`${side}Elbow`],
              wrist: joints[`${side}Wrist`],
              hip: joints[`${side}Hip`],
            },
            prevArm,
            now
          )
        : { plausible: false, tracked: false, next: { ...prevArm, pending: null, streak: 0 } };
      arms[side] = arm.next;
      anyPlausible = anyPlausible || arm.plausible;
      anyTracked = anyTracked || arm.tracked;
      if (arm.flared) flaredSides.push(side);
      // Both arms curled together finish within a moment of each other: that is one rep,
      // so a rep only counts GUARDS.minRepMs after the last one counted from either arm.
      if (arm.isRepCompleted && !prevArm?.consumed && now - lastRepAt >= GUARDS.minRepMs) {
        counted = true;
        countedSide = side;
        lastRepAt = now;
      }
    }
    // One physical curl counts once. Side-on, ML Kit sometimes puts BOTH labels on the one
    // arm being curled (live: left and right wrists 1-17px apart, both "curled"). Each label
    // then finished its own curl: the right one when it snapped back onto the idle hanging arm
    // while the real arm was still up ("goes up, counts one"), the left one when the arm
    // actually came down ("comes down, counts another"), 1.7s apart. So when a rep counts, a
    // curl the other label has in progress is that same movement: it is marked `consumed`
    // and finishes without counting again. (Simply resetting it is not enough -- the real arm
    // is still up, so it would re-curl and count on the way down.) Alternating curls are
    // unaffected: the idle arm is not mid-curl when the working arm finishes. Facing the
    // camera the two arms are far apart and never confused, and alternating curls overlap
    // (one rises while the other lowers), so the rule only applies when not facing it.
    const sideOn = !isFacingCamera(joints);
    if (countedSide && sideOn) {
      for (const side of ['left', 'right']) {
        if (side !== countedSide && arms[side]?.phase === 'FLEXED') {
          arms[side] = { ...arms[side], consumed: true };
        }
      }
    }
    // And while that already-counted curl is still up, a label that jumps back onto the
    // curling arm starts no new curl of its own. Live: the label that had snapped away (and
    // counted) jumped back onto the still-raised arm, looked like a fresh curl, and counted
    // again on the way down -- twice in one right-arm set.
    if (sideOn) {
      for (const side of ['left', 'right']) {
        const other = side === 'left' ? 'right' : 'left';
        const startedCurl = arms[side]?.phase === 'FLEXED' && prevState?.arms?.[side]?.phase !== 'FLEXED';
        const otherHeld = arms[other]?.phase === 'FLEXED' && arms[other]?.consumed;
        if (startedCurl && otherHeld) arms[side] = { ...arms[side], consumed: true };
      }
    }
    const nextState = { arms, lastRepAt };

    if (!anyPlausible) {
      return { joints, isPostureCorrect: true, isTracking: false, warning: 'Show your arm clearly', nextState };
    }
    if (!anyTracked) {
      return { joints, isPostureCorrect: true, isTracking: false, warning: '', nextState };
    }

    const checkedJoints = JSON.parse(JSON.stringify(joints));
    for (const side of flaredSides) checkedJoints[`${side}Elbow`].correct = false;
    const isPostureCorrect = flaredSides.length === 0;
    return {
      joints: checkedJoints,
      isPostureCorrect,
      warning: isPostureCorrect ? '' : 'Keep your elbow tucked! 🦾',
      isRepCompleted: counted,
      nextState,
    };
  },

  /**
   * Evaluates Pushups
   * Rule: Shoulder-Hip-Knee should stay straight (>= 150 deg). Elbow flexes to <= 100 deg.
   */
  evaluatePushup(joints, prevState, now = Date.now()) {
    if (isFacingCamera(joints)) return turnSideways(joints, prevState);

    const leftSideVisible = joints.leftShoulder && joints.leftHip && joints.leftKnee;
    const rightSideVisible = joints.rightShoulder && joints.rightHip && joints.rightKnee;

    const shoulder = leftSideVisible ? joints.leftShoulder : joints.rightShoulder;
    const hip = leftSideVisible ? joints.leftHip : joints.rightHip;
    const knee = leftSideVisible ? joints.leftKnee : joints.rightKnee;
    const elbow = leftSideVisible ? joints.leftElbow : joints.rightElbow;
    const wrist = leftSideVisible ? joints.leftWrist : joints.rightWrist;

    if (!shoulder || !hip || !knee || !elbow || !wrist || !isPlausiblePushup(shoulder, hip, knee, elbow, wrist)) {
      return { joints, isPostureCorrect: true, isTracking: false, warning: 'Position for pushup', nextState: { ...prevState, pending: null, streak: 0 } };
    }

    // A real body stays plausible; noise rarely does for several frames in a row.
    const streak = (prevState?.streak || 0) + 1;
    if (streak < GUARDS.stableFrames) {
      return { joints, isPostureCorrect: true, isTracking: false, warning: '', nextState: { ...prevState, pending: null, streak } };
    }

    // 1. Trunk alignment (hip angle)
    const hipAngle = this.calculateAngle(shoulder, hip, knee);
    
    // 2. Arm flex angle
    const elbowAngle = this.calculateAngle(shoulder, elbow, wrist);

    let isPostureCorrect = true;
    let warning = '';

    const checkedJoints = JSON.parse(JSON.stringify(joints));

    // The angle is unsigned (0-180), so use the hip's side of the shoulder-knee
    // line to tell sagging (hip below the line) from piking (hip above it).
    if (hipAngle < THRESHOLDS.pushup.hipMin) {
      isPostureCorrect = false;
      const dx = knee.x - shoulder.x;
      const lineY = dx === 0
        ? (shoulder.y + knee.y) / 2
        : shoulder.y + ((knee.y - shoulder.y) * (hip.x - shoulder.x)) / dx;
      warning = hip.y > lineY ? 'Don\'t sag your hips! 🧘' : 'Hips too high! ⚠️';
      if (leftSideVisible) checkedJoints.leftHip.correct = false;
      if (rightSideVisible) checkedJoints.rightHip.correct = false;
    }

    // Repetition tracking
    const { isRepCompleted, ...nextState } = advancePhase(
      prevState,
      {
        upPhase: 'UP',
        downPhase: 'DOWN',
        inDown: elbowAngle <= THRESHOLDS.pushup.downAt && isPostureCorrect,
        inUp: elbowAngle >= THRESHOLDS.pushup.upAt,
      },
      now
    );

    return { joints: checkedJoints, isPostureCorrect, warning, isRepCompleted, nextState: { ...nextState, streak } };
  }
};

/**
 * One arm of a bicep curl. `prev` is that arm's own state from the previous frame.
 * Returns whether the arm looks like an arm (`plausible`), whether it has been stable long
 * enough to be scored (`tracked`), its form and rep verdicts, and its next state.
 */
function evaluateCurlArm({ shoulder, elbow, wrist, hip }, prev, now) {
  if (!isPlausibleCurl(shoulder, elbow, hip)) {
    return { plausible: false, tracked: false, next: { ...prev, pending: null, streak: 0 } };
  }

  // Arm continuity. ML Kit can hop between the two arms (or swap their labels) from one
  // frame to the next. Seated, one arm rested bent on the lap ("curled") and the other hung
  // ("extended"), so every hop looked like a full curl: 6 phantom reps without moving. A
  // shoulder or hip that teleports means a different arm: forget the rep in progress and
  // re-earn the stable streak, rather than let the other arm finish it.
  const trunk = dist(shoulder, hip);
  const anchor = prev?.anchor;
  const jumped =
    !!anchor &&
    Math.max(dist(shoulder, anchor.shoulder), dist(hip, anchor.hip)) > GUARDS.maxJumpRatio * trunk;
  const base = jumped
    ? { phase: 'EXTENDED', lastRepAt: prev?.lastRepAt, pending: null, streak: 0, repFlared: false }
    : prev;
  const tracked = { anchor: { shoulder, hip } };

  // A real body stays plausible; noise rarely does for several frames in a row.
  const streak = (base?.streak || 0) + 1;
  if (streak < GUARDS.stableFrames) {
    return { plausible: true, tracked: false, next: { ...base, ...tracked, pending: null, streak } };
  }

  // 1. Elbow angle (flexion/extension)
  const elbowAngle = PostureEngine.calculateAngle(shoulder, elbow, wrist);

  // 2. Elbow tuck check (shoulder-elbow relative to hip vertical trunk)
  const shoulderAngle = PostureEngine.calculateAngle(elbow, shoulder, hip);

  // From the front, ML Kit's elbow landmark slides up and out as the arm folds (measured:
  // 69px below the shoulder hanging, level with it at the top; tuck reading 26-45 deg
  // mid-lift on an arm reading 1-16 deg while hanging). So the flare is only judged while
  // the upper arm clearly hangs AND the arm is mostly straight -- otherwise every lift was a
  // "fault" and no rep counted. A flare seen there still spoils the whole rep: it is carried
  // in `repFlared` until the arm is next seen hanging tucked, so a curl done with the elbow
  // out from the start is never counted just because its top could not be judged.
  // "Hanging" scales with the body: a fixed pixel margin let a user standing a few metres
  // back (trunk ~150px, hanging elbow ~75px down) be judged mid-fold with the elbow only
  // 21px down, read as a 50 deg flare, and lose the rep.
  const armHanging = elbow.y - shoulder.y > 0.3 * trunk;
  const judgeFlare = armHanging && elbowAngle >= THRESHOLDS.curl.judgeFlareFrom;
  const flared = judgeFlare && shoulderAngle > THRESHOLDS.curl.tuckMax;
  const repFlared = judgeFlare ? flared : !!base?.repFlared;

  // The wrist keeps a clean signal when the elbow doesn't: how far it hangs below the
  // shoulder, as a fraction of the trunk. Measured ~0.9 with the arm hanging, ~-0.4 at the
  // top of a real curl. It decides "extended" outright, because at the top of the curl the
  // unreliable elbow can produce any angle, including a falsely straight one.
  const wristDrop = (wrist.y - shoulder.y) / trunk;

  // A brisk curl's top lasts 1-2 frames at ~15 poses/s (measured: 141 -> 41 -> 128 deg in
  // under 400ms), which the 3-frame confirmation always dropped -- so a frame where the elbow
  // angle and the wrist height *both* say "fully curled" may confirm the top on its own. But
  // a single glitch frame looks exactly like that: live, ML Kit put a hanging arm's wrist at
  // the shoulder for one frame, the arm read hanging again on both sides of it, and that
  // counted as a rep with nobody moving. What tells them apart is the next frame: after a
  // real top the arm is still on its way down (the real fast curl read drop 0.40), after a
  // glitch the wrist is straight back at the hip. So the lone "fully curled" frame is only
  // remembered (`sureTop`), and confirmed by the following frame still being partway up.
  const fullyCurled =
    elbowAngle <= THRESHOLDS.curl.surelyFlexedAt && wristDrop <= THRESHOLDS.curl.handAtShoulder;
  const topConfirmed = !!base?.sureTop && wristDrop < THRESHOLDS.curl.handAtHip;

  // Repetition tracking
  const { isRepCompleted, ...nextState } = advancePhase(
    base,
    {
      upPhase: 'EXTENDED',
      downPhase: 'FLEXED',
      // A raised wrist alone is also a straight arm lifted sideways, so it only counts as
      // curled when the elbow is visibly bent too.
      inDown:
        (topConfirmed ||
          elbowAngle <= THRESHOLDS.curl.flexedAt ||
          (wristDrop <= THRESHOLDS.curl.handAtShoulder && elbowAngle < THRESHOLDS.curl.extendedAt)) &&
        !repFlared,
      inUp: wristDrop >= THRESHOLDS.curl.handAtHip,
      downSure: topConfirmed,
    },
    now
  );

  return {
    plausible: true,
    tracked: true,
    flared,
    isRepCompleted,
    next: {
      ...nextState,
      ...tracked,
      streak,
      repFlared,
      sureTop: fullyCurled && !repFlared,
      // An already-counted curl stays consumed until it finishes (see evaluateBicepCurl).
      consumed: nextState.phase === 'FLEXED' && !!base?.consumed,
    },
  };
}
