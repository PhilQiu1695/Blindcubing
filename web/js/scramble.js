// Port of generate_scramble in trainer.py. Same rules; random values differ from Python.

const FACES = 'UDLRFB';
export const AXIS = { U: 'UD', D: 'UD', L: 'LR', R: 'LR', F: 'FB', B: 'FB' };
const MODIFIERS = ['', "'", '2'];

/**
 * Random-move scramble of `length` moves in the WCA hold. No face is turned twice
 * in a row, and no three moves in a row share an axis (e.g. R L R).
 * `random` returns a float in [0, 1); pass a seeded one for reproducible tests.
 */
export function generateScramble(length = 18, random = Math.random) {
  const choice = (items) => items[Math.floor(random() * items.length)];
  const moves = [];
  for (let i = 0; i < length; i++) {
    let face;
    for (;;) {
      face = choice(FACES);
      const last = moves.at(-1)?.[0];
      const beforeLast = moves.at(-2)?.[0];
      if (face === last) continue;
      if (beforeLast && AXIS[face] === AXIS[last] && AXIS[last] === AXIS[beforeLast]) continue;
      break;
    }
    moves.push(face + choice(MODIFIERS));
  }
  return moves.join(' ');
}
