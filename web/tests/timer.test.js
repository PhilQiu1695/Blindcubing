import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Cube } from '../js/cube.js';
import { BldTimer, TimerControls, buildAttempt, formatTime } from '../js/timer.js';

function fakeClock(start = 1000) {
  const clock = { t: start, now: () => clock.t, advance: (ms) => { clock.t += ms; } };
  return clock;
}

test('three presses: memo, then execution, then stop', () => {
  const clock = fakeClock();
  const timer = new BldTimer(clock.now);
  assert.equal(timer.phase, 'idle');
  assert.equal(timer.press(), 'memo');
  clock.advance(42_317);
  assert.deepEqual(timer.times(), { memo: 42_320, exec: 0, total: 42_320 }); // running memo
  assert.equal(timer.press(), 'exec');
  clock.advance(65_004);
  assert.equal(timer.press(), 'done');
  assert.deepEqual(timer.times(), { memo: 42_320, exec: 65_000, total: 107_320 });
  clock.advance(5_000);
  assert.deepEqual(timer.times().total, 107_320, 'stopped time does not keep running');
  assert.equal(timer.press(), 'done', 'extra presses do nothing until reset');
});

test('split times always add up to the total', () => {
  const clock = fakeClock(0);
  for (let i = 0; i < 1000; i++) {
    const timer = new BldTimer(clock.now);
    timer.press();
    clock.advance(Math.random() * 120_000);
    timer.press();
    clock.advance(Math.random() * 120_000);
    timer.press();
    const { memo, exec, total } = timer.times();
    assert.equal(memo + exec, total);
    assert.equal(total % 10, 0, 'whole hundredths');
  }
});

test('cancel (Esc) mid-attempt keeps nothing', () => {
  const clock = fakeClock();
  const timer = new BldTimer(clock.now);
  timer.press();
  clock.advance(10_000);
  timer.press();
  timer.cancel();
  assert.equal(timer.phase, 'idle');
  assert.equal(timer.running, false);
  assert.deepEqual(timer.times(), { memo: 0, exec: 0, total: 0 });
});

test('time formatting', () => {
  assert.equal(formatTime(45_670), '45.67');
  assert.equal(formatTime(83_450), '1:23.45');
  assert.equal(formatTime(5_005), '5.01');
  assert.equal(formatTime(600_000), '10:00.00');
  assert.equal(formatTime(0), '0.00');
  assert.equal(formatTime(null), '-');
});

test('attempt record has every stored field and checks the memo', () => {
  const cube = new Cube();
  cube.scrambleWca("F2 R D L D' B' L2 F R' F L2 U2 F2 B U2 B' D2 L2 U2"); // tutorial case 3
  const times = { memo: 40_000, exec: 60_000, total: 100_000 };
  const date = new Date('2026-10-05T12:00:00Z');
  const ok = buildAttempt({ number: 3, scramble: 'F2 R …', cube, edges: 'zbaetxmcrckl', corners: 'mqgjzers',
    times, solved: true, date });
  assert.deepEqual(ok, {
    number: 3,
    scramble: 'F2 R …',
    memo: { edges: 'zbaetxmcrckl', corners: 'mqgjzers' },
    reference: { edges: 'ZB AE TX Mc Rc (kl)', corners: 'MQ GJ ZE (rs)' },
    memoTime: 40_000,
    execTime: 60_000,
    totalTime: 100_000,
    result: 'solved',
    memoCorrect: true,
    memoMessages: [],
    date: '2026-10-05T12:00:00.000Z',
  });

  const dnf = buildAttempt({ number: 4, scramble: 'x', cube, edges: 'ZB AE TX Mc Rc', corners: 'MQ GJ ZE (rs)',
    times, solved: false, date });
  assert.equal(dnf.result, 'DNF');
  assert.equal(dnf.memoCorrect, false);
  assert.deepEqual(dnf.memoMessages, ['Edges: memo leaves UF, DL unsolved']);
});

test('controls: memo and execution start on release, stop happens on press', () => {
  const clock = fakeClock(0);
  const timer = new BldTimer(clock.now);
  const controls = new TimerControls(timer);

  assert.equal(controls.down(), 'armed');
  clock.advance(800);                       // holding does not start the clock
  assert.equal(timer.phase, 'idle');
  assert.equal(controls.up(), 'memo');      // release starts memo
  clock.advance(30_000);
  assert.equal(controls.down(), 'armed');
  clock.advance(500);                       // still memo while held
  assert.equal(timer.phase, 'memo');
  assert.equal(controls.up(), 'exec');      // second release starts execution
  clock.advance(60_000);
  assert.equal(controls.down(), 'stopped'); // stop on press
  assert.equal(timer.phase, 'done');
  clock.advance(400);
  assert.equal(controls.up(), null, 'releasing after the stop does nothing');
  assert.deepEqual(timer.times(), { memo: 30_500, exec: 60_000, total: 90_500 });
  assert.equal(controls.down(), null, 'nothing happens once stopped');
});

test('controls: held key repeats and cancelled holds do nothing', () => {
  const timer = new BldTimer(fakeClock().now);
  const controls = new TimerControls(timer);
  assert.equal(controls.up(), null, 'release without a press');
  controls.down();
  controls.release();                       // e.g. finger slid off the timer
  assert.equal(controls.up(), null);
  assert.equal(timer.phase, 'idle');
});

test('controls: a blocked start is reported and never arms', () => {
  const timer = new BldTimer(fakeClock().now);
  let allowed = false;
  const controls = new TimerControls(timer, () => allowed);
  assert.equal(controls.down(), 'blocked');
  assert.equal(controls.up(), null);
  assert.equal(timer.phase, 'idle');
  allowed = true;
  assert.equal(controls.down(), 'armed');
  assert.equal(controls.up(), 'memo');
});
