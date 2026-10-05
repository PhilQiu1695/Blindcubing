// Checks the JavaScript port against web/test_vectors.json (exported from Python).
// Regenerate the vectors with `python3 export_vectors.py` after any Python change.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Cube } from '../js/cube.js';
import { checkMemo, traceMemo } from '../js/memo.js';
import { getFaceGrid } from '../js/visual.js';

const vectors = JSON.parse(readFileSync(new URL('../test_vectors.json', import.meta.url), 'utf8'));

function scrambled(c) {
  const cube = new Cube();
  if (c.hold === 'wca') cube.scrambleWca(c.scramble);
  else cube.scramble(c.scramble);
  return cube;
}

test('single moves match Python state', () => {
  for (const [move, expected] of Object.entries(vectors.single_moves)) {
    const cube = new Cube();
    cube.applyMove(move);
    assert.deepEqual({ edges: cube.edges, corners: cube.corners }, expected, move);
  }
});

test('invalid moves are rejected', () => {
  for (const move of vectors.invalid_moves) {
    assert.throws(() => new Cube().applyMove(move), /Unsupported move/, move);
  }
});

test(`cube state after ${vectors.cases.length} scrambles matches Python`, () => {
  for (const c of vectors.cases) {
    const cube = scrambled(c);
    assert.deepEqual(cube.edges, c.edges, c.scramble);
    assert.deepEqual(cube.corners, c.corners, c.scramble);
  }
});

test('face grids (letter, face, colour) match Python', () => {
  for (const c of vectors.cases) {
    const cube = scrambled(c);
    for (const [mode, faces] of Object.entries(c.grids)) {
      for (const [face, grid] of Object.entries(faces)) {
        assert.deepEqual(getFaceGrid(cube, face, mode), grid, `${c.scramble} ${mode} ${face}`);
      }
    }
  }
});

test('traced memos match Python', () => {
  for (const c of vectors.cases) {
    assert.deepEqual(traceMemo(scrambled(c)), c.trace, c.scramble);
  }
});

test('checker results match Python, including messages', () => {
  for (const c of vectors.cases) {
    const cube = scrambled(c);
    for (const check of c.checks) {
      const { edges, corners, ...expected } = check;
      assert.deepEqual(checkMemo(cube, edges, corners), expected, `${c.scramble}: ${edges} | ${corners}`);
    }
  }
});

test('checking does not modify the cube', () => {
  const c = vectors.cases[0];
  const cube = scrambled(c);
  checkMemo(cube, ...c.trace);
  assert.deepEqual(cube.edges, c.edges);
  assert.deepEqual(cube.corners, c.corners);
});
