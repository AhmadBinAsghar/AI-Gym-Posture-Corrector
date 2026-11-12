import { createVoiceCoach } from '../src/utils/voiceFeedback';
import { introFor } from '../src/utils/introSpeech';

describe('workout intro', () => {
  test.each(['Deep Squats', 'Bicep Curls', 'Pushups'])('%s has its own spoken set-up instructions', name => {
    const text = introFor(name);
    expect(text.toLowerCase()).toContain(name.toLowerCase());
    expect(text).toMatch(/phone/i);
    expect(text).toMatch(/frame/i);
    expect(/^[A-Za-z0-9 .,]+$/.test(text)).toBe(true); // plain words only: nothing the speech engine reads as symbols
  });

  test('an unknown exercise still gets generic instructions', () => {
    expect(introFor('Lunges')).toMatch(/phone/i);
  });
});

describe('voice coach', () => {
  const bad = { isPostureCorrect: false, warning: 'Keep your back straight! 🧘' };
  const good = { isPostureCorrect: true, warning: '' };

  test('speaks a new correction immediately, without emoji', () => {
    const coach = createVoiceCoach();
    expect(coach.onPosture(bad, 10000)).toBe('Keep your back straight!');
  });

  test('does not repeat the same correction until repeatMs passes', () => {
    const coach = createVoiceCoach({ repeatMs: 5000 });
    coach.onPosture(bad, 10000);
    expect(coach.onPosture(bad, 12000)).toBeNull();
    expect(coach.onPosture(bad, 15000)).toBe('Keep your back straight!');
  });

  test('says "Good form" once after a correction is fixed', () => {
    const coach = createVoiceCoach();
    coach.onPosture(bad, 10000);
    expect(coach.onPosture(good, 12000)).toBe('Good form');
    expect(coach.onPosture(good, 20000)).toBeNull();
  });

  test('stays silent when form was always correct', () => {
    expect(createVoiceCoach().onPosture(good, 10000)).toBeNull();
  });

  test('announces rep counts', () => {
    expect(createVoiceCoach().onRep(7, 1000)).toBe('7');
  });
});
