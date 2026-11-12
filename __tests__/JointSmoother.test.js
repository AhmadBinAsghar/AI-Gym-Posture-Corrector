import { createJointSmoother } from '../src/utils/jointSmoother';

const makeRandom = seed => {
  let s = seed;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
};

const std = values => {
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  return Math.sqrt(values.reduce((a, b) => a + (b - mean) ** 2, 0) / values.length);
};

describe('joint smoother (skeleton shiver)', () => {
  test('a joint held still with +-10px landmark jitter barely moves on screen', () => {
    const random = makeRandom(3);
    const smoother = createJointSmoother();
    const raws = [];
    const xs = [];
    for (let i = 0; i < 90; i++) {
      const x = 140 + (random() - 0.5) * 20;
      raws.push(x);
      xs.push(smoother.smooth({ leftShoulder: { x, y: 100, correct: true } }, i * 66).leftShoulder.x);
    }
    // After settling, the drawn joint shivers at under half the raw landmark jitter.
    expect(std(xs.slice(15))).toBeLessThan(0.5 * std(raws.slice(15)));
  });

  test('a fast-moving wrist is followed closely, not dragged behind', () => {
    const smoother = createJointSmoother();
    let last;
    // a curl: wrist rises 150px in 400ms at ~15 frames/s
    for (let i = 0; i <= 6; i++) {
      last = smoother.smooth({ leftWrist: { x: 100, y: 270 - 25 * i } }, i * 66).leftWrist;
    }
    expect(Math.abs(last.y - 120)).toBeLessThan(30);
  });

  test('keeps other fields (form colour) and passes missing joints through', () => {
    const smoother = createJointSmoother();
    const out = smoother.smooth({ leftElbow: { x: 1, y: 2, correct: false } }, 0);
    expect(out.leftElbow).toEqual({ x: 1, y: 2, correct: false });
    expect(smoother.smooth({}, 66)).toEqual({});
  });

  test('a joint that reappears after a gap jumps to its new place instead of gliding', () => {
    const smoother = createJointSmoother();
    smoother.smooth({ leftWrist: { x: 0, y: 0 } }, 0);
    const back = smoother.smooth({ leftWrist: { x: 200, y: 200 } }, 1000).leftWrist;
    expect(back).toEqual({ x: 200, y: 200 });
  });
});
