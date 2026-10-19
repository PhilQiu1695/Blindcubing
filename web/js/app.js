// Web UI wiring: same features as the CLI trainer (trainer.py).
import { Cube } from './cube.js';
import { checkMemo, parseMemo, traceMemo } from './memo.js';
import { generateScramble } from './scramble.js';
import { netSvg, scrambleError } from './render.js';
import { createCube3D } from './cube3d.js';
import { BldTimer, TimerControls, buildAttempt, formatTime } from './timer.js';
import { computeStats, formatPercent, formatStat } from './stats.js';
import { exportCsv, exportJson, importJson, loadHistory, nextAttemptNumber, saveHistory } from './storage.js';
import { LANG_KEY, applyTranslations, pickLanguage, t, translateMessage } from './i18n.js';
import { MAX_MESSAGE, feedbackContext, feedbackError, feedbackPayload, sendFeedback } from './feedback.js';
import { startAnalytics, trackEvent } from './analytics.js';
import { GOATCOUNTER_CODE, WEB3FORMS_ACCESS_KEY } from './config.js';

// localStorage can be unavailable (privacy settings); fall back to a store that never keeps anything
const storage = (() => {
  try {
    return window.localStorage;
  } catch {
    return { getItem: () => null, setItem: () => { throw new Error('storage unavailable'); } };
  }
})();

const $ = (id) => document.getElementById(id);

const params = new URLSearchParams(location.search);
let lang = pickLanguage({
  param: params.get('lang'),
  saved: (() => { try { return storage.getItem(LANG_KEY); } catch { return null; } })(),
  browser: navigator.languages ?? [navigator.language],
});
const tr = (key, vars) => t(lang, key, vars);
const msg = (message) => translateMessage(lang, message);

const state = {
  scramble: '',
  cube: new Cube(),
  answerSeen: false,   // Show answer used on this scramble (blocks timing it)
  view: '3d',
  letters: false,
  showSolved: false,
  attemptSaved: false, // one timed attempt per scramble
  history: loadHistory(storage), // timed attempt records, oldest first
  lastTimes: null,     // times kept on screen after an attempt is saved
  idleNote: null,      // () => status message shown while the timer is idle (re-read on language change)
};

const timer = new BldTimer();
// A new attempt can't start once this scramble was saved or its answer shown
const controls = new TimerControls(timer, () => !state.attemptSaved && !state.answerSeen);

const cube3d = createCube3D($('cube3d-container'));

function escapeHtml(s) {
  return s.replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));
}

function renderCube() {
  const cube = state.showSolved ? new Cube() : state.cube;
  cube3d.update(cube, { letters: state.letters });
  $('view-net').innerHTML = netSvg(cube, { letters: state.letters });
  $('view-3d').hidden = state.view !== '3d';
  $('view-net').hidden = state.view !== 'net';
}

function setScramble(scramble) {
  state.attemptSaved = false;
  state.lastTimes = null;
  state.idleNote = null;
  timer.reset();
  renderTimer();
  state.scramble = scramble;
  state.cube = new Cube();
  state.cube.scrambleWca(scramble);
  state.answerSeen = false;
  state.showSolved = false;
  setPressed('state', 'scramble');
  renderScrambleText();
  $('edge-memo').value = '';
  $('corner-memo').value = '';
  $('result').hidden = true;
  renderCube();
}

function renderScrambleText() {
  $('scramble-text').textContent = state.scramble || tr('scramble.solvedCube');
}

function referenceHtml() {
  const [edges, corners] = traceMemo(state.cube);
  return `<dl><dt>${tr('memo.edges')}</dt><dd>${escapeHtml(edges) || tr('result.solvedPart')}</dd>`
    + `<dt>${tr('memo.corners')}</dt><dd>${escapeHtml(corners) || tr('result.solvedPart')}</dd></dl>`;
}

function showResult(kind, html) {
  const box = $('result');
  box.className = `result ${kind}`;
  box.innerHTML = html;
  box.hidden = false;
}

// ---- Statistics & history ----

function statTile(label, value, sub = '') {
  return `<div class="stat"><div class="stat-label">${label}</div><div class="stat-value">${value}</div>`
    + (sub ? `<div class="stat-sub">${sub}</div>` : '') + '</div>';
}

