// Port of visual.py (grid logic). Keep identical: web/test_vectors.json checks every value.
import { Cube } from './cube.js';

// Face normals, and each face's [up, right] directions as seen looking at it from outside.
// U has B at the top, D has F at the top, and the side faces have U at the top.
export const NORMALS = {
  U: [0, 1, 0], D: [0, -1, 0], F: [0, 0, 1], B: [0, 0, -1], R: [1, 0, 0], L: [-1, 0, 0],
};
const VIEWS = {
  U: [[0, 0, -1], [1, 0, 0]],
  F: [[0, 1, 0], [1, 0, 0]],
  R: [[0, 1, 0], [0, 0, -1]],
  B: [[0, 1, 0], [-1, 0, 0]],
  L: [[0, 1, 0], [0, 0, 1]],
  D: [[0, 0, 1], [1, 0, 0]],
};

// Colours in the blindfold hold
export const FACE_COLOURS = { U: 'G', F: 'R', R: 'W', B: 'O', L: 'Y', D: 'B' };

export const MODES = ['letter', 'face', 'colour'];

const key = (v) => v.join(',');
const position = (faces) => [0, 1, 2].map((i) => faces.reduce((sum, f) => sum + NORMALS[f][i], 0));

const EDGE_AT = Object.fromEntries(Cube.EDGE_SLOT_FACES.map((faces, slot) => [key(position(faces)), slot]));
const CORNER_AT = Object.fromEntries(Cube.CORNER_SLOT_FACES.map((faces, slot) => [key(position(faces)), slot]));

/** Face a sticker belongs to on a solved cube. */
function homeFace(label, kind) {
  if (Cube.isBufferLetter(label)) return label[1];
  // Edge and corner schemes reuse letters, so look up within the right scheme
  const letterMap = kind === 'edge' ? Cube.EDGE_LETTER_MAP : Cube.CORNER_LETTER_MAP;
  for (const faces of Object.values(letterMap)) {
    for (const [face, letter] of Object.entries(faces)) if (letter === label) return face;
  }
  throw new Error(`Unknown ${kind} label '${label}'`);
}

/**
 * 3x3 grid of one face as seen from outside the cube.
 * mode 'letter': JB letters ('#' for buffer stickers, '·' for the centre)
 * mode 'face':   the face each sticker belongs to on a solved cube (U, F, R, ...)
 * mode 'colour': sticker colour initial in the blindfold hold (G, R, W, O, Y, B)
 */
export function getFaceGrid(cube, face, mode = 'letter') {
  if (!MODES.includes(mode)) throw new Error(`Unknown mode '${mode}', use one of ${MODES.join(', ')}`);
  const n = NORMALS[face];
  const [up, right] = VIEWS[face];
  const grid = [];
  for (let row = 0; row < 3; row++) {
    const cells = [];
    for (let col = 0; col < 3; col++) {
      const pos = [0, 1, 2].map((i) => n[i] + up[i] * (1 - row) + right[i] * (col - 1));
      const nonzero = pos.filter((x) => x !== 0).length;
      let label = null;
      let home = face;
      if (nonzero === 2) {
        label = cube.getEdgeLetter(EDGE_AT[key(pos)], face);
        home = homeFace(label, 'edge');
      } else if (nonzero === 3) {
        label = cube.getCornerLetter(CORNER_AT[key(pos)], face);
        home = homeFace(label, 'corner');
      }

      if (mode === 'face') cells.push(home);
      else if (mode === 'colour') cells.push(FACE_COLOURS[home]);
      else if (label === null) cells.push('·');
      else cells.push(Cube.isBufferLetter(label) ? '#' : label);
    }
    grid.push(cells);
  }
  return grid;
}
