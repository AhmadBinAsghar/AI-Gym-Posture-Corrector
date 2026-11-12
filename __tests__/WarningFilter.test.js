import { createWarningFilter } from '../src/utils/warningFilter';

const BACK = 'Keep your back straight! 🧘';
const DEEP = 'Squatting too deep! Protect knees. ⚠️';

/** Feeds `raw` once per `dt` ms for `count` frames; returns every output. */
const feed = (filter, raw, count, start, dt = 50) =>
  Array.from({ length: count }, (_, i) => filter.update(raw, start + i * dt));

describe('warning filter (anti-flicker)', () => {
  test('a one-frame glitch never reaches the screen', () => {
    const f = createWarningFilter();
    const out = [
      ...feed(f, '', 10, 0),
      f.update(BACK, 500),
      ...feed(f, '', 10, 550),
    ];
    expect(out.every(w => w === '')).toBe(true);
  });

  test('a warning flickering on and off every frame is never shown', () => {
    const f = createWarningFilter();
    const out = [];
    for (let i = 0; i < 60; i++) out.push(f.update(i % 2 ? BACK : '', i * 50));
    expect(out.every(w => w === '')).toBe(true);
  });

  test('a persistent problem is shown, but only after the show delay', () => {
    const f = createWarningFilter({ showAfterMs: 700 });
    expect(f.update(BACK, 0)).toBe('');
    expect(f.update(BACK, 600)).toBe('');
    expect(f.update(BACK, 700)).toBe(BACK);
  });

  test('once shown, a warning stays readable for the hold time even if the body corrects', () => {
    const f = createWarningFilter({ showAfterMs: 700, clearAfterMs: 500, holdMs: 1800 });
    feed(f, BACK, 20, 0); // shown at t=700
    const out = feed(f, '', 30, 1000); // fixed at t=1000, but shown only since 700
    // clear needs 500 ms of calm AND 1800 ms on screen (until t=2500)
    expect(out[0]).toBe(BACK);
    expect(f.update('', 2400)).toBe(BACK);
    expect(f.update('', 2500)).toBe('');
  });

  test('briefly dipping back to correct does not clear a real problem', () => {
    const f = createWarningFilter({ clearAfterMs: 500, holdMs: 0 });
    feed(f, BACK, 40, 0);
    expect(f.update('', 3000)).toBe(BACK); // calm for 0 ms so far
    expect(f.update(BACK, 3100)).toBe(BACK); // bad again: calm timer restarts
    expect(f.update('', 3200)).toBe(BACK);
    expect(f.update('', 3750)).toBe(''); // 550 ms of calm: now it clears
  });

  test('switching between two different warnings does not flash between them', () => {
    const f = createWarningFilter();
    feed(f, BACK, 40, 0); // BACK shown
    const out = [];
    for (let i = 0; i < 40; i++) out.push(f.update(i % 2 ? DEEP : BACK, 2500 + i * 50));
    expect(new Set(out).size).toBe(1); // never changes while it keeps flipping
  });

  test('a new warning replaces the old one once it is stable and the hold has passed', () => {
    const f = createWarningFilter();
    feed(f, BACK, 40, 0);
    const out = feed(f, DEEP, 40, 3000);
    expect(out[0]).toBe(BACK);
    expect(out[out.length - 1]).toBe(DEEP);
  });

  test('after clearing, a new problem is not delayed by the old hold', () => {
    const f = createWarningFilter({ showAfterMs: 700, clearAfterMs: 500, holdMs: 1800 });
    feed(f, BACK, 60, 0);
    feed(f, '', 20, 4000); // cleared
    expect(f.update(DEEP, 6000)).toBe('');
    expect(f.update(DEEP, 6700)).toBe(DEEP);
  });

  test('reset clears everything', () => {
    const f = createWarningFilter();
    feed(f, BACK, 40, 0);
    f.reset();
    expect(f.update('', 5000)).toBe('');
  });
});
