/**
 * Simulated skeleton for the Calibration panel: the sliders move joints so a developer
 * can watch the posture rules turn red/green without standing in front of the camera.
 */
// Squat and pushup are side-view exercises: the far-side limbs sit just behind the near ones.
const SIDE_VIEW_OFFSET = 12;

export const generateMockJoints = (exercise, sliders, { width: SCREEN_WIDTH, height: SCREEN_HEIGHT }) => {
  const { kneeSlider, backSlider, elbowSlider, elbowTuckSlider, hipSlider } = sliders;
  
  const joints = {
    leftShoulder: { x: SCREEN_WIDTH * 0.35, y: SCREEN_HEIGHT * 0.35, correct: true },
    rightShoulder: { x: SCREEN_WIDTH * 0.65, y: SCREEN_HEIGHT * 0.35, correct: true },
    leftElbow: { x: SCREEN_WIDTH * 0.25, y: SCREEN_HEIGHT * 0.5, correct: true },
    rightElbow: { x: SCREEN_WIDTH * 0.75, y: SCREEN_HEIGHT * 0.5, correct: true },
    leftWrist: { x: SCREEN_WIDTH * 0.20, y: SCREEN_HEIGHT * 0.65, correct: true },
    rightWrist: { x: SCREEN_WIDTH * 0.80, y: SCREEN_HEIGHT * 0.65, correct: true },
    leftHip: { x: SCREEN_WIDTH * 0.40, y: SCREEN_HEIGHT * 0.6, correct: true },
    rightHip: { x: SCREEN_WIDTH * 0.60, y: SCREEN_HEIGHT * 0.6, correct: true },
    leftKnee: { x: SCREEN_WIDTH * 0.40, y: SCREEN_HEIGHT * 0.75, correct: true },
    rightKnee: { x: SCREEN_WIDTH * 0.60, y: SCREEN_HEIGHT * 0.75, correct: true },
    leftAnkle: { x: SCREEN_WIDTH * 0.40, y: SCREEN_HEIGHT * 0.9, correct: true },
    rightAnkle: { x: SCREEN_WIDTH * 0.60, y: SCREEN_HEIGHT * 0.9, correct: true },
  };

  if (exercise === 'Deep Squats') {
    // A side-view body facing left, built from the planted foot up like a real squat: the
    // shin tips forward a little and the thigh swings back, sharing the knee bend. Limb
    // lengths are in proportion to the view (u = 1% of its height) and the feet sit above the
    // open calibration panel, so the whole demo figure is visible; the arms reach forward
    // for balance as the squat deepens.
    const u = SCREEN_HEIGHT / 100;
    const SHIN = 13 * u, THIGH = 13 * u, TORSO = 18 * u, UPPER_ARM = 10 * u, FOREARM = 9 * u;
    const ankle = { x: SCREEN_WIDTH * 0.56, y: SCREEN_HEIGHT * 0.64, correct: true };
    const shinLean = ((180 - kneeSlider) * 0.3 * Math.PI) / 180;
    const knee = {
      x: ankle.x - SHIN * Math.sin(shinLean),
      y: ankle.y - SHIN * Math.cos(shinLean),
      correct: true,
    };
    // Thigh direction: the knee->ankle direction rotated by the knee angle, toward the back (+x).
    const ux = (ankle.x - knee.x) / SHIN;
    const uy = (ankle.y - knee.y) / SHIN;
    const k = (kneeSlider * Math.PI) / 180;
    const r1 = { x: ux * Math.cos(k) - uy * Math.sin(k), y: ux * Math.sin(k) + uy * Math.cos(k) };
    const r2 = { x: ux * Math.cos(-k) - uy * Math.sin(-k), y: ux * Math.sin(-k) + uy * Math.cos(-k) };
    const thigh = r1.x > r2.x ? r1 : r2;
    const hip = { x: knee.x + THIGH * thigh.x, y: knee.y + THIGH * thigh.y, correct: true };

    const backRad = backSlider * Math.PI / 180;
    const shoulder = {
      x: hip.x - TORSO * Math.sin(backRad),
      y: hip.y - TORSO * Math.cos(backRad),
      correct: true,
    };

    // Arms: hanging when standing, raised forward toward horizontal at the bottom.
    const depth = Math.min(1, Math.max(0, (180 - kneeSlider) / 100));
    const armRad = ((15 + 70 * depth) * Math.PI) / 180; // from straight down, toward the front
    const elbow = {
      x: shoulder.x - UPPER_ARM * Math.sin(armRad),
      y: shoulder.y + UPPER_ARM * Math.cos(armRad),
      correct: true,
    };
    const wrist = {
      x: elbow.x - FOREARM * Math.sin(armRad + 0.15),
      y: elbow.y + FOREARM * Math.cos(armRad + 0.15),
      correct: true,
    };

    const side = (s, dx) => {
      joints[`${s}Shoulder`] = { ...shoulder, x: shoulder.x + dx };
      joints[`${s}Elbow`] = { ...elbow, x: elbow.x + dx };
      joints[`${s}Wrist`] = { ...wrist, x: wrist.x + dx };
      joints[`${s}Hip`] = { ...hip, x: hip.x + dx };
      joints[`${s}Knee`] = { ...knee, x: knee.x + dx };
      joints[`${s}Ankle`] = { ...ankle, x: ankle.x + dx };
    };
    side('left', 0);
    side('right', SIDE_VIEW_OFFSET);
  } else if (exercise === 'Bicep Curls') {
    const hip = { x: SCREEN_WIDTH * 0.4, y: SCREEN_HEIGHT * 0.6, correct: true };
    const shoulder = { x: SCREEN_WIDTH * 0.4, y: SCREEN_HEIGHT * 0.35, correct: true };
    
    const tuckRad = elbowTuckSlider * Math.PI / 180;
    const elbow = {
      x: shoulder.x - 100 * Math.sin(tuckRad),
      y: shoulder.y + 100 * Math.cos(tuckRad),
      correct: true,
    };
    
    const wristRad = tuckRad - (180 - elbowSlider) * Math.PI / 180;
    const wrist = {
      x: elbow.x + 100 * Math.sin(wristRad),
      y: elbow.y + 100 * Math.cos(wristRad),
      correct: true,
    };

    joints.leftHip = hip;
    joints.leftShoulder = shoulder;
    joints.leftElbow = elbow;
    joints.leftWrist = wrist;

    joints.rightHip = { ...hip, x: SCREEN_WIDTH - hip.x };
    joints.rightShoulder = { ...shoulder, x: SCREEN_WIDTH - shoulder.x };
    joints.rightElbow = { ...elbow, x: SCREEN_WIDTH - elbow.x };
    joints.rightWrist = { ...wrist, x: SCREEN_WIDTH - wrist.x };
  } else if (exercise === 'Pushups') {
    const hip = { x: SCREEN_WIDTH * 0.5, y: SCREEN_HEIGHT * 0.6, correct: true };
    const hipRad = (180 - hipSlider) * Math.PI / 180;
    
    const shoulder = {
      x: hip.x - 120 * Math.cos(hipRad),
      y: hip.y - 120 * Math.sin(hipRad),
      correct: true,
    };
    
    const knee = { x: hip.x + 120, y: hip.y, correct: true };
    const ankle = { x: knee.x + 80, y: knee.y, correct: true };
    
    const elbow = { x: shoulder.x - 40, y: shoulder.y + 40, correct: true };
    const wrist = { x: elbow.x, y: elbow.y + 60, correct: true };

    joints.leftShoulder = shoulder;
    joints.leftHip = hip;
    joints.leftKnee = knee;
    joints.leftAnkle = ankle;
    joints.leftElbow = elbow;
    joints.leftWrist = wrist;

    joints.rightShoulder = { ...shoulder, x: shoulder.x + SIDE_VIEW_OFFSET };
    joints.rightHip = { ...hip, x: hip.x + SIDE_VIEW_OFFSET };
    joints.rightKnee = { ...knee, x: knee.x + SIDE_VIEW_OFFSET };
    joints.rightAnkle = { ...ankle, x: ankle.x + SIDE_VIEW_OFFSET };
    joints.rightElbow = { ...elbow, x: elbow.x + SIDE_VIEW_OFFSET };
    joints.rightWrist = { ...wrist, x: wrist.x + SIDE_VIEW_OFFSET };
  }

  return joints;
};
