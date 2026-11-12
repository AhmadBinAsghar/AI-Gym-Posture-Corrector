import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  activeExercise: null, // "Deep Squats" | "Bicep Curls" | "Pushups" | null
  isRecording: false,
  reps: 0,
  calories: 0,
  duration: 0, // in seconds
  
  // Real-time joint correctness statuses
  isPostureCorrect: true,
  isTracking: false, // true while a person is detected in frame
  isCalibrationFrame: false, // true while the simulated calibration skeleton is shown
  postureWarning: '', // "Keep your back straight!", etc.
  
  // High-performance state tracking
  totalFrames: 0,
  correctFrames: 0,
  accuracyScore: 100, // percentage (correctFrames / totalFrames)
  
  // Active coordinate state for Skia canvas (simulated/live skeleton)
  joints: {
    nose: { x: 0, y: 0 },
    leftShoulder: { x: 0, y: 0, correct: true },
    rightShoulder: { x: 0, y: 0, correct: true },
    leftElbow: { x: 0, y: 0, correct: true },
    rightElbow: { x: 0, y: 0, correct: true },
    leftWrist: { x: 0, y: 0, correct: true },
    rightWrist: { x: 0, y: 0, correct: true },
    leftHip: { x: 0, y: 0, correct: true },
    rightHip: { x: 0, y: 0, correct: true },
    leftKnee: { x: 0, y: 0, correct: true },
    rightKnee: { x: 0, y: 0, correct: true },
    leftAnkle: { x: 0, y: 0, correct: true },
    rightAnkle: { x: 0, y: 0, correct: true },
  }
};

const exerciseSlice = createSlice({
  name: 'exercise',
  initialState,
  reducers: {
    startWorkout: (state, action) => {
      state.activeExercise = action.payload; // Name of exercise
      state.isRecording = true;
      state.reps = 0;
      state.calories = 0;
      state.duration = 0;
      state.isPostureCorrect = true;
      state.isTracking = false; // the clock starts once a person is actually detected
      state.postureWarning = '';
      state.totalFrames = 0;
      state.correctFrames = 0;
      state.accuracyScore = 100;
    },
    
    // "duration" is active time: it only runs while a person is being tracked, so an
    // empty frame (or the simulated calibration skeleton) earns no time or calories.
    incrementDuration: (state) => {
      if (state.isRecording && state.isTracking && !state.isCalibrationFrame) {
        state.duration += 1;
        // estimated calories burned: squats (0.15/sec), curls (0.08/sec), pushups (0.12/sec)
        const burnRate = 
          state.activeExercise === 'Bicep Curls' ? 0.08 :
          state.activeExercise === 'Pushups' ? 0.12 : 0.15;
        state.calories = Math.floor(state.duration * burnRate);
      }
    },
    
    updateSkeleton: (state, action) => {
      const { joints, isPostureCorrect, warning, isRepCompleted, isTracking = true, isCalibration = false } = action.payload;
      
      // Replace (not merge) so joints that are no longer detected disappear from the skeleton.
      state.joints = { ...initialState.joints, ...joints };
      state.isTracking = isTracking;
      state.isCalibrationFrame = isCalibration;
      
      if (!state.isRecording && !isCalibration) return;
      
      state.postureWarning = warning || '';
      // No person in frame: neither a good nor a bad frame, so don't touch accuracy or reps.
      if (!isTracking) {
        state.isPostureCorrect = true;
        return;
      }
      
      state.isPostureCorrect = isPostureCorrect;
      // Calibration frames use simulated joints: show feedback but never score them.
      if (isCalibration) return;
      // Update accuracy percentage over time
      state.totalFrames += 1;
      if (isPostureCorrect) {
        state.correctFrames += 1;
      }
      state.accuracyScore = Math.round((state.correctFrames / state.totalFrames) * 100);
      
      if (isRepCompleted) {
        state.reps += 1;
      }
    },
    
    // Lets the smoothing timer update the banner when no new camera frame arrives.
    setPostureWarning: (state, action) => {
      if (state.isRecording) state.postureWarning = action.payload || '';
    },

    stopWorkout: (state) => {
      state.isRecording = false;
    },
    
    resetWorkoutState: () => initialState,
  }
});

export const {
  startWorkout,
  incrementDuration,
  updateSkeleton,
  setPostureWarning,
  stopWorkout,
  resetWorkoutState,
} = exerciseSlice.actions;

export default exerciseSlice.reducer;
