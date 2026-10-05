// Port of memo.py. Keep identical: web/test_vectors.json checks every value.
import { Cube } from './cube.js';

// Characters that are only formatting; case is also ignored
const FORMAT_CHARS = new Set([' ', '(', ')']);

const FACE_NAME_ORDER = 'UDFBLR';

function pieceTables(kind) {
  if (kind === 'edge') {
    return { attr: 'edges', slotFaces: Cube.EDGE_SLOT_FACES, letterMap: Cube.EDGE_LETTER_MAP,
      bufferSlot: Cube.EDGE_BUFFER_SLOT, n: 2 };
  }
  return { attr: 'corners', slotFaces: Cube.CORNER_SLOT_FACES, letterMap: Cube.CORNER_LETTER_MAP,
    bufferSlot: Cube.CORNER_BUFFER_SLOT, n: 3 };
}

/** letter -> [slot, face] for every non-buffer sticker */
function homeTable(letterMap) {
  const home = {};
  for (const [slot, faces] of Object.entries(letterMap)) {
    for (const [face, letter] of Object.entries(faces)) home[letter] = [Number(slot), face];
  }
  return home;
}

/** Standard piece name for a slot, e.g. ['U','R','B'] -> 'UBR'. */
function slotName(faces) {
  return [...faces].sort((a, b) => FACE_NAME_ORDER.indexOf(a) - FACE_NAME_ORDER.indexOf(b)).join('');
}

/**
 * Turn a memo string into a list of uppercase target letters.
 * Case, spaces and brackets are formatting only and are ignored.
 * Throws for any other character or a letter not in the scheme.
 */
export function parseMemo(text, kind) {
  const valid = new Set(Object.keys(homeTable(pieceTables(kind).letterMap)));
  const letters = [];
  for (const ch of text) {
    if (FORMAT_CHARS.has(ch)) continue;
    const letter = ch.toUpperCase();
    if (!valid.has(letter)) {
      const article = kind === 'edge' ? 'an' : 'a';
      throw new Error(`'${ch}' is not ${article} ${kind} letter in the JB scheme`);
    }
    letters.push(letter);
  }
  return letters;
}

/**
 * Apply each letter as one buffer swap, in place.
 * A swap moves the buffer piece so that its sticker on the buffer's U face lands
 * on the target sticker, and brings the target slot's piece to the buffer with
 * the target sticker on the buffer's U face.
 */
export function executeMemo(cube, kind, letters) {
  const { attr, slotFaces, letterMap, bufferSlot, n } = pieceTables(kind);
  const home = homeTable(letterMap);
  const state = cube[attr].map((p) => p);

  for (const letter of letters) {
    const [target, face] = home[letter];
    const j = slotFaces[target].indexOf(face);
    const [bufferPiece, bufferOri] = state[bufferSlot];
    const [targetPiece, targetOri] = state[target];
    const k = bufferOri % n;          // buffer piece sticker on buffer U face (index 0)
    const m = (j + targetOri) % n;    // target piece sticker on the target face

    state[target] = [bufferPiece, (((k - j) % n) + n) % n];
    state[bufferSlot] = [targetPiece, m];
  }
  cube[attr] = state;
}

/** Names of slots whose piece is not home with orientation 0. */
export function unsolvedPieces(cube, kind) {
  const { attr, slotFaces } = pieceTables(kind);
  return cube[attr]
    .map(([piece, ori], slot) => (piece === slot && ori === 0 ? null : slotName(slotFaces[slot])))
    .filter((name) => name !== null);
}

const capitalize = (s) => s[0].toUpperCase() + s.slice(1);

/**
 * Check a user's memo against a scrambled cube without changing it.
 * The memo is correct if executing both memos as buffer swaps solves the cube.
 * Returns { correct, edges_ok, corners_ok, edge_count, corner_count, messages, has_parity }.
 */
export function checkMemo(cube, edgeMemo, cornerMemo) {
  const ok = {};
  const counts = {};
  const messages = [];
  for (const [kind, text] of [['edge', edgeMemo], ['corner', cornerMemo]]) {
    let letters;
    try {
      letters = parseMemo(text, kind);
    } catch (err) {
      ok[kind] = false;
      counts[kind] = 0;
      messages.push(`${capitalize(kind)}s: ${err.message}`);
      continue;
    }
    counts[kind] = letters.length;
    const trial = cube.clone();
    executeMemo(trial, kind, letters);
    const left = unsolvedPieces(trial, kind);
    ok[kind] = left.length === 0;
    if (left.length) messages.push(`${capitalize(kind)}s: memo leaves ${left.join(', ')} unsolved`);
  }
  return {
    correct: ok.edge && ok.corner,
    edges_ok: ok.edge,
    corners_ok: ok.corner,
    edge_count: counts.edge,
    corner_count: counts.corner,
    messages,
    has_parity: counts.edge % 2 === 1,
  };
}

/** Letters in pairs separated by spaces, then each in-place block in brackets. */
function formatMemo(letters, inPlace) {
  const pairs = [];
  for (let i = 0; i < letters.length; i += 2) pairs.push(letters.slice(i, i + 2).join(''));
  return [...pairs, ...inPlace.map((block) => `(${block})`)].join(' ');
}

/**
 * Trace the reference memo for edges or corners using the JB rules
 * (same rules and cycle-break order as memo.trace in Python).
 */
export function trace(cube, kind) {
  const { attr, slotFaces, letterMap, bufferSlot } = pieceTables(kind);
  const get = (slot, face) => (kind === 'edge' ? cube.getEdgeLetter(slot, face) : cube.getCornerLetter(slot, face));
  const home = homeTable(letterMap);
  const state = cube[attr];

  const letters = [];
  const inPlace = [];
  const recorded = new Set([bufferSlot]);

  // Main cycle from the buffer's U sticker
  let pos = [bufferSlot, 'U'];
  while (!Cube.isBufferLetter(get(...pos))) {
    const letter = get(...pos);
    letters.push(letter);
    pos = home[letter];
    recorded.add(pos[0]);
  }

  // Small cycles, broken into in order of their start letter
  const slots = Object.keys(letterMap).map(Number);
  const startFace = (slot) => slotFaces[slot][0]; // U/D face first for corners
  const startLetter = (slot) => letterMap[slot][startFace(slot)];
  slots.sort((a, b) => (startLetter(a) < startLetter(b) ? -1 : startLetter(a) > startLetter(b) ? 1 : 0));

  for (const slot of slots) {
    const [piece, ori] = state[slot];
    if (recorded.has(slot) || (piece === slot && ori === 0)) continue;
    recorded.add(slot);
    const start = [slot, startFace(slot)];
    const first = startLetter(slot).toLowerCase();

    if (piece === slot) {
      inPlace.push(first + get(...start).toLowerCase());
      continue;
    }

    letters.push(first);
    pos = start;
    for (;;) {
      const letter = get(...pos);
      pos = home[letter];
      if (pos[0] === slot) {
        letters.push(letter.toLowerCase());
        break;
      }
      letters.push(letter);
      recorded.add(pos[0]);
    }
  }
  return formatMemo(letters, inPlace);
}

/** Reference [edgeMemo, cornerMemo] for a scrambled cube. */
export function traceMemo(cube) {
  return [trace(cube, 'edge'), trace(cube, 'corner')];
}
