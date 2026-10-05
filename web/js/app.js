// Web UI wiring: same features as the CLI trainer (trainer.py).
import { Cube } from './cube.js';
import { checkMemo, parseMemo, traceMemo } from './memo.js';
import { generateScramble } from './scramble.js';
import { netSvg, scrambleError } from './render.js';
import { createCube3D } from './cube3d.js';
import { BldTimer, buildAttempt, formatTime } from './timer.js';

const $ = (id) => document.getElementById(id);

const state = {
  scramble: '',
  cube: new Cube(),
  answerSeen: false,   // Show answer used on this scramble (blocks timing it)
  view: '3d',
  letters: false,
  showSolved: false,
  attemptSaved: false, // one timed attempt per scramble
  history: [],         // timed attempt records (saved to storage in step 12)
  lastTimes: null,     // times kept on screen after an attempt is saved
  idleNote: null,      // status message shown while the timer is idle
};

const timer = new BldTimer();

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
  $('scramble-text').textContent = scramble || '(solved cube)';
  $('edge-memo').value = '';
  $('corner-memo').value = '';
  $('result').hidden = true;
  renderCube();
}

function referenceHtml() {
  const [edges, corners] = traceMemo(state.cube);
  return `<dl><dt>Edges</dt><dd>${escapeHtml(edges) || '(solved)'}</dd>`
    + `<dt>Corners</dt><dd>${escapeHtml(corners) || '(solved)'}</dd></dl>`;
}

function showResult(kind, html) {
  const box = $('result');
  box.className = `result ${kind}`;
  box.innerHTML = html;
  box.hidden = false;
}

// Score counts timed attempts only: memos correct / attempts saved
function updateScore() {
  const correct = state.history.filter((a) => a.memoCorrect).length;
  $('score').textContent = `${correct}/${state.history.length}`;
}

/** Bad letters: ask again instead of scoring (as in the CLI). Returns true if the memo is usable. */
function memoLettersValid(edges, corners) {
  for (const [kind, text, input] of [['edge', edges, 'edge-memo'], ['corner', corners, 'corner-memo']]) {
    try {
      parseMemo(text, kind);
    } catch (err) {
      showResult('bad', `<h3>Check your input</h3><p>${escapeHtml(err.message)}.</p>`);
      $(input).focus();
      return false;
    }
  }
  return true;
}

function check(event) {
  event.preventDefault();
  if (timer.phase !== 'idle') return;
  const edges = $('edge-memo').value;
  const corners = $('corner-memo').value;
  if (!memoLettersValid(edges, corners)) return;

  // Practice check: not an attempt, and it doesn't reveal the reference memo,
  // so the scramble can still be timed afterwards (only Show answer blocks that)
  const result = checkMemo(state.cube, edges, corners);
  const parity = result.has_parity ? '<span class="badge">parity</span>' : '';
  if (result.correct) {
    showResult('ok', `<h3>Memo correct!${parity}</h3><p>You can now time this scramble.</p>`);
  } else {
    const items = result.messages.map((m) => `<li>${escapeHtml(m)}</li>`).join('');
    showResult('bad', `<h3>Memo wrong</h3><ul>${items}</ul>`
      + '<p>Fix your memo and check again, or use Show answer to see the reference memo.</p>');
  }
}

// ---- Timer ----

const STATUS = {
  idle: 'Press space or tap the timer to start memo.',
  memo: 'Memorising… press space / tap when the blindfold is on. Esc cancels.',
  exec: 'Solving… press space / tap to stop. Esc cancels.',
  done: 'Stopped. Enter the memo you used, then save as Solved or DNF. Esc discards.',
};

let frame = null;

