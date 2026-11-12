import reducer, {
  startWorkout,
  updateSkeleton,
  setPostureWarning,
  incrementDuration,
  stopWorkout,
} from '../src/redux/slices/exerciseSlice';

const frame = (over = {}) => ({
  joints: {},
  isPostureCorrect: true,
  warning: '',
  isRepCompleted: false,
  isTracking: true,
  ...over,
});

describe('exerciseSlice', () => {
  const started = () => reducer(undefined, startWorkout('Deep Squats'));

  test('scores accuracy from tracked frames and counts reps', () => {
    let s = started();
    s = reducer(s, updateSkeleton(frame()));
    s = reducer(s, updateSkeleton(frame({ isPostureCorrect: false, warning: 'x' })));
    s = reducer(s, updateSkeleton(frame({ isRepCompleted: true })));
    expect(s.totalFrames).toBe(3);
    expect(s.accuracyScore).toBe(67);
    expect(s.reps).toBe(1);
  });

  test('frames with nobody in view are not scored', () => {
    let s = started();
    s = reducer(s, updateSkeleton(frame({ isTracking: false, isRepCompleted: true })));
    expect(s.totalFrames).toBe(0);
    expect(s.reps).toBe(0);
    expect(s.isTracking).toBe(false);
  });

  test('calibration frames show feedback but never change the score', () => {
    let s = started();
    s = reducer(
      s,
      updateSkeleton(
        frame({ isCalibration: true, isPostureCorrect: false, warning: 'Keep your back straight!', isRepCompleted: true })
      )
    );
    expect(s.postureWarning).toBe('Keep your back straight!');
    expect(s.isPostureCorrect).toBe(false);
    expect(s.totalFrames).toBe(0);
    expect(s.reps).toBe(0);
  });

  test('calibration frames work even when no workout is recording', () => {
    let s = reducer(reducer(undefined, startWorkout('Pushups')), stopWorkout());
    s = reducer(s, updateSkeleton(frame({ isCalibration: true, isPostureCorrect: false, warning: 'w' })));
    expect(s.postureWarning).toBe('w');
  });

  test('time and calories run only while a person is tracked', () => {
    let s = started();
    // Nobody in view yet: the clock must not run.
    for (let i = 0; i < 10; i++) s = reducer(s, incrementDuration());
    expect(s.duration).toBe(0);
    expect(s.calories).toBe(0);

    s = reducer(s, updateSkeleton(frame())); // a person appears
    for (let i = 0; i < 20; i++) s = reducer(s, incrementDuration());
    expect(s.duration).toBe(20);
    expect(s.calories).toBe(3);

    s = reducer(s, updateSkeleton(frame({ isTracking: false }))); // they walk away
    for (let i = 0; i < 10; i++) s = reducer(s, incrementDuration());
    expect(s.duration).toBe(20);
  });

  test('the smoothing timer can set the banner text without a new frame', () => {
    let s = started();
    s = reducer(s, setPostureWarning('Step back so your whole body is in frame'));
    expect(s.postureWarning).toBe('Step back so your whole body is in frame');
    s = reducer(s, setPostureWarning(''));
    expect(s.postureWarning).toBe('');
    s = reducer(reducer(s, stopWorkout()), setPostureWarning('late'));
    expect(s.postureWarning).toBe(''); // ignored once the workout has stopped
  });

  test('the clock stops when the workout is stopped', () => {
    let s = reducer(started(), updateSkeleton(frame()));
    s = reducer(s, stopWorkout());
    s = reducer(s, incrementDuration());
    expect(s.duration).toBe(0);
  });

  test('the simulated calibration skeleton earns no time or calories', () => {
    let s = reducer(started(), updateSkeleton(frame({ isCalibration: true })));
    for (let i = 0; i < 10; i++) s = reducer(s, incrementDuration());
    expect(s.duration).toBe(0);
    expect(s.calories).toBe(0);
  });

  test('a new workout starts with the clock stopped until someone is detected', () => {
    let s = reducer(started(), updateSkeleton(frame()));
    s = reducer(s, startWorkout('Pushups'));
    expect(s.isTracking).toBe(false);
    s = reducer(s, incrementDuration());
    expect(s.duration).toBe(0);
  });
});
