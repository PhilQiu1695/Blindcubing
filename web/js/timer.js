// BLD timer with memo split, plus attempt records. DOM-free so it can be tested in Node.
import { checkMemo, traceMemo } from './memo.js';

/**
 * Phases: 'idle' -> press -> 'memo' -> press (blindfold on) -> 'exec' -> press -> 'done'.
 * Times are in milliseconds from an injectable clock (performance.now in the browser).
 */
export class BldTimer {
  constructor(now = () => performance.now()) {
    this.now = now;
    this.reset();
  }

  reset() {
    this.phase = 'idle';
    this.start = null;
    this.split = null;
    this.end = null;
  }

  /** Advance one phase; returns the new phase. Does nothing once done (call reset). */
  press() {
    const t = this.now();
    if (this.phase === 'idle') {
      this.phase = 'memo';
      this.start = t;
    } else if (this.phase === 'memo') {
      this.phase = 'exec';
      this.split = t;
    } else if (this.phase === 'exec') {
      this.phase = 'done';
      this.end = t;
    }
    return this.phase;
  }

  /** Abandon a running attempt (Esc). Nothing is kept. */
  cancel() {
    this.reset();
  }

  get running() {
    return this.phase === 'memo' || this.phase === 'exec';
  }

  /** { memo, exec, total } in ms; running phases use the current time. */
  times() {
    if (this.phase === 'idle') return { memo: 0, exec: 0, total: 0 };
    const t = this.phase === 'done' ? this.end : this.now();
    const split = this.split ?? t;
    // Round each part to 0.01 s first so memo + exec always equals the shown total
    const memo = roundCs(split - this.start);
    const exec = this.phase === 'memo' ? 0 : roundCs(t - split);
    return { memo, exec, total: memo + exec };
  }
}

const roundCs = (ms) => Math.round(ms / 10) * 10;

/** 45670 -> "45.67", 83450 -> "1:23.45", null -> "-". */
export function formatTime(ms) {
  if (ms === null || ms === undefined) return '-';
  const cs = Math.round(ms / 10);
  const minutes = Math.floor(cs / 6000);
  const seconds = Math.floor((cs % 6000) / 100);
  const hundredths = String(cs % 100).padStart(2, '0');
  return minutes ? `${minutes}:${String(seconds).padStart(2, '0')}.${hundredths}` : `${seconds}.${hundredths}`;
}

/**
 * Build the record saved for one timed attempt.
 * The memo is checked automatically; solved/DNF is what the player reports.
 */
export function buildAttempt({ number, scramble, cube, edges, corners, times, solved, date = new Date() }) {
  const check = checkMemo(cube, edges, corners);
  const [refEdges, refCorners] = traceMemo(cube);
  return {
    number,
    scramble,
    memo: { edges, corners },
    reference: { edges: refEdges, corners: refCorners },
    memoTime: times.memo,
    execTime: times.exec,
    totalTime: times.total,
    result: solved ? 'solved' : 'DNF',
    memoCorrect: check.correct,
    memoMessages: check.messages,
    date: date.toISOString(),
  };
}

/**
 * Press/release handling, like a cubing timer. Starting memo and starting execution
 * happen on release (hold, then let go); stopping happens on press, so the time
 * isn't padded by lifting the finger. Same rules for the space bar and for touch.
 */
export class TimerControls {
  /** canStart() says whether a new attempt may begin (e.g. not after Show answer). */
  constructor(timer, canStart = () => true) {
    this.timer = timer;
    this.canStart = canStart;
    this.armed = false;
  }

  /** Key/finger down. Returns 'stopped', 'armed', 'blocked' or null (nothing to do). */
  down() {
    const { phase } = this.timer;
    if (phase === 'exec') {
      this.armed = false;
      this.timer.press();
      return 'stopped';
    }
    if (phase === 'done') return null;
    if (phase === 'idle' && !this.canStart()) return 'blocked';
    this.armed = true;
    return 'armed';
  }

  /** Key/finger up. Returns the new phase if the timer advanced, otherwise null. */
  up() {
    if (!this.armed) return null;
    this.armed = false;
    return this.timer.press();
  }

  /** Forget a hold without acting (Esc, finger slid off, window lost focus). */
  release() {
    this.armed = false;
  }
}
