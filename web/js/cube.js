// Port of cube_state.py. Keep identical: web/test_vectors.json checks every value.

/**
 * 3x3x3 cube state for the 3BLD JB method trainer.
 *
 * Fixed orientation: U = Green, F = Red, R = White, B = Orange, L = Yellow, D = Blue
 * Buffers: edge UF (slot 2), corner UFL (slot 3)
 * Orientation: a piece in a slot has ori o if the sticker on the slot's face i
 * is the piece's sticker (i + o) % n, using the face orders below.
 */
export class Cube {
  static EDGE_BUFFER_SLOT = 2;   // UF
  static CORNER_BUFFER_SLOT = 3; // UFL

  // Edge slot face order: [primary face (ori 0), secondary face (ori 1)]
  static EDGE_SLOT_FACES = [
    ['U', 'B'], ['U', 'R'], ['U', 'F'], ['U', 'L'],
    ['F', 'L'], ['F', 'R'], ['R', 'B'], ['B', 'L'],
    ['D', 'F'], ['D', 'R'], ['D', 'B'], ['D', 'L'],
  ];

  // Corner slot face order: U/D face first, then clockwise around the corner.
  // Every slot must use the same handedness, or a cyclic ori can't describe it.
  static CORNER_SLOT_FACES = [
    ['U', 'B', 'L'], ['U', 'R', 'B'], ['U', 'F', 'R'], ['U', 'L', 'F'],
    ['D', 'F', 'L'], ['D', 'R', 'F'], ['D', 'B', 'R'], ['D', 'L', 'B'],
  ];

  // JB letters: { slot: { face: letter } }; buffer slots have no letters
  static EDGE_LETTER_MAP = {
    0: { U: 'E', B: 'F' },  // UB
    1: { U: 'G', R: 'H' },  // UR
    3: { U: 'C', L: 'D' },  // UL
    4: { F: 'S', L: 'T' },  // FL
    5: { F: 'Q', R: 'R' },  // FR
    6: { R: 'Z', B: 'Y' },  // BR
    7: { B: 'W', L: 'X' },  // BL
    8: { D: 'A', F: 'J' },  // DF
    9: { D: 'B', R: 'P' },  // DR
    10: { D: 'M', B: 'N' }, // DB
    11: { D: 'K', L: 'L' }, // DL
  };

  static CORNER_LETTER_MAP = {
    0: { U: 'D', B: 'F', L: 'E' }, // UBL
    1: { U: 'G', B: 'H', R: 'I' }, // UBR
    2: { U: 'J', F: 'L', R: 'K' }, // UFR
    4: { D: 'W', F: 'N', L: 'M' }, // DFL
    5: { D: 'X', F: 'Y', R: 'Z' }, // DFR
    6: { D: 'R', B: 'T', R: 'S' }, // DBR
    7: { D: 'O', B: 'P', L: 'Q' }, // DBL
  };

  // Placeholder labels for buffer piece stickers (no JB letter)
  static EDGE_BUFFER_STICKERS = { U: '#U', F: '#F' };
  static CORNER_BUFFER_STICKERS = { U: '#U', F: '#F', L: '#L' };

  // Clockwise quarter turns.
  // edges: [src, dst, newOriIfOri0, newOriIfOri1]
  // corners: [src, dst, twist], newOri = (ori + twist) % 3
  static MOVES = {
    U: {
      edges: [[2, 3, 0, 1], [3, 0, 0, 1], [0, 1, 0, 1], [1, 2, 0, 1]],
      corners: [[2, 3, 0], [3, 0, 0], [0, 1, 0], [1, 2, 0]],
    },
    D: {
      edges: [[8, 9, 0, 1], [9, 10, 0, 1], [10, 11, 0, 1], [11, 8, 0, 1]],
      corners: [[4, 5, 0], [5, 6, 0], [6, 7, 0], [7, 4, 0]],
    },
    R: {
      edges: [[1, 6, 1, 0], [6, 9, 1, 0], [9, 5, 0, 1], [5, 1, 0, 1]],
      corners: [[2, 1, 1], [1, 6, 2], [6, 5, 1], [5, 2, 2]],
    },
    L: {
      edges: [[3, 4, 0, 1], [4, 11, 0, 1], [11, 7, 0, 1], [7, 3, 0, 1]],
      corners: [[0, 3, 1], [3, 4, 2], [4, 7, 1], [7, 0, 2]],
    },
    F: {
      edges: [[2, 5, 1, 0], [5, 8, 1, 0], [8, 4, 1, 0], [4, 2, 1, 0]],
      corners: [[3, 2, 1], [2, 5, 2], [5, 4, 1], [4, 3, 2]],
    },
    B: {
      edges: [[0, 7, 1, 0], [7, 10, 1, 0], [10, 6, 0, 1], [6, 0, 0, 1]],
      corners: [[1, 0, 1], [0, 7, 2], [7, 6, 1], [6, 1, 2]],
    },
  };

