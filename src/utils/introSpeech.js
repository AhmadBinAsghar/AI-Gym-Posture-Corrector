/** What the coach says once when a workout begins, so the user can set up the phone. */
const INTROS = {
  'Deep Squats':
    'Deep squats. Place your phone a few meters away, facing your side, so your whole body is in the frame. Then start squatting.',
  'Bicep Curls':
    'Bicep curls. Put the phone at chest height facing you, so your shoulder, arm and hand fill the frame. Then start curling.',
  Pushups:
    'Pushups. Stand your phone sideways on the floor, a couple of meters to your side, so your whole body is in the frame. Then start your pushups.',
};

const DEFAULT_INTRO = 'Place your phone so your whole body is in the frame, then start.';

export const introFor = exercise => INTROS[exercise] || DEFAULT_INTRO;
