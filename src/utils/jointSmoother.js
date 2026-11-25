/**
 * Steadies the drawn skeleton. ML Kit's landmarks jitter by 10-20px from frame to frame even
 * on a body standing still (measured on-device: a resting shoulder read x = 129, 150, 137,
 * 132 within a second), and drawing them raw made the skeleton visibly shiver.
 *
 * Each joint coordinate goes through a One Euro filter (Casiez et al., 2012): a low-pass
 * filter whose cutoff rises with the joint's speed, so a still joint is smoothed hard while
 * a fast-moving one (a wrist mid-curl) follows with almost no lag.
 *
 * Display only: the PostureEngine still scores the raw landmarks.
 */

const DEFAULTS = {
  // Live squats: 0.6 Hz / 0.007 left the knee up to 31px behind on fast moves (felt slow).
  // 1.0 / 0.01 cuts that to 24px (avg 6.7 -> 5.0px) and still passes the hold-still shiver
  // test; 0.015 and up let the jitter through again.
  minCutoff: 1.0, // Hz: smoothing for a joint at rest; lower = steadier but laggier
  // How quickly the cutoff opens up with speed (px/s). Higher let the jitter itself (~150px/s
  // of frame-to-frame noise) count as motion and pass straight through.
  beta: 0.01,
  dCutoff: 1.0, // Hz: smoothing of the speed estimate itself
  resetAfterMs: 400, // a joint unseen for this long starts afresh instead of gliding back
};

const alpha = (cutoffHz, dtSec) => {
  const tau = 1 / (2 * Math.PI * cutoffHz);
  return 1 / (1 + tau / dtSec);
};

const createAxisFilter = opts => {
  let prev = null; // { x, dx, t }
  return {
    filter(value, tMs) {
      if (!prev || tMs - prev.t > opts.resetAfterMs || tMs <= prev.t) {
        prev = { x: value, dx: 0, t: tMs };
        return value;
      }
      const dt = (tMs - prev.t) / 1000;
      const rawDx = (value - prev.x) / dt;
      const dx = prev.dx + alpha(opts.dCutoff, dt) * (rawDx - prev.dx);
      const cutoff = opts.minCutoff + opts.beta * Math.abs(dx);
      const x = prev.x + alpha(cutoff, dt) * (value - prev.x);
      prev = { x, dx, t: tMs };
      return x;
    },
  };
};

export const createJointSmoother = (options = {}) => {
  const opts = { ...DEFAULTS, ...options };
  const filters = {};

  return {
    /** Returns a copy of `joints` with smoothed x/y; every other field is kept as-is. */
    smooth(joints, tMs) {
      if (!joints) return joints;
      const out = {};
      for (const name of Object.keys(joints)) {
        const j = joints[name];
        if (!j || typeof j.x !== 'number' || typeof j.y !== 'number') {
          out[name] = j;
          continue;
        }
        if (!filters[name]) filters[name] = { x: createAxisFilter(opts), y: createAxisFilter(opts) };
        out[name] = { ...j, x: filters[name].x.filter(j.x, tMs), y: filters[name].y.filter(j.y, tMs) };
      }
      return out;
    },
  };
};
