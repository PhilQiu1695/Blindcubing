// Display data for the web UI, kept free of the DOM so it can be tested in Node.
import { Cube } from './cube.js';
import { getFaceGrid } from './visual.js';

export const FACE_ORDER = ['U', 'L', 'F', 'R', 'B', 'D'];

// Sticker colours in the blindfold hold (keys are colour initials from visual.js)
export const COLOUR_HEX = {
  G: '#1e9e4a', // green (U)
  R: '#d6283c', // red (F)
  W: '#f4f4f0', // white (R)
  O: '#f5862a', // orange (B)
  Y: '#f7d417', // yellow (L)
  B: '#1f5bd1', // blue (D)
};

// Stickers dark enough to need white text
export const DARK_COLOURS = new Set(['G', 'R', 'B']);

export const COLOUR_NAMES = { G: 'green', R: 'red', W: 'white', O: 'orange', Y: 'yellow', B: 'blue' };

/**
 * Per-face 3x3 sticker data: { colour, letter } for each sticker, as seen from outside.
 * letter is the JB letter, 'buf' for buffer stickers, or the face name for centres.
 */
export function stickerData(cube) {
  const data = {};
  for (const face of FACE_ORDER) {
    const colours = getFaceGrid(cube, face, 'colour');
    const letters = getFaceGrid(cube, face, 'letter');
    data[face] = colours.map((row, r) => row.map((colour, c) => {
      const letter = letters[r][c];
      return {
        colour,
        letter: letter === '·' ? face : letter === '#' ? 'buf' : letter,
        centre: letter === '·',
        buffer: letter === '#',
      };
    }));
  }
  return data;
}

// Top-left cell of each face in the unfolded net (units of one sticker)
const NET_ORIGIN = { U: [3, 0], L: [0, 3], F: [3, 3], R: [6, 3], B: [9, 3], D: [3, 6] };

const escapeXml = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** Unfolded cube net as an SVG string (U top; L F R B middle; D bottom). */
export function netSvg(cube, { letters = false } = {}) {
  const data = stickerData(cube);
  const size = 10;
  const gap = 0.8;
  const parts = [];
  for (const face of FACE_ORDER) {
    const [ox, oy] = NET_ORIGIN[face];
    data[face].forEach((row, r) => row.forEach((s, c) => {
      const x = (ox + c) * size + gap / 2;
      const y = (oy + r) * size + gap / 2;
      parts.push(`<rect class="sticker" data-face="${face}" x="${x}" y="${y}" width="${size - gap}" `
        + `height="${size - gap}" rx="1.2" fill="${COLOUR_HEX[s.colour]}"/>`);
      if (letters) {
        const cls = ['net-letter', s.centre && 'centre', s.buffer && 'buffer', DARK_COLOURS.has(s.colour) && 'dark']
          .filter(Boolean).join(' ');
        parts.push(`<text class="${cls}" x="${x + (size - gap) / 2}" y="${y + (size - gap) / 2}" `
          + `text-anchor="middle" dominant-baseline="central">${escapeXml(s.letter)}</text>`);
      }
    }));
  }
  return `<svg class="net" viewBox="0 0 ${12 * size} ${9 * size}" role="img" `
    + `aria-label="Unfolded cube net, green top, red front">${parts.join('')}</svg>`;
}

/** Validate a user-entered WCA-hold scramble; returns an error message or null. */
export function scrambleError(scramble) {
  try {
    new Cube().scrambleWca(scramble);
    return null;
  } catch (err) {
    return err.message;
  }
}
