/**
 * Spoken nudge when the camera has not seen the user for a while: "I can't see you".
 *  - waits `afterMs` of continuous absence before the first reminder
 *  - repeats at most every `repeatMs`
 *  - stays quiet for `graceMs` after the workout starts so it never talks over the
 *    spoken set-up instructions
 * Pure logic: takes `now`, so it is unit-testable.
 *
 * The wording is per exercise because "step back so your whole body is in the frame" is only
 * true of squats: a curl needs the arm close to the camera, not the user further away, so
 * telling a curler to step back sent them in exactly the wrong direction.
 */
const REMINDERS = {
  'Deep Squats': "I can't see you. Please step back so your whole body is in the frame.",
  'Bicep Curls': "I can't see you. Come a little closer so your shoulder, arm and hand fill the outline.",
  Pushups: "I can't see you. Line your whole body up with the outline.",
};

export const REMINDER_TEXT = REMINDERS['Deep Squats'];

/** The "I can't see you" line for this exercise. */
export const reminderFor = exercise => REMINDERS[exercise] || REMINDER_TEXT;

export const createPresenceReminder = ({ afterMs = 8000, repeatMs = 20000, graceMs = 14000 } = {}) => {
  let startedAt = null;
  let lostSince = null;
  let lastSpokenAt = -Infinity;

  return {
    /** @returns {string|null} text to speak, or null */
    update(isTracking, now) {
      if (startedAt === null) startedAt = now;
      if (isTracking) {
        lostSince = null;
        return null;
      }
      if (lostSince === null) lostSince = now;
      if (now - startedAt < graceMs) return null;
      if (now - lostSince >= afterMs && now - lastSpokenAt >= repeatMs) {
        lastSpokenAt = now;
        return REMINDER_TEXT;
      }
      return null;
    },
    /** Call while paused/muted so the absence timer restarts when speech is allowed again. */
    hold() {
      lostSince = null;
    },
  };
};