function renderStats() {
  const s = computeStats(state.history);
  $('stats').innerHTML = [
    statTile(tr('stats.attempts'), String(s.attempts), tr('stats.solvedCount', { n: s.solved })),
    statTile(tr('stats.successRate'), formatPercent(s.successRate)),
    statTile(tr('stats.best'), formatStat(s.best)),
    statTile('mo3', formatStat(s.mo3.current), tr('stats.bestOf', { time: formatStat(s.mo3.best) })),
    statTile('ao12', formatStat(s.ao12.current), tr('stats.bestOf', { time: formatStat(s.ao12.best) })),
    statTile(tr('stats.memoAccuracy'), formatPercent(s.memoAccuracy)),
  ].join('');

  const rows = [...state.history].reverse().map((a) => {
    const date = new Date(a.date).toLocaleString(lang === 'zh' ? 'zh-CN' : undefined, { dateStyle: 'short', timeStyle: 'short' });
    const details = `<details><summary>${tr('stats.show')}</summary><dl>`
      + `<dt>${tr('stats.d.scramble')}</dt><dd>${escapeHtml(a.scramble)}</dd>`
      + `<dt>${tr('stats.d.yourEdges')}</dt><dd>${escapeHtml(a.memo.edges) || '-'}</dd>`
      + `<dt>${tr('stats.d.yourCorners')}</dt><dd>${escapeHtml(a.memo.corners) || '-'}</dd>`
      + `<dt>${tr('stats.d.refEdges')}</dt><dd>${escapeHtml(a.reference.edges) || tr('result.solvedPart')}</dd>`
      + `<dt>${tr('stats.d.refCorners')}</dt><dd>${escapeHtml(a.reference.corners) || tr('result.solvedPart')}</dd>`
      + `</dl></details>`;
    return `<tr><td>${a.number}</td>`
      + `<td class="${a.result === 'DNF' ? 'dnf' : 'ok'}">${a.result === 'DNF' ? 'DNF' : tr('memo.solved')}</td>`
      + `<td>${formatTime(a.totalTime)}</td><td>${formatTime(a.memoTime)}</td><td>${formatTime(a.execTime)}</td>`
      + `<td>${tr(a.memoCorrect ? 'stats.correct' : 'stats.wrong')}</td><td>${escapeHtml(date)}</td><td>${details}</td></tr>`;
  });
  $('history').tBodies[0].innerHTML = rows.join('');
  $('history').hidden = state.history.length === 0;
  $('history-empty').hidden = state.history.length > 0;
}

function persist() {
  if (!saveHistory(storage, state.history)) {
    $('history-note').textContent = tr('stats.saveBlocked');
  }
}

function download(filename, text, type) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const stamp = () => new Date().toISOString().slice(0, 10);

$('export-json').addEventListener('click', () => {
  download(`bld-history-${stamp()}.json`, exportJson(state.history), 'application/json');
});
$('export-csv').addEventListener('click', () => {
  download(`bld-history-${stamp()}.csv`, exportCsv(state.history), 'text/csv');
});
$('import-json').addEventListener('change', async (event) => {
  const file = event.target.files[0];
  event.target.value = ''; // allow importing the same file again
  if (!file) return;
  try {
    const attempts = importJson(await file.text());
    if (state.history.length && !confirm(tr('stats.confirmImport', { count: state.history.length, n: attempts.length, file: file.name }))) return;
    state.history = attempts;
    persist();
    renderStats();
    $('history-note').textContent = tr('stats.imported', { n: attempts.length, file: file.name });
  } catch (err) {
    $('history-note').textContent = tr('stats.importFailed', { error: msg(err.message) });
  }
});
$('clear-history').addEventListener('click', () => {
  if (!state.history.length) return;
  if (!confirm(tr('stats.confirmClear', { n: state.history.length }))) return;
  state.history = [];
  persist();
  renderStats();
  $('history-note').textContent = tr('stats.cleared');
});

