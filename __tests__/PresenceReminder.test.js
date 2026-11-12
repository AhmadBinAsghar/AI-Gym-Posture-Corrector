import { createPresenceReminder, REMINDER_TEXT } from '../src/utils/presenceReminder';

const opts = { afterMs: 8000, repeatMs: 20000, graceMs: 14000 };

/** Calls update once per second from `from` to `to` (seconds) and returns every spoken line. */
const tick = (reminder, isTracking, from, to) => {
  const spoken = [];
  for (let s = from; s <= to; s++) {
    const text = reminder.update(isTracking, s * 1000);
    if (text) spoken.push({ at: s, text });
  }
  return spoken;
};

describe('presence reminder', () => {
  test('never speaks while the user is in frame', () => {
    expect(tick(createPresenceReminder(opts), true, 0, 120)).toEqual([]);
  });

  test('stays quiet during the start-up grace period so it cannot talk over the intro', () => {
    const spoken = tick(createPresenceReminder(opts), false, 0, 13);
    expect(spoken).toEqual([]);
  });

  test('speaks once the user has been missing long enough, after the grace period', () => {
    const spoken = tick(createPresenceReminder(opts), false, 0, 20);
    expect(spoken).toEqual([{ at: 14, text: REMINDER_TEXT }]);
  });

  test('repeats at most every 20 seconds', () => {
    const spoken = tick(createPresenceReminder(opts), false, 0, 70);
    expect(spoken.map(s => s.at)).toEqual([14, 34, 54]);
  });

  test('a short absence does not trigger it', () => {
    const r = createPresenceReminder(opts);
    tick(r, true, 0, 20);
    expect(tick(r, false, 21, 26)).toEqual([]); // only 6 s missing
    expect(tick(r, true, 27, 40)).toEqual([]); // back in frame
  });

  test('the absence timer restarts after the user returns', () => {
    const r = createPresenceReminder(opts);
    tick(r, true, 0, 20);
    tick(r, false, 21, 26);
    tick(r, true, 27, 28); // came back briefly
    expect(tick(r, false, 29, 35)).toEqual([]); // 7 s since leaving again
    expect(tick(r, false, 36, 38).length).toBe(1); // 8 s reached
  });

  test('speech paused or muted: the timer restarts when allowed again', () => {
    const r = createPresenceReminder(opts);
    tick(r, false, 0, 13);
    r.hold(); // user pauses at t=13 (muted for a while)
    expect(r.update(false, 40000)).toBeNull(); // first update after resuming starts the timer
    expect(r.update(false, 47000)).toBeNull();
    expect(r.update(false, 48000)).toBe(REMINDER_TEXT);
  });

  test('the wording is plain speech with no symbols', () => {
    expect(REMINDER_TEXT).toMatch(/can't see you/i);
    expect(REMINDER_TEXT).toMatch(/frame/i);
  });
});
