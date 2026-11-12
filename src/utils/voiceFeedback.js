/**
 * Decides WHEN to speak so the trainer is helpful rather than noisy.
 *  - A new correction is spoken immediately.
 *  - The same correction repeats only after `repeatMs`.
 *  - A short "good form" cue is given when posture returns to correct.
 *  - Rep counts are announced.
 * Pure logic: takes `now` so it is unit-testable.
 */
export const createVoiceCoach = ({ repeatMs = 5000, minGapMs = 1500 } = {}) => {
  let lastWarning = '';
  let lastSpokenAt = -Infinity;
  let hadWarning = false;

  const strip = text => text.replace(/[^\p{L}\p{N}\s,.'!?-]/gu, '').trim();

  return {
    /** @returns {string|null} text to speak, or null */
    onPosture({ isPostureCorrect, warning }, now) {
      if (!isPostureCorrect && warning) {
        const isNew = warning !== lastWarning;
        const due = now - lastSpokenAt >= (isNew ? minGapMs : repeatMs);
        if (due) {
          lastWarning = warning;
          lastSpokenAt = now;
          hadWarning = true;
          return strip(warning);
        }
        return null;
      }
      if (hadWarning && isPostureCorrect && now - lastSpokenAt >= minGapMs) {
        hadWarning = false;
        lastWarning = '';
        lastSpokenAt = now;
        return 'Good form';
      }
      return null;
    },
    onRep(reps, now) {
      lastSpokenAt = now;
      return String(reps);
    },
    reset() {
      lastWarning = '';
      lastSpokenAt = -Infinity;
      hadWarning = false;
    },
  };
};