/** Bad letters: ask again instead of scoring (as in the CLI). Returns true if the memo is usable. */
function memoLettersValid(edges, corners) {
  for (const [kind, text, input] of [['edge', edges, 'edge-memo'], ['corner', corners, 'corner-memo']]) {
    try {
      parseMemo(text, kind);
    } catch (err) {
      showResult('bad', `<h3>${tr('result.checkInput')}</h3><p>${escapeHtml(msg(err.message))}${lang === 'zh' ? '。' : '.'}</p>`);
      $(input).focus();
      return false;
    }
  }
  return true;
}

/** Collapsed until clicked, so a check never gives the answer away by itself. */
function spoiler(label, html) {
  return `<details class="spoiler"><summary>${label}</summary>${html}</details>`;
}

function check(event) {
  event.preventDefault();
  // Allowed while memorising too; locked once execution starts
  if (timer.phase !== 'idle' && timer.phase !== 'memo') return;
  const edges = $('edge-memo').value;
  const corners = $('corner-memo').value;
  if (!memoLettersValid(edges, corners)) return;

  // Practice check: not an attempt, and it doesn't reveal the reference memo,
  // so the scramble can still be timed afterwards (only Show answer blocks that)
  const result = checkMemo(state.cube, edges, corners);
  trackEvent('memo-check');
  const memorising = timer.phase === 'memo';
  const parity = result.has_parity ? `<span class="badge">${tr('result.parity')}</span>` : '';
  if (result.correct) {
    const next = tr(memorising ? 'result.correctMemo' : 'result.correctIdle');
    showResult('ok', `<h3>${tr('result.correct')}${parity}</h3><p>${next}</p>`);
  } else {
    // The messages name unsolved pieces, which is a hint, so they stay hidden until asked for
    const items = result.messages.map((m) => `<li>${escapeHtml(msg(m))}</li>`).join('');
    const next = tr(memorising ? 'result.wrongMemo' : 'result.wrongIdle');
    showResult('bad', `<h3>${tr('result.wrong')}</h3><p>${next}</p>${spoiler(tr('result.showWrong'), `<ul>${items}</ul>`)}`);
  }
}

// ---- Timer ----

const status = (phase) => tr(`timer.status.${phase}`);
const armedStatus = (phase) => tr(`timer.armed.${phase}`);

let frame = null;

function renderTimer() {
  const idle = timer.phase === 'idle';
  const { memo, exec, total } = idle && state.lastTimes ? state.lastTimes : timer.times();
  $('timer-total').textContent = formatTime(total);
  $('timer-memo').textContent = formatTime(memo);
  $('timer-exec').textContent = formatTime(exec);
  $('timer').className = `timer phase-${timer.phase}${controls.armed ? ' armed' : ''}`;
  $('timer-status').textContent = controls.armed ? armedStatus(timer.phase)
    : idle ? state.idleNote?.() ?? status('idle') : status(timer.phase);

  // Lock anything that would reveal the answer or lose the attempt while timing
  const busy = timer.phase !== 'idle';
  for (const id of ['new-scramble', 'toggle-own', 'retry', 'reveal']) $(id).disabled = busy;
  $('check').disabled = busy && timer.phase !== 'memo';
  $('check-row').hidden = timer.phase === 'done';
  $('save-row').hidden = timer.phase !== 'done';

  if (timer.running && frame === null) {
    const tick = () => {
      renderTimer();
      frame = timer.running ? requestAnimationFrame(tick) : null;
    };
    frame = requestAnimationFrame(tick);
  }
}

/** Space or finger down on the timer. */
function timerDown() {
  const outcome = controls.down();
  if (outcome === 'blocked') {
    const key = state.attemptSaved ? 'timer.blocked.saved' : 'timer.blocked.answer';
    state.idleNote = () => tr(key);
  }
  if (outcome === 'stopped') $('edge-memo').focus();
  renderTimer();
}

/** Space or finger up. */
function timerUp() {
  const phase = controls.up();
  if (phase === 'memo') {
    state.idleNote = null;
    $('result').hidden = true;
  }
  renderTimer();
}

function cancelTimer() {
  controls.release();
  if (timer.phase === 'idle') {
    renderTimer();
    return;
  }
  timer.cancel();
  state.idleNote = () => tr('timer.cancelled', { idle: status('idle') });
  renderTimer();
}

