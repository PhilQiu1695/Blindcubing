import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Cube } from '../js/cube.js';
import { COLOUR_HEX, netSvg, scrambleError, stickerData } from '../js/render.js';

const vectors = JSON.parse(readFileSync(new URL('../test_vectors.json', import.meta.url), 'utf8'));

// Letter table from the design doc ('buf' = buffer, centre shows its face name)
const DOC_TABLE = {
  U: ['D E G', 'C U G', 'buf buf J'],
  F: ['buf buf L', 'S F Q', 'N J Y'],
  R: ['K H I', 'R R Z', 'Z P S'],
  B: ['H F F', 'Y B W', 'T N P'],
  L: ['E D buf', 'X L T', 'Q L M'],
  D: ['W A X', 'K D B', 'O M R'],
};

test('solved cube sticker letters match the design doc table', () => {
  const data = stickerData(new Cube());
  for (const [face, rows] of Object.entries(DOC_TABLE)) {
    assert.deepEqual(data[face].map((row) => row.map((s) => s.letter).join(' ')), rows, face);
  }
});

test('sticker data uses the same colours and letters as the shared vectors', () => {
  for (const c of vectors.cases.slice(0, 50)) {
    const cube = new Cube();
    if (c.hold === 'wca') cube.scrambleWca(c.scramble); else cube.scramble(c.scramble);
    const data = stickerData(cube);
    for (const face of Object.keys(data)) {
      assert.deepEqual(data[face].map((row) => row.map((s) => s.colour)), c.grids.colour[face]);
      const letters = data[face].map((row) => row.map((s) => (s.centre ? '·' : s.buffer ? '#' : s.letter)));
      assert.deepEqual(letters, c.grids.letter[face]);
    }
  }
});

test('net SVG has 54 stickers with the right colours, letters only when asked', () => {
  const cube = new Cube();
  cube.applyMove('R');
  const plain = netSvg(cube);
  assert.equal(plain.match(/<rect /g).length, 54);
  assert.equal(plain.match(/<text /g), null);
  const fills = [...plain.matchAll(/data-face="U"[^>]*fill="([^"]+)"/g)].map((m) => m[1]);
  // U face after R: right column is red (from F), the rest green
  assert.deepEqual(fills, [0, 1, 2, 3, 4, 5, 6, 7, 8].map((i) => (i % 3 === 2 ? COLOUR_HEX.R : COLOUR_HEX.G)));

  const lettered = netSvg(new Cube(), { letters: true });
  assert.equal(lettered.match(/<text /g).length, 54);
  assert.match(lettered, /class="net-letter buffer dark"[^>]*>buf</);
});

test('scramble validation for the "enter my own" box', () => {
  assert.equal(scrambleError("R U R' U'"), null);
  assert.equal(scrambleError(''), null);
  assert.equal(scrambleError('R Rw'), "Unsupported move: 'Rw'");  // as typed, not translated
});
