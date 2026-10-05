// Statistics over saved attempts. DOM-free so it can be tested in Node.
//
// Values are total times in ms. A DNF counts as Infinity, so it is always the worst;
// null means "not enough attempts" (shown as "-").
import { formatTime } from './timer.js';

const DNF = Infinity;

/** Total time of an attempt, or Infinity for a DNF. */
export const attemptValue = (attempt) => (attempt.result === 'solved' ? attempt.totalTime : DNF);

// Averages are rounded to 0.01 s, like WCA results
const roundCs = (ms) => (Number.isFinite(ms) ? Math.round(ms / 10) * 10 : ms);

/** Mean of 3: any DNF makes it DNF. */
export function mean3(values) {
  if (values.length !== 3) return null;
  return roundCs(values.reduce((a, b) => a + b, 0) / 3);
}

/** Average of 12: drop the best and worst, mean of the other 10. Two or more DNFs make it DNF. */
export function average12(values) {
  if (values.length !== 12) return null;
  const middle = [...values].sort((a, b) => a - b).slice(1, -1);
  return roundCs(middle.reduce((a, b) => a + b, 0) / middle.length);
}

/** Current (last n) and best (over every run of n in a row) for a window statistic. */
function rolling(values, n, statistic) {
  if (values.length < n) return { current: null, best: null };
  let best = DNF;
  for (let i = 0; i + n <= values.length; i++) best = Math.min(best, statistic(values.slice(i, i + n)));
  return { current: statistic(values.slice(-n)), best };
}

/**
 * All statistics for a history (oldest first):
 * attempts, solved, successRate (0-1 or null), best single, memoAccuracy (0-1 or null),
 * mo3 { current, best }, ao12 { current, best }.
 */
export function computeStats(history) {
  const values = history.map(attemptValue);
  const solved = history.filter((a) => a.result === 'solved').length;
  const memoCorrect = history.filter((a) => a.memoCorrect).length;
  const best = values.length ? Math.min(...values) : null;
  return {
    attempts: history.length,
    solved,
    successRate: history.length ? solved / history.length : null,
    best: best === DNF ? null : best,           // no solves yet -> "-"
    memoAccuracy: history.length ? memoCorrect / history.length : null,
    mo3: rolling(values, 3, mean3),
    ao12: rolling(values, 12, average12),
  };
}

/** Display a statistic: null -> "-", DNF -> "DNF", otherwise a time. */
export function formatStat(ms) {
  if (ms === null || ms === undefined) return '-';
  if (ms === DNF) return 'DNF';
  return formatTime(ms);
}

/** 0.6667 -> "66.7%", null -> "-" */
export function formatPercent(fraction) {
  return fraction === null ? '-' : `${(fraction * 100).toFixed(1)}%`;
}
