import { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import { Alert, Dimensions } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { CommonResolutions, useCameraDevice, useCameraPermission, useFrameOutput } from 'react-native-vision-camera';
import { createSynchronizable, runOnJS } from 'react-native-worklets';
import { createPoseLandmarker, createSpeaker } from 'react-native-pose-landmarker';
import { useNavigation } from '@react-navigation/native';
import { PostureEngine, GUARDS, TURN_SIDEWAYS_WARNING } from '../../../utils/postureEngine';
import { mapPoseToScreen } from '../../../utils/poseMapping';
import { generateMockJoints } from '../../../utils/mockJoints';
import { createWarningFilter } from '../../../utils/warningFilter';
import { createJointSmoother } from '../../../utils/jointSmoother';
import { introFor } from '../../../utils/introSpeech';
import { createPresenceReminder, reminderFor } from '../../../utils/presenceReminder';
import { createVoiceCoach } from '../../../utils/voiceFeedback';
import { updateSkeleton, setPostureWarning, incrementDuration, stopWorkout, resetWorkoutState } from '../../../redux/slices/exerciseSlice';
import { addWorkoutLog } from '../../../redux/slices/historySlice';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Detection lands 17-29 poses a second on a 30fps camera, so the odd frame in between comes
// back with no pose at all (or a joint ML Kit lost). Blanking the skeleton on those single
// frames is what made it visibly flicker and vanish mid-rep; the last accepted pose is held
// for this long instead. Short enough that walking out of frame still clears it.
const SKELETON_HOLD_MS = 350;

export const useCamera = () => {
  const dispatch = useDispatch();
  const navigation = useNavigation();

  const user = useSelector(state => state.auth.user);
  // Each field is selected on its own ON PURPOSE. updateSkeleton() rebuilds the whole
  // exercise slice 30x/second, so selecting the slice object here (which this used to do)
  // handed back a brand-new reference every frame and re-rendered this hook -- and with it
  // the entire camera screen, <Camera> included -- on every single frame. That screen-wide
  // re-render, not the detector, is what throttled tracking. With primitives, useSelector
  // only fires when the value it reads actually changes, and the joint updates are left to
  // the overlay, which subscribes to them by itself (see SkeletonCanvas).
  const activeExercise = useSelector(state => state.exercise.activeExercise);
  const isTracking = useSelector(state => state.exercise.isTracking);
  const reps = useSelector(state => state.exercise.reps);
  const calories = useSelector(state => state.exercise.calories);
  const duration = useSelector(state => state.exercise.duration);
  const accuracyScore = useSelector(state => state.exercise.accuracyScore);
  const isPostureCorrect = useSelector(state => state.exercise.isPostureCorrect);
  const postureWarning = useSelector(state => state.exercise.postureWarning);
  const isRecording = useSelector(state => state.exercise.isRecording);

  const { hasPermission, requestPermission } = useCameraPermission();
  const [cameraType, setCameraType] = useState('front');
  const [isPaused, setIsPaused] = useState(false);
  const [isCalibrationOpen, setIsCalibrationOpen] = useState(false);
  const [viewSize, setViewSize] = useState({ width: SCREEN_WIDTH, height: SCREEN_HEIGHT });
  const [voiceEnabled, setVoiceEnabled] = useState(true);

  const [kneeSlider, setKneeSlider] = useState(170);
  const [backSlider, setBackSlider] = useState(10);
  const [elbowSlider, setElbowSlider] = useState(150);
  const [elbowTuckSlider, setElbowTuckSlider] = useState(10);
  const [hipSlider, setHipSlider] = useState(180);

  const device = useCameraDevice(cameraType);
  const cameraTypeRef = useRef(cameraType);
  cameraTypeRef.current = cameraType;
  const postureStateRef = useRef({ phase: 'UP' });
  // Calibration uses simulated joints, so it gets its own rep state and never touches the real one.
  // The simulated skeleton changes only when a slider is tapped, so it cannot build the
  // multi-frame streak real camera frames need: start it already "stable".
  const calibrationStateRef = useRef({ phase: 'UP', streak: GUARDS.stableFrames });

  // Native ML Kit pose detector + text-to-speech (see modules/react-native-pose-landmarker).
  const landmarker = useMemo(() => createPoseLandmarker(), []);
  const speaker = useMemo(() => createSpeaker(), []);
  const coachRef = useRef(createVoiceCoach());
  // Smooths the banner/voice text; scoring still uses each raw frame.
  const warningFilterRef = useRef(createWarningFilter());
  const reminderRef = useRef(createPresenceReminder());
  const isTrackingRef = useRef(false);
  const rawWarningRef = useRef(''); // the engine's latest verdict, before smoothing
  const shownWarningRef = useRef(''); // what the banner currently shows
  const lastCurlLogRef = useRef(0); // TEMP DIAG
  const diagFramesRef = useRef(0); // TEMP DIAG: poses processed since the last log line

  // The last pose the engine accepted, plus when, so a run of dropped frames can be bridged.
  const lastAcceptedRef = useRef({ joints: null, at: 0 });

  /**
   * Decides which joints to draw for this frame. `accepted` is the engine's verdict; when it
   * is false the previous pose is repeated for up to SKELETON_HOLD_MS so a single lost frame
   * does not blank the skeleton. Scoring is untouched -- only accepted poses are ever stored.
   */
  // Steadies the drawn skeleton only; scoring above uses the raw landmarks.
  const smootherRef = useRef(createJointSmoother());
  const resolveJoints = useCallback((rawJoints, accepted) => {
    const now = Date.now();
    const joints = accepted && rawJoints ? smootherRef.current.smooth(rawJoints, now) : rawJoints;
    if (accepted && joints) lastAcceptedRef.current = { joints, at: now };
    const last = lastAcceptedRef.current;
    const canHold = !!last.joints && now - last.at <= SKELETON_HOLD_MS;
    return {
      joints: accepted ? joints : canHold ? last.joints : {},
      isTracking: accepted || canHold,
    };
  }, []);

  // The frame callback runs outside React, so it reads the current values through refs.
  // This is what lets each frame be processed in a single pass instead of a state update
  // followed by an effect.
  const viewSizeRef = useRef(viewSize);
  viewSizeRef.current = viewSize;
  const exerciseRef = useRef(activeExercise);
  exerciseRef.current = activeExercise;
  const recordingRef = useRef(isRecording);
  recordingRef.current = isRecording;
  const pausedRef = useRef(isPaused);
  pausedRef.current = isPaused;
  const calibrationRef = useRef(isCalibrationOpen);
  calibrationRef.current = isCalibrationOpen;
  const voiceEnabledRef = useRef(voiceEnabled);
  voiceEnabledRef.current = voiceEnabled;
  const warningRef = useRef('');
  warningRef.current = postureWarning;

  const onLayout = useCallback(e => {
    const { width, height } = e.nativeEvent.layout;
    setViewSize(prev => (prev.width === width && prev.height === height ? prev : { width, height }));
  }, []);

  // Detection failures used to be swallowed; surface each distinct one once in the dev log.
  const seenDetectErrors = useRef(new Set());
  const reportDetectError = useCallback((message) => {
    if (seenDetectErrors.current.has(message)) return;
    seenDetectErrors.current.add(message);
    console.warn('[pose] detect failed:', message);
  }, []);

  // Records the engine's raw verdict and returns the smoothed text to display.
  const smoothWarning = useCallback((raw) => {
    rawWarningRef.current = raw;
    const shown = warningFilterRef.current.update(raw, Date.now());
    shownWarningRef.current = shown;
    return shown;
  }, []);

  // Nobody in frame: clear the skeleton without scoring the frame. No banner is raised here
  // on purpose. The body-outline guide already shows where to stand using wording that fits
  // the exercise, and the old generic card ("Step back so your whole body is in frame") both
  // contradicted that -- curls and pushups are not whole-body exercises -- and covered the
  // outline it was meant to complement. smoothWarning('') is still called so the filter drops
  // any form warning left over from the last tracked frame.
  const handleNoPose = useCallback(() => {
    if (pausedRef.current || calibrationRef.current) return;
    const { joints, isTracking: hasJoints } = resolveJoints(null, false);
    dispatch(updateSkeleton({
      joints,
      isTracking: hasJoints,
      isPostureCorrect: true,
      warning: smoothWarning(''),
      isRepCompleted: false,
    }));
  }, [dispatch, smoothWarning, resolveJoints]);

  // One camera frame, start to finish: map pixels -> screen, score the form, draw the
  // skeleton. Doing it all here (rather than parking the pose in React state and reacting
  // to it in an effect) removes a whole render pass from the critical path.
  const processPose = useCallback((pose, mirror, detectedAt) => {
    if (pausedRef.current || calibrationRef.current) return;

    // The front-camera preview is shown mirrored (selfie view), but the native landmarker
    // hands ML Kit the raw sensor image, which is not -- and on-device frame.isMirrored still
    // reported false for the front camera. Trusting only the flag drew the skeleton flipped
    // left-to-right: an arm reaching forward on screen was drawn reaching backward. Angles
    // and heights are mirror-invariant, so scoring was never affected, only the overlay.
    const normalizedJoints = mapPoseToScreen(pose, viewSizeRef.current, {
      mirror: mirror || cameraTypeRef.current === 'front',
    });
    if (!normalizedJoints) {
      handleNoPose();
      return;
    }

    let evaluationResult = {
      joints: normalizedJoints,
      isPostureCorrect: true,
      warning: '',
      isRepCompleted: false,
      isTracking: true,
      nextState: postureStateRef.current,
    };

    if (recordingRef.current) {
      const exercise = exerciseRef.current;
      if (exercise === 'Deep Squats') {
        evaluationResult = PostureEngine.evaluateSquat(normalizedJoints, postureStateRef.current);
      } else if (exercise === 'Bicep Curls') {
        evaluationResult = PostureEngine.evaluateBicepCurl(normalizedJoints, postureStateRef.current);
      } else if (exercise === 'Pushups') {
        evaluationResult = PostureEngine.evaluatePushup(normalizedJoints, postureStateRef.current);
      }
    }

    const isTrackedFrame = evaluationResult.isTracking !== false;

    // TEMP DIAG: why the curl counter does or does not move.
    const diagNow = Date.now();
    diagFramesRef.current += 1;
    if (
      exerciseRef.current === 'Bicep Curls' &&
      recordingRef.current &&
      (diagNow - lastCurlLogRef.current > 150 || evaluationResult.isRepCompleted)
    ) {
      const fps = Math.round((diagFramesRef.current * 1000) / Math.max(1, diagNow - lastCurlLogRef.current));
      diagFramesRef.current = 0;
      lastCurlLogRef.current = diagNow;
      const nj = normalizedJoints;
      const L = !!nj.leftShoulder && !!nj.leftElbow && !!nj.leftWrist;
      const S = L ? nj.leftShoulder : nj.rightShoulder;
      const E = L ? nj.leftElbow : nj.rightElbow;
      const W = L ? nj.leftWrist : nj.rightWrist;
      const H = L ? nj.leftHip : nj.rightHip;
      const A = (a, b, c) => (a && b && c ? Math.round(PostureEngine.calculateAngle(a, b, c)) : -1);
      const p = j => (j ? `${Math.round(j.x)},${Math.round(j.y)}` : '-');
      console.log(
        `[curl] S=${p(S)} E=${p(E)} W=${p(W)} H=${p(H)}` +
        ` elbow=${A(S, E, W)} tuck=${A(E, S, H)} track=${isTrackedFrame}` +
        ` drop=${S && W && H ? ((W.y - S.y) / Math.hypot(S.x - H.x, S.y - H.y)).toFixed(2) : '-'}` +
        ` ok=${evaluationResult.isPostureCorrect} warn=${evaluationResult.warning || '-'}` +
        ` L=${evaluationResult.nextState?.arms?.left?.phase || '-'}/${evaluationResult.nextState?.arms?.left?.streak ?? '-'}` +
        ` R=${evaluationResult.nextState?.arms?.right?.phase || '-'}/${evaluationResult.nextState?.arms?.right?.streak ?? '-'}` +
        ` reps=${evaluationResult.isRepCompleted ? 'REP' : '-'}` +
        ` rS=${p(nj.rightShoulder)} rE=${p(nj.rightElbow)} rW=${p(nj.rightWrist)} rH=${p(nj.rightHip)}` +
        ` lS=${p(nj.leftShoulder)} lE=${p(nj.leftElbow)} lW=${p(nj.leftWrist)} lH=${p(nj.leftHip)}` +
        ` lag=${detectedAt ? diagNow - detectedAt : '?'}ms fps=${fps}`
      );
    }

    const { joints, isTracking: hasJoints } = resolveJoints(evaluationResult.joints, isTrackedFrame);

    dispatch(updateSkeleton({
      // Only draw a skeleton for a body the engine accepted: ML Kit also reports
      // guessed joints when nobody (or only a hand) is in view.
      joints,
      isPostureCorrect: evaluationResult.isPostureCorrect,
      warning: smoothWarning(evaluationResult.warning || ''),
      isRepCompleted: evaluationResult.isRepCompleted,
      isTracking: hasJoints,
      isCalibration: false,
    }));

    postureStateRef.current = evaluationResult.nextState;
  }, [dispatch, smoothWarning, handleNoPose, resolveJoints]);

  // Back-pressure between the camera thread and the JS thread. dropFramesWhileBusy only drops
  // frames while *detect* is busy; it knows nothing about the JS thread, so whenever drawing +
  // scoring took longer than a frame, results queued up behind it and the skeleton showed
  // where the body *was* -- measured 600-750ms behind on-device. Now a frame is skipped
  // outright (before detect) while JS is still busy with the previous pose, so whatever is
  // drawn is always the newest pose.
  const jsBusy = useMemo(() => createSynchronizable(false), []);
  const loggedMirrorRef = useRef(false); // TEMP DIAG
  const deliverPose = useCallback((pose, mirror, detectedAt) => {
    if (!loggedMirrorRef.current) {
      loggedMirrorRef.current = true;
      console.log(`[mirror] frame.isMirrored=${mirror} camera=${cameraTypeRef.current}`);
    }
    try {
      processPose(pose, mirror, detectedAt);
    } finally {
      jsBusy.setBlocking(false);
    }
  }, [processPose, jsBusy]);
  const deliverNoPose = useCallback((mirrored) => {
    if (!loggedMirrorRef.current && mirrored !== undefined) {
      loggedMirrorRef.current = true;
      console.log(`[mirror] frame.isMirrored=${mirrored} camera=${cameraTypeRef.current}`);
    }
    try {
      handleNoPose();
    } finally {
      jsBusy.setBlocking(false);
    }
  }, [handleNoPose, jsBusy]);

  const frameOutput = useFrameOutput({
    // ML Kit's detect() scales with the pixel count it is handed, and detection and drawing
    // share the JS thread, so the tracking rate is 1 / (detect + draw). This target makes the
    // session hand us a small native size (960x540 here, the binned 2x2 of the sensor) instead
    // of 720p, which roughly halved the detect time to ~31ms. Two things measured worse and are
    // deliberately not used: sizes that are *not* sensor-native (640x480, 320x568) make the
    // pipeline scale every frame and drop to a few fps, and asking for something smaller still
    // (LOWEST_16_9 -> 176x144) makes ML Kit upscale internally and costs ~55ms instead of ~31ms.
    targetResolution: CommonResolutions.VGA_16_9,
    pixelFormat: 'yuv',
    dropFramesWhileBusy: true,
    onFrame: (frame) => {
      'worklet';
      try {
        if (jsBusy.getDirty()) return; // JS is still on the last pose: skip, don't queue
        const pose = landmarker.detect(frame);
        jsBusy.setBlocking(true);
        if (pose.landmarks.length > 0) {
          runOnJS(deliverPose)(pose, frame.isMirrored, Date.now());
        } else {
          runOnJS(deliverNoPose)(frame.isMirrored);
        }
      } catch (e) {
        runOnJS(reportDetectError)(String((e && e.message) || e));
        jsBusy.setBlocking(true);
        runOnJS(deliverNoPose)();
      } finally {
        frame.dispose();
      }
    },
  });

  useEffect(() => {
    if (!hasPermission) requestPermission();
  }, [hasPermission, requestPermission]);

  useEffect(() => {
    let interval = null;
    if (!isPaused && isRecording) {
      interval = setInterval(() => {
        dispatch(incrementDuration());
      }, 1000);
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [isPaused, isRecording, dispatch]);

  // The smoothing needs time to pass, but an unchanged verdict (e.g. an empty room) produces
  // no new camera events, so tick the filter on a timer too.
  useEffect(() => {
    if (!isRecording || isPaused || isCalibrationOpen) return undefined;
    const id = setInterval(() => {
      const shown = warningFilterRef.current.update(rawWarningRef.current, Date.now());
      if (shown !== shownWarningRef.current) {
        shownWarningRef.current = shown;
        dispatch(setPostureWarning(shown));
      }
    }, 250);
    return () => clearInterval(id);
  }, [isRecording, isPaused, isCalibrationOpen, dispatch]);

  // Calibration skeleton: driven by the sliders, not by camera frames. It is the only
  // React-state-driven path left; live frames go straight through processPose.
  useEffect(() => {
    if (!isCalibrationOpen || isPaused) return;

    const normalizedJoints = generateMockJoints(
      activeExercise,
      { kneeSlider, backSlider, elbowSlider, elbowTuckSlider, hipSlider },
      { width: SCREEN_WIDTH, height: SCREEN_HEIGHT }
    );

    let evaluationResult = {
      joints: normalizedJoints,
      isPostureCorrect: true,
      warning: '',
      isRepCompleted: false,
      isTracking: true,
      nextState: calibrationStateRef.current,
    };

    if (activeExercise === 'Deep Squats') {
      evaluationResult = PostureEngine.evaluateSquat(normalizedJoints, calibrationStateRef.current);
    } else if (activeExercise === 'Bicep Curls') {
      evaluationResult = PostureEngine.evaluateBicepCurl(normalizedJoints, calibrationStateRef.current);
    } else if (activeExercise === 'Pushups') {
      evaluationResult = PostureEngine.evaluatePushup(normalizedJoints, calibrationStateRef.current);
    }

    dispatch(updateSkeleton({
      joints: evaluationResult.isTracking !== false ? evaluationResult.joints : {},
      isPostureCorrect: evaluationResult.isPostureCorrect,
      // Calibration gives the developer instant feedback; real frames are smoothed.
      warning: evaluationResult.warning,
      isRepCompleted: evaluationResult.isRepCompleted,
      isTracking: evaluationResult.isTracking !== false,
      isCalibration: true,
    }));

    calibrationStateRef.current = evaluationResult.nextState;
  }, [
    isPaused,
    activeExercise,
    isCalibrationOpen,
    kneeSlider,
    backSlider,
    elbowSlider,
    elbowTuckSlider,
    hipSlider,
    dispatch,
  ]);

  // Spoken coaching: corrections, "good form", and rep counts.
  useEffect(() => {
    if (!voiceEnabled || !isRecording || isPaused || isCalibrationOpen) return;
    // Speak only about a body the engine is actually tracking, and only once the warning
    // has been stable long enough to show on screen. "Step back" (not tracked) is
    // shown as text but never spoken.
    const spokenWarning = isTracking ? postureWarning : '';
    const text = coachRef.current.onPosture(
      { isPostureCorrect: !spokenWarning, warning: spokenWarning },
      Date.now()
    );
    if (text) speaker.speak(text);
  }, [isTracking, postureWarning, voiceEnabled, isRecording, isPaused, isCalibrationOpen, speaker]);

  const lastRepsRef = useRef(0);
  useEffect(() => {
    if (reps > lastRepsRef.current && voiceEnabled && !isPaused && !isCalibrationOpen) {
      speaker.speak(coachRef.current.onRep(reps, Date.now()));
    }
    lastRepsRef.current = reps;
  }, [reps, voiceEnabled, isPaused, isCalibrationOpen, speaker]);

  useEffect(() => {
    if (!voiceEnabled || isPaused) speaker.stop();
  }, [voiceEnabled, isPaused, speaker]);

  useEffect(() => () => speaker.stop(), [speaker]);

  // "I can't see you": a spoken nudge after a while with nobody in frame.
  isTrackingRef.current = isTracking;
  useEffect(() => {
    if (!isRecording) return undefined;
    const id = setInterval(() => {
      if (!voiceEnabledRef.current || pausedRef.current || calibrationRef.current) {
        reminderRef.current.hold();
        return;
      }
      const text = reminderRef.current.update(isTrackingRef.current, Date.now());
      if (text) {
        // Somebody facing the camera is visible, so "step back" would be wrong advice.
        speaker.speak(warningRef.current === TURN_SIDEWAYS_WARNING ? `${TURN_SIDEWAYS_WARNING}.` : reminderFor(exerciseRef.current));
      }
    }, 1000);
    return () => clearInterval(id);
  }, [isRecording, speaker]);

  // Once per workout, tell the user how to place the phone. Mute/pause are read through
  // refs so toggling them later does not repeat the instructions.
  useEffect(() => {
    if (!isRecording || !activeExercise) return undefined;
    const id = setTimeout(() => {
      if (voiceEnabledRef.current && !pausedRef.current) speaker.speak(introFor(activeExercise));
    }, 1200); // let the camera open first
    return () => clearTimeout(id);
  }, [isRecording, activeExercise, speaker]);

  const flipCamera = useCallback(() => {
    setCameraType(prev => (prev === 'front' ? 'back' : 'front'));
  }, []);

  const handleStopWorkout = () => {
    speaker.stop();
    setIsPaused(true);
    Alert.alert(
      'Workout Completed! 🎉',
      `Awesome job! Here is your summary:\n\nRepetitions: ${reps}\nForm Accuracy: ${accuracyScore}%\nCalories Burned: ${calories} kcal\nActive time: ${duration}s`,
      [
        {
          text: 'Discard Workout',
          style: 'destructive',
          onPress: () => {
            dispatch(stopWorkout());
            dispatch(resetWorkoutState());
            navigation.goBack();
          },
        },
        {
          text: 'Save and Sync',
          style: 'default',
          onPress: () => {
            dispatch(stopWorkout());
            dispatch(addWorkoutLog({
              userId: user?.id,
              logData: {
                exerciseName: activeExercise,
                reps,
                duration,
                accuracy: accuracyScore,
                calories,
              },
            }));
            dispatch(resetWorkoutState());
            navigation.navigate('History');
          },
        },
      ],
      { cancelable: false }
    );
  };

  return {
    user,
    activeExercise,
    reps,
    calories,
    duration,
    accuracyScore,
    isPostureCorrect,
    isTracking,
    postureWarning,
    hasPermission,
    requestPermission,
    cameraType,
    onLayout,
    viewSize,
    voiceEnabled,
    setVoiceEnabled,
    device,
    frameOutput,
    isPaused,
    isCalibrationOpen,
    kneeSlider,
    backSlider,
    elbowSlider,
    elbowTuckSlider,
    hipSlider,
    setIsPaused,
    setIsCalibrationOpen,
    setKneeSlider,
    setBackSlider,
    setElbowSlider,
    setElbowTuckSlider,
    setHipSlider,
    flipCamera,
    handleStopWorkout,
  };
};
