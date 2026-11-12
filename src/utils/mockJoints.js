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
    const hip = { x: SCREEN_WIDTH * 0.45, y: SCREEN_HEIGHT * 0.55, correct: true };
    
    const backRad = backSlider * Math.PI / 180;
    const shoulder = {
      x: hip.x - 120 * Math.sin(backRad),
      y: hip.y - 120 * Math.cos(backRad),
      correct: true,
    };
    
    const knee = { x: hip.x, y: SCREEN_HEIGHT * 0.70, correct: true };
    const kneeRad = (180 - kneeSlider) * Math.PI / 180;
    const ankle = {
      x: knee.x + 100 * Math.sin(kneeRad),
      y: knee.y + 100 * Math.cos(kneeRad),
      correct: true,
    };

    joints.leftShoulder = shoulder;
    joints.leftHip = hip;
    joints.leftKnee = knee;
    joints.leftAnkle = ankle;
    
    joints.rightShoulder = { ...shoulder, x: shoulder.x + SIDE_VIEW_OFFSET };
    joints.rightHip = { ...hip, x: hip.x + SIDE_VIEW_OFFSET };
    joints.rightKnee = { ...knee, x: knee.x + SIDE_VIEW_OFFSET };
    joints.rightAnkle = { ...ankle, x: ankle.x + SIDE_VIEW_OFFSET };
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
