// Web UI wiring: same features as the CLI trainer (trainer.py).
import { Cube } from './cube.js';
import { checkMemo, parseMemo, traceMemo } from './memo.js';
import { generateScramble } from './scramble.js';
import { netSvg, scrambleError } from './render.js';
import { createCube3D } from './cube3d.js';

const $ = (id) => document.getElementById(id);

const state = {
  scramble: '',
  cube: new Cube(),
  answered: false,
  correct: 0,
  attempts: 0,
  view: '3d',
  letters: false,
  showSolved: false,
};

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
  state.scramble = scramble;
  state.cube = new Cube();
  state.cube.scrambleWca(scramble);
  state.answered = false;
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

function updateScore() {
  $('score').textContent = `${state.correct}/${state.attempts}`;
}

function check(event) {
  event.preventDefault();
  const edges = $('edge-memo').value;
  const corners = $('corner-memo').value;

  // Bad letters: ask again instead of scoring (as in the CLI)
  for (const [kind, text, input] of [['edge', edges, 'edge-memo'], ['corner', corners, 'corner-memo']]) {
    try {
      parseMemo(text, kind);
    } catch (err) {
      showResult('bad', `<h3>Check your input</h3><p>${escapeHtml(err.message)}.</p>`);
      $(input).focus();
      return;
    }
  }

  const result = checkMemo(state.cube, edges, corners);
  if (!state.answered) {
    state.attempts += 1;
    if (result.correct) state.correct += 1;
    state.answered = true;
    updateScore();
  }
  const parity = result.has_parity ? '<span class="badge">parity</span>' : '';
  if (result.correct) {
    showResult('ok', `<h3>Success!${parity}</h3><p>Reference memo:</p>${referenceHtml()}`);
  } else {
    const items = result.messages.map((m) => `<li>${escapeHtml(m)}</li>`).join('');
    showResult('bad', `<h3>Fail</h3><ul>${items}</ul><p>Reference memo:</p>${referenceHtml()}`);
  }
}

function reveal() {
  if (!state.answered) state.answered = true; // revealed attempts are not scored
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
