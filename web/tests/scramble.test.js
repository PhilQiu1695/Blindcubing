import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Cube } from '../js/cube.js';
import { AXIS, generateScramble } from '../js/scramble.js';

// Small seeded generator (mulberry32) so failures are reproducible
function seeded(seed) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

test('scrambles follow the generator rules', () => {
  const random = seeded(8);
  for (let i = 0; i < 500; i++) {
    const moves = generateScramble(18, random).split(' ');
    assert.equal(moves.length, 18);
    new Cube().scrambleWca(moves.join(' ')); // every token valid
    for (let j = 1; j < moves.length; j++) assert.notEqual(moves[j][0], moves[j - 1][0], moves.join(' '));
    for (let j = 2; j < moves.length; j++) {
      const [a, b, c] = [moves[j - 2][0], moves[j - 1][0], moves[j][0]];
      assert.ok(!(AXIS[a] === AXIS[b] && AXIS[b] === AXIS[c]), moves.join(' '));
    }
  }
});

test('seeded scrambles are reproducible and default to 18 moves', () => {
  assert.equal(generateScramble(18, seeded(3)), generateScramble(18, seeded(3)));
  assert.equal(generateScramble().split(' ').length, 18);
});
