import { test } from 'node:test';
import assert from 'node:assert/strict';
import { average12, computeStats, formatPercent, formatStat, mean3 } from '../js/stats.js';

const DNF = Infinity;
let n = 0;
// Attempt with a total time in seconds, or 'DNF'
const att = (t, memoCorrect = true) => ({
  number: ++n, result: t === 'DNF' ? 'DNF' : 'solved', totalTime: t === 'DNF' ? 50_000 : t * 1000, memoCorrect,
});

test('mo3: mean of three, any DNF makes it DNF', () => {
  assert.equal(mean3([60_000, 70_000, 80_000]), 70_000);
  assert.equal(mean3([60_000, 70_000, 80_010]), 70_000); // 70003.33 rounds to hundredths
  assert.equal(mean3([60_000, DNF, 80_000]), DNF);
  assert.equal(mean3([60_000, 70_000]), null);
});

test('ao12: drop best and worst; one DNF is dropped, two make it DNF', () => {
  const times = [50, 60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 100].map((s) => s * 1000);
  assert.equal(average12(times), 64_500); // mean of 60..69
  assert.equal(average12([...times.slice(0, 11), DNF]), 64_500); // DNF replaces the worst
  assert.equal(average12([...times.slice(0, 10), DNF, DNF]), DNF);
  assert.equal(average12(times.slice(0, 11)), null);
});

test('no attempts: everything is "-"', () => {
  const s = computeStats([]);
  assert.deepEqual(s, {
    attempts: 0, solved: 0, successRate: null, best: null, memoAccuracy: null,
    mo3: { current: null, best: null }, ao12: { current: null, best: null },
  });
  assert.equal(formatStat(s.best), '-');
  assert.equal(formatPercent(s.successRate), '-');
});

test('success rate, best single and memo accuracy', () => {
  const s = computeStats([att(90), att('DNF', false), att(75.5), att(80, false)]);
  assert.equal(s.attempts, 4);
  assert.equal(s.solved, 3);
  assert.equal(s.successRate, 0.75);
  assert.equal(s.best, 75_500);
  assert.equal(s.memoAccuracy, 0.5);
  assert.equal(formatPercent(s.successRate), '75.0%');
  assert.equal(formatStat(s.best), '1:15.50');
});

test('all DNF: best single is "-", mo3 is DNF', () => {
  const s = computeStats([att('DNF'), att('DNF'), att('DNF')]);
  assert.equal(s.best, null);
  assert.equal(s.successRate, 0);
  assert.equal(formatStat(s.mo3.current), 'DNF');
  assert.equal(formatStat(s.mo3.best), 'DNF');
});

test('current and best mo3 over a rolling window', () => {
  // windows: (90,80,70)=80, (80,70,DNF)=DNF, (70,DNF,100)=DNF, (DNF,100,60)=DNF, (100,60,65)=75
  const s = computeStats([att(90), att(80), att(70), att('DNF'), att(100), att(60), att(65)]);
  assert.equal(s.mo3.current, 75_000);
  assert.equal(s.mo3.best, 75_000);
  assert.equal(s.ao12.current, null);
  const s2 = computeStats([att(90), att(80), att(70), att('DNF')]);
  assert.equal(s2.mo3.current, DNF);
  assert.equal(s2.mo3.best, 80_000);
});

test('current and best ao12 over a rolling window', () => {
  const first12 = [70, 72, 74, 76, 78, 80, 82, 84, 86, 88, 90, 92].map((s) => att(s)); // ao12 = 81
  const s = computeStats([...first12, att('DNF'), att('DNF')]);
  // last 12 = 74..92 + DNF + DNF -> DNF; best is still the first 12
  assert.equal(s.ao12.current, DNF);
  assert.equal(s.ao12.best, 81_000);
  assert.equal(formatStat(s.ao12.best), '1:21.00');
});