function saveAttempt(solved) {
  const edges = $('edge-memo').value;
  const corners = $('corner-memo').value;
  if (!memoLettersValid(edges, corners)) return;

  const attempt = buildAttempt({
    number: nextAttemptNumber(state.history), scramble: state.scramble, cube: state.cube,
    edges, corners, times: timer.times(), solved,
  });
  state.history.push(attempt);
  state.attemptSaved = true;
  persist();
  renderStats();

  trackEvent('attempt-saved');

  const times = `<dl><dt>${tr('result.total')}</dt><dd>${formatTime(attempt.totalTime)}</dd>`
    + `<dt>${tr('result.memo')}</dt><dd>${formatTime(attempt.memoTime)}</dd>`
    + `<dt>${tr('result.exec')}</dt><dd>${formatTime(attempt.execTime)}</dd></dl>`;
  // What went wrong and the reference memo stay hidden, so Try again is still a fair retry
  const memoLine = attempt.memoCorrect
    ? `<p>${tr('result.memoCheckCorrect')}</p>`
    : `<p>${tr('result.memoCheckWrong')}</p>${spoiler(tr('result.showWrong'),
      `<ul>${attempt.memoMessages.map((m) => `<li>${escapeHtml(msg(m))}</li>`).join('')}</ul>`)}`;
  showResult(solved ? 'ok' : 'bad',
    `<h3>${tr('result.attempt', { n: attempt.number, result: solved ? tr('memo.solved') : 'DNF' })}</h3>${times}${memoLine}`
    + spoiler(tr('result.showReference'), referenceHtml()));

  // Keep the final times on screen; the timer itself is ready for the next scramble
  state.lastTimes = timer.times();
  state.idleNote = () => tr('timer.savedNote', { n: attempt.number });
  timer.reset();
  renderTimer();
}

const isTyping = (el) => el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement;

document.addEventListener('keydown', (event) => {
  if (event.code === 'Escape') {
    cancelTimer();
    return;
  }
  if (event.code !== 'Space' || isTyping(event.target)) return;
  event.preventDefault(); // no page scroll, and no click on a focused button
  if (!event.repeat) timerDown();
});
document.addEventListener('keyup', (event) => {
  if (event.code !== 'Space' || isTyping(event.target)) return;
  event.preventDefault();
  timerUp();
});
// Touch / mouse: same hold-and-release rules as the space bar
$('timer').addEventListener('pointerdown', (event) => {
  event.preventDefault();
  try {
    $('timer').setPointerCapture(event.pointerId); // keep receiving pointerup if the finger drifts
  } catch { /* not supported for this pointer */ }
  timerDown();
});
$('timer').addEventListener('pointerup', timerUp);
$('timer').addEventListener('pointercancel', () => {
  controls.release();
  renderTimer();
});
// Losing focus mid-hold (e.g. switching apps) must not start the timer later
window.addEventListener('blur', () => {
  if (!controls.armed) return;
  controls.release();
  renderTimer();
});
$('save-solved').addEventListener('click', () => saveAttempt(true));
$('save-dnf').addEventListener('click', () => saveAttempt(false));

function reveal() {
  if (timer.phase !== 'idle') return;
  state.answerSeen = true;
  showResult('info', `<h3>${tr('result.answer')}</h3>${referenceHtml()}`);
}

function setPressed(group, value) {
  for (const button of document.querySelectorAll(`[data-${group}]`)) {
    button.setAttribute('aria-pressed', String(button.dataset[group] === value));
  }
}

function bindSegmented(group, onChange) {
  for (const button of document.querySelectorAll(`[data-${group}]`)) {
    button.addEventListener('click', () => {
      setPressed(group, button.dataset[group]);
      onChange(button.dataset[group]);
      renderCube();
    });
  }
}

$('new-scramble').addEventListener('click', () => setScramble(generateScramble()));
// Same scramble from the start: memo cleared, and it can be timed again
$('retry').addEventListener('click', () => setScramble(state.scramble));

