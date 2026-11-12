/**
 * Smooths the per-frame warning text so the banner (and the voice) don't flicker.
 *
 * The engine produces a fresh verdict ~15-30 times a second, and a body that is right
 * on a threshold flips between "bad" and "fine" on consecutive frames. Showing every
 * flip makes the banner blink and the coach chatter. This filter applies hysteresis:
 *  - a new warning must persist `showAfterMs` before it is shown
 *  - a clear ("all good") must persist `clearAfterMs` before it is shown
 *  - whatever is on screen stays at least `holdMs`, so it can be read
 * Pure logic: takes `now`, so it is unit-testable.
 */
export const createWarningFilter = ({ showAfterMs = 700, clearAfterMs = 500, holdMs = 1800 } = {}) => {
  let shown = '';
  let shownAt = -Infinity;
  let candidate = '';
  let candidateSince = 0;

  return {
    /** @returns {string} the warning to display right now ('' = none) */
    update(raw, now) {
      if (raw !== candidate) {
        candidate = raw;
        candidateSince = now;
      }
      if (candidate === shown) return shown;

      const needed = candidate === '' ? clearAfterMs : showAfterMs;
      // The hold only protects a warning that is currently readable on screen.
      const heldLongEnough = shown === '' || now - shownAt >= holdMs;
      if (now - candidateSince >= needed && heldLongEnough) {
        shown = candidate;
        shownAt = now;
      }
      return shown;
    },
    reset() {
      shown = '';
      shownAt = -Infinity;
      candidate = '';
      candidateSince = 0;
    },
  };
};
