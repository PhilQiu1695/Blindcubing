// Saving attempt history in the browser, plus export/import. DOM-free so it can be tested in Node.

export const STORAGE_KEY = 'bld-trainer:history:v1';

// Required fields of an attempt record and their types (see buildAttempt in timer.js)
const FIELDS = {
  number: 'number',
  scramble: 'string',
  memo: 'object',
  reference: 'object',
  memoTime: 'number',
  execTime: 'number',
  totalTime: 'number',
  result: 'string',
  memoCorrect: 'boolean',
  memoMessages: 'object',
  date: 'string',
};

/** Returns an error message for an invalid attempt record, or null if it is valid. */
export function attemptError(attempt, index = 0) {
  const where = `Attempt ${index + 1}`;
  if (typeof attempt !== 'object' || attempt === null) return `${where} is not a record`;
  for (const [field, type] of Object.entries(FIELDS)) {
    if (typeof attempt[field] !== type || attempt[field] === null) return `${where}: "${field}" is missing or not a ${type}`;
  }
  for (const part of ['memo', 'reference']) {
    if (typeof attempt[part].edges !== 'string' || typeof attempt[part].corners !== 'string') {
      return `${where}: "${part}" needs edges and corners`;
    }
  }
  if (!['solved', 'DNF'].includes(attempt.result)) return `${where}: result must be "solved" or "DNF"`;
  if (!Array.isArray(attempt.memoMessages)) return `${where}: "memoMessages" must be a list`;
  if (attempt.memoTime + attempt.execTime !== attempt.totalTime) return `${where}: memo + execution time must equal total`;
  if (Number.isNaN(Date.parse(attempt.date))) return `${where}: "date" is not a date`;
  return null;
}

/**
 * Load history from storage (localStorage in the browser). Any storage error or
 * corrupt data gives an empty history rather than breaking the page.
 */
export function loadHistory(storage) {
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const history = JSON.parse(raw);
    if (!Array.isArray(history) || history.some((a, i) => attemptError(a, i))) return [];
    return history;
  } catch {
    return [];
  }
}

/** Save history; returns false if the browser refuses (private mode, full storage). */
export function saveHistory(storage, history) {
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(history));
    return true;
  } catch {
    return false;
  }
}

/** JSON export: the records exactly as stored. */
export function exportJson(history) {
  return JSON.stringify({ app: 'bld-trainer', version: 1, attempts: history }, null, 2);
}

/** Parse a JSON export. Throws an Error with a readable message if the file isn't valid. */
export function importJson(text) {
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error('This file is not valid JSON');
  }
  const attempts = Array.isArray(data) ? data : data?.attempts;
  if (!Array.isArray(attempts)) throw new Error('No attempts found in this file');
  attempts.forEach((attempt, i) => {
    const error = attemptError(attempt, i);
    if (error) throw new Error(error);
  });
  return attempts;
}

const seconds = (ms) => (ms / 1000).toFixed(2);
const csvCell = (value) => `"${String(value).replace(/"/g, '""')}"`;

export const CSV_COLUMNS = [
  'number', 'date', 'result', 'total_s', 'memo_s', 'execution_s', 'memo_correct',
  'scramble', 'user_edges', 'user_corners', 'reference_edges', 'reference_corners',
];

/** CSV export for spreadsheets (times in seconds). */
export function exportCsv(history) {
  const rows = history.map((a) => [
    a.number, a.date, a.result, seconds(a.totalTime), seconds(a.memoTime), seconds(a.execTime),
    a.memoCorrect, a.scramble, a.memo.edges, a.memo.corners, a.reference.edges, a.reference.corners,
  ].map(csvCell).join(','));
  return [CSV_COLUMNS.join(','), ...rows].join('\n') + '\n';
}

/** Next attempt number: one more than the highest saved (imports may not start at 1). */
export function nextAttemptNumber(history) {
  return history.reduce((max, a) => Math.max(max, a.number), 0) + 1;
}