$('toggle-own').addEventListener('click', () => {
  const form = $('own-form');
  form.hidden = !form.hidden;
  $('toggle-own').setAttribute('aria-expanded', String(!form.hidden));
  if (!form.hidden) $('own-scramble').focus();
});

$('own-form').addEventListener('submit', (event) => {
  event.preventDefault();
  const scramble = $('own-scramble').value.trim().replace(/\s+/g, ' ');
  const error = scrambleError(scramble);
  $('own-error').textContent = error ? msg(error) : '';
  if (!error) setScramble(scramble);
});

$('memo-form').addEventListener('submit', check);
$('reveal').addEventListener('click', reveal);
$('reset-view').addEventListener('click', () => cube3d.reset());

bindSegmented('view', (v) => { state.view = v; });
bindSegmented('stickers', (v) => { state.letters = v === 'letters'; });
bindSegmented('state', (v) => { state.showSolved = v === 'solved'; });

// ---- Language ----

function setLanguage(next) {
  lang = next;
  document.documentElement.lang = lang === 'zh' ? 'zh-CN' : 'en';
  applyTranslations(document, lang);
  $('lang-toggle').lang = lang === 'zh' ? 'en' : 'zh-CN';
  renderScrambleText();
  renderTimer();
  renderStats();
  // A shown result is plain HTML in the old language; hide it rather than mix languages
  $('result').hidden = true;
  $('own-error').textContent = '';
  $('feedback-status').textContent = '';
}

$('lang-toggle').addEventListener('click', () => {
  setLanguage(lang === 'zh' ? 'en' : 'zh');
  try {
    storage.setItem(LANG_KEY, lang);
  } catch { /* the choice just won't be remembered */ }
});

// ---- Feedback ----

function feedbackStatus(kind, text) {
  $('feedback-status').className = `hint ${kind}`;
  $('feedback-status').textContent = text;
}

$('feedback-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!WEB3FORMS_ACCESS_KEY) {
    feedbackStatus('bad', tr('feedback.notSetUp'));
    return;
  }
  const message = $('feedback-message').value;
  const error = feedbackError(message);
  if (error) {
    feedbackStatus('bad', tr(error, { n: MAX_MESSAGE }));
    $('feedback-message').focus();
    return;
  }
  const context = $('feedback-attach').checked ? feedbackContext({
    scramble: state.scramble, cube: state.cube, edges: $('edge-memo').value, corners: $('corner-memo').value,
  }) : null;
  const payload = feedbackPayload({
    accessKey: WEB3FORMS_ACCESS_KEY, message, contact: $('feedback-contact').value, context, lang,
    page: location.href, userAgent: navigator.userAgent,
  });
  $('feedback-send').disabled = true;
  feedbackStatus('', tr('feedback.sending'));
  try {
    await sendFeedback(payload);
    feedbackStatus('ok', tr('feedback.sent'));
    $('feedback-message').value = '';
    trackEvent('feedback-sent');
  } catch (err) {
    feedbackStatus('bad', tr('feedback.failed', { error: err.message }));
  } finally {
    $('feedback-send').disabled = false;
  }
});

// URL options (handy for sharing and testing):
// ?scramble=R U R'  &view=3d|net  &stickers=colours|letters  &state=scramble|solved  &lang=en|zh
const option = (name, values) => (values.includes(params.get(name)) ? params.get(name) : null);
const initial = {
  view: option('view', ['3d', 'net']),
  stickers: option('stickers', ['colours', 'letters']),
  state: option('state', ['scramble', 'solved']),
};
setLanguage(lang);
const fromUrl = params.get('scramble');
setScramble(fromUrl !== null && !scrambleError(fromUrl) ? fromUrl.trim().replace(/\s+/g, ' ') : generateScramble());

if (initial.view) document.querySelector(`[data-view="${initial.view}"]`).click();
if (initial.stickers) document.querySelector(`[data-stickers="${initial.stickers}"]`).click();
if (initial.state) document.querySelector(`[data-state="${initial.state}"]`).click();

renderStats();

startAnalytics(GOATCOUNTER_CODE);

// Offline support (needs https or localhost)
if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
  navigator.serviceWorker.register('sw.js').catch(() => { /* site still works online */ });
}