  static MOVE_PATTERN = /^([UDLRFB])(2|')?$/;

  // Face turned in the blindfold hold for each face turned in the WCA hold
  // (WCA: white top, green front -> blindfold: green top, red front)
  static WCA_TO_HOLD = { U: 'R', F: 'U', R: 'F', D: 'L', B: 'D', L: 'B' };

  constructor() {
    // [pieceId, ori] per slot; pieceId is the piece's home slot
    this.edges = Array.from({ length: 12 }, (_, i) => [i, 0]);
    this.corners = Array.from({ length: 8 }, (_, i) => [i, 0]);
  }

  clone() {
    const copy = new Cube();
    copy.edges = this.edges.map(([p, o]) => [p, o]);
    copy.corners = this.corners.map(([p, o]) => [p, o]);
    return copy;
  }

  /** JB letter (or buffer placeholder) of an edge piece's sticker. */
  static edgeStickerLabel(pieceId, homeFace) {
    if (pieceId === Cube.EDGE_BUFFER_SLOT) return Cube.EDGE_BUFFER_STICKERS[homeFace];
    return Cube.EDGE_LETTER_MAP[pieceId][homeFace];
  }

  /** JB letter (or buffer placeholder) of a corner piece's sticker. */
  static cornerStickerLabel(pieceId, homeFace) {
    if (pieceId === Cube.CORNER_BUFFER_SLOT) return Cube.CORNER_BUFFER_STICKERS[homeFace];
    return Cube.CORNER_LETTER_MAP[pieceId][homeFace];
  }

  /** True if a sticker label belongs to a buffer piece. */
  static isBufferLetter(label) {
    return label.startsWith('#');
  }

  /** Sticker label currently visible on a face of an edge slot. */
  getEdgeLetter(slot, face) {
    const [pieceId, ori] = this.edges[slot];
    const facePos = Cube.EDGE_SLOT_FACES[slot].indexOf(face);
    const homeFace = Cube.EDGE_SLOT_FACES[pieceId][(facePos + ori) % 2];
    return Cube.edgeStickerLabel(pieceId, homeFace);
  }

  /** Sticker label currently visible on a face of a corner slot. */
  getCornerLetter(slot, face) {
    const [pieceId, ori] = this.corners[slot];
    const facePos = Cube.CORNER_SLOT_FACES[slot].indexOf(face);
    const homeFace = Cube.CORNER_SLOT_FACES[pieceId][(facePos + ori) % 3];
    return Cube.cornerStickerLabel(pieceId, homeFace);
  }

  /** Execute a single 90-degree clockwise outer layer turn. */
  applyBaseMove(baseMove) {
    const moveDef = Cube.MOVES[baseMove];

    const newEdges = this.edges.map((e) => e);
    for (const [src, dst, e0, e1] of moveDef.edges) {
      const [pieceId, oldOri] = this.edges[src];
      newEdges[dst] = [pieceId, oldOri === 0 ? e0 : e1];
    }
    this.edges = newEdges;

    const newCorners = this.corners.map((c) => c);
    for (const [src, dst, twist] of moveDef.corners) {
      const [pieceId, oldOri] = this.corners[src];
      newCorners[dst] = [pieceId, (oldOri + twist) % 3];
    }
    this.corners = newCorners;
  }

  /** Apply one move such as R, U' or F2. Throws on anything else. */
  applyMove(moveStr) {
    const move = moveStr.trim();
    if (!move) return;
    const match = Cube.MOVE_PATTERN.exec(move);
    if (!match) throw new Error(`Unsupported move: '${move}'`);
    const [, baseMove, modifier] = match;
    const count = { undefined: 1, 2: 2, "'": 3 }[modifier];
    for (let i = 0; i < count; i++) this.applyBaseMove(baseMove);
  }

  /** Execute a space-separated move sequence in the blindfold hold. */
  scramble(scrambleStr) {
    for (const move of splitMoves(scrambleStr)) this.applyMove(move);
  }

  /** Execute a scramble written for the WCA hold, translated to the blindfold hold. */
  scrambleWca(scrambleStr) {
    for (const move of splitMoves(scrambleStr)) {
      // report the move as typed, not its translation
      if (!Cube.MOVE_PATTERN.test(move)) throw new Error(`Unsupported move: '${move}'`);
      this.applyMove(Cube.WCA_TO_HOLD[move[0]] + move.slice(1));
    }
  }
}

function splitMoves(str) {
  const trimmed = str.trim();
  return trimmed ? trimmed.split(/\s+/) : [];
}