function renderTimer() {
  const idle = timer.phase === 'idle';
  const { memo, exec, total } = idle && state.lastTimes ? state.lastTimes : timer.times();
  $('timer-total').textContent = formatTime(total);
  $('timer-memo').textContent = formatTime(memo);
  $('timer-exec').textContent = formatTime(exec);
  $('timer').className = `timer phase-${timer.phase}`;
  $('timer-status').textContent = idle ? state.idleNote ?? STATUS.idle : STATUS[timer.phase];

  // Lock anything that would reveal the answer or lose the attempt while timing
  const busy = timer.phase !== 'idle';
  for (const id of ['new-scramble', 'toggle-own', 'check', 'reveal']) $(id).disabled = busy;
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

function pressTimer() {
  if (timer.phase === 'done') return;
  if (timer.phase === 'idle' && state.attemptSaved) {
    state.idleNote = 'Attempt saved. Get a new scramble for the next one.';
    renderTimer();
    return;
  }
  if (timer.phase === 'idle' && state.answerSeen) {
    state.idleNote = 'The answer for this scramble has been shown. Get a new scramble to time an attempt.';
    renderTimer();
    return;
  }
  state.idleNote = null;
  timer.press();
  if (timer.phase === 'memo') $('result').hidden = true;
  if (timer.phase === 'done') $('edge-memo').focus();
  renderTimer();
}

function cancelTimer() {
  if (timer.phase === 'idle') return;
  timer.cancel();
  state.idleNote = `Attempt cancelled; nothing saved. ${STATUS.idle}`;
  renderTimer();
}

function saveAttempt(solved) {
  const edges = $('edge-memo').value;
  const corners = $('corner-memo').value;
  if (!memoLettersValid(edges, corners)) return;

  const attempt = buildAttempt({
    number: state.history.length + 1, scramble: state.scramble, cube: state.cube,
    edges, corners, times: timer.times(), solved,
  });
  state.history.push(attempt);
  state.attemptSaved = true;
  updateScore();

  const times = `<dl><dt>Total</dt><dd>${formatTime(attempt.totalTime)}</dd>`
    + `<dt>Memo</dt><dd>${formatTime(attempt.memoTime)}</dd>`
    + `<dt>Execution</dt><dd>${formatTime(attempt.execTime)}</dd></dl>`;
  const memoLine = attempt.memoCorrect
    ? '<p>Memo check: correct.</p>'
    : `<p>Memo check: wrong.</p><ul>${attempt.memoMessages.map((m) => `<li>${escapeHtml(m)}</li>`).join('')}</ul>`;
  showResult(solved ? 'ok' : 'bad',
    `<h3>Attempt #${attempt.number}: ${solved ? 'Solved' : 'DNF'}</h3>${times}${memoLine}`
    + `<p>Reference memo:</p>${referenceHtml()}`);

  // Keep the final times on screen; the timer itself is ready for the next scramble
  state.lastTimes = timer.times();
  state.idleNote = `Saved attempt #${attempt.number}. Get a new scramble for the next one.`;
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
  if (!event.repeat) pressTimer();
});
document.addEventListener('keyup', (event) => {
  if (event.code === 'Space' && !isTyping(event.target)) event.preventDefault();
});
$('timer').addEventListener('pointerdown', (event) => {
  event.preventDefault();
  pressTimer();
});
$('save-solved').addEventListener('click', () => saveAttempt(true));
$('save-dnf').addEventListener('click', () => saveAttempt(false));

function reveal() {
  if (timer.phase !== 'idle') return;
  state.answerSeen = true;
  showResult('info', `<h3>Answer (not scored)</h3>${referenceHtml()}`);
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
  $('own-error').textContent = error ?? '';
  if (!error) setScramble(scramble);
});

$('memo-form').addEventListener('submit', check);
$('reveal').addEventListener('click', reveal);
$('reset-view').addEventListener('click', () => cube3d.reset());

bindSegmented('view', (v) => { state.view = v; });
bindSegmented('stickers', (v) => { state.letters = v === 'letters'; });
bindSegmented('state', (v) => { state.showSolved = v === 'solved'; });

// URL options (handy for sharing and testing):
// ?scramble=R U R'  &view=3d|net  &stickers=colours|letters  &state=scramble|solved
const params = new URLSearchParams(location.search);
const option = (name, values) => (values.includes(params.get(name)) ? params.get(name) : null);
const initial = {
  view: option('view', ['3d', 'net']),
  stickers: option('stickers', ['colours', 'letters']),
  state: option('state', ['scramble', 'solved']),
};
const fromUrl = params.get('scramble');
setScramble(fromUrl !== null && !scrambleError(fromUrl) ? fromUrl.trim().replace(/\s+/g, ' ') : generateScramble());

if (initial.view) document.querySelector(`[data-view="${initial.view}"]`).click();
if (initial.stickers) document.querySelector(`[data-stickers="${initial.stickers}"]`).click();
if (initial.state) document.querySelector(`[data-state="${initial.state}"]`).click();
