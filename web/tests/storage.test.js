import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Cube } from '../js/cube.js';
import { buildAttempt } from '../js/timer.js';
import {
  CSV_COLUMNS, STORAGE_KEY, exportCsv, exportJson, importJson, loadHistory, nextAttemptNumber, saveHistory,
} from '../js/storage.js';

// In-memory stand-in for localStorage
function fakeStorage({ failWrites = false } = {}) {
  const data = new Map();
  return {
    getItem: (k) => (data.has(k) ? data.get(k) : null),
    setItem: (k, v) => { if (failWrites) throw new Error('QuotaExceeded'); data.set(k, String(v)); },
    data,
  };
}

function sampleHistory() {
  const cube = new Cube();
  cube.scrambleWca("F2 R D L D' B' L2 F R' F L2 U2 F2 B U2 B' D2 L2 U2");
  const times = { memo: 41_230, exec: 63_450, total: 104_680 };
  return [
    buildAttempt({ number: 1, scramble: "F2 R D L D' B' L2 F R' F L2 U2 F2 B U2 B' D2 L2 U2", cube,
      edges: 'zbaetxmcrckl', corners: 'mqgjzers', times, solved: true, date: new Date('2026-10-05T10:00:00Z') }),
    buildAttempt({ number: 2, scramble: "F2 R D L D' B' L2 F R' F L2 U2 F2 B U2 B' D2 L2 U2", cube,
      edges: 'ZB AE TX Mc Rc', corners: 'MQ "GJ" ZE', times, solved: false, date: new Date('2026-10-05T10:05:00Z') }),
  ];
}

test('save then load gives the identical history (survives reload)', () => {
  const storage = fakeStorage();
  const history = sampleHistory();
  assert.equal(saveHistory(storage, history), true);
  assert.deepEqual(loadHistory(storage), history);
});

test('empty, corrupt or invalid storage loads as an empty history', () => {
  assert.deepEqual(loadHistory(fakeStorage()), []);
  const storage = fakeStorage();
  storage.setItem(STORAGE_KEY, '{not json');
  assert.deepEqual(loadHistory(storage), []);
  storage.setItem(STORAGE_KEY, JSON.stringify([{ number: 'x' }]));
  assert.deepEqual(loadHistory(storage), []);
  const throwing = { getItem: () => { throw new Error('SecurityError'); } };
  assert.deepEqual(loadHistory(throwing), []);
});

test('saving reports failure instead of throwing', () => {
  assert.equal(saveHistory(fakeStorage({ failWrites: true }), sampleHistory()), false);
});

test('JSON export then import gives the identical history', () => {
  const history = sampleHistory();
  assert.deepEqual(importJson(exportJson(history)), history);
  assert.deepEqual(importJson(JSON.stringify(history)), history); // a bare list also works
});

test('import rejects bad files with a readable message', () => {
  assert.throws(() => importJson('hello'), /not valid JSON/);
  assert.throws(() => importJson('{"attempts": 3}'), /No attempts/);
  const [good] = sampleHistory();
  const bad = (change) => JSON.stringify([{ ...good, ...change }]);
  assert.throws(() => importJson(bad({ result: 'maybe' })), /result must be/);
  assert.throws(() => importJson(bad({ totalTime: 1 })), /must equal total/);
  assert.throws(() => importJson(bad({ memo: { edges: 'A' } })), /"memo" needs edges and corners/);
  assert.throws(() => importJson(bad({ date: 'yesterday' })), /not a date/);
  assert.throws(() => importJson(JSON.stringify([good, { ...good, number: '2' }])), /Attempt 2: "number"/);
});

test('CSV export: header, seconds, quoted cells', () => {
  const lines = exportCsv(sampleHistory()).trimEnd().split('\n');
  assert.equal(lines.length, 3);
  assert.equal(lines[0], CSV_COLUMNS.join(','));
  assert.ok(lines[1].startsWith('"1","2026-10-05T10:00:00.000Z","solved","104.68","41.23","63.45","true",'));
  assert.ok(lines[2].includes('"MQ ""GJ"" ZE"'), 'quotes inside a cell are doubled');
  assert.ok(lines[2].includes('"DNF"') && lines[2].includes('"false"'));
});

test('next attempt number follows the highest saved number', () => {
  assert.equal(nextAttemptNumber([]), 1);
  assert.equal(nextAttemptNumber(sampleHistory()), 3);
  assert.equal(nextAttemptNumber([{ number: 7 }, { number: 3 }]), 8);
});
