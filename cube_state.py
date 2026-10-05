import re


class Cube3BLD:
    """
    3x3x3 Cube state representation for 3BLD JB method trainer.

    Fixed Orientation:
        U = Green, F = Red, R = White, B = Orange, L = Yellow, D = Blue
    Buffer Slots:
        Edge Buffer: UF (Slot 2)
        Corner Buffer: UFL (Slot 3)
    Orientation:
        A piece in a slot has ori o if the sticker on the slot's face i
        is the piece's sticker (i + o) % n, using the face orders below.
    """

    # Buffer Constants
    EDGE_BUFFER_SLOT = 2   # UF
    CORNER_BUFFER_SLOT = 3 # UFL

    # Edge Slot face order: (Primary Face [ori 0], Secondary Face [ori 1])
    EDGE_SLOT_FACES = {
        0: ('U', 'B'), 1: ('U', 'R'), 2: ('U', 'F'), 3: ('U', 'L'),
        4: ('F', 'L'), 5: ('F', 'R'), 6: ('R', 'B'), 7: ('B', 'L'),
        8: ('D', 'F'), 9: ('D', 'R'), 10: ('D', 'B'), 11: ('D', 'L'),
    }

    # Corner Slot face order: U/D face first, then clockwise around the corner.
    # Every slot must use the same handedness, or a cyclic ori can't describe it.
    CORNER_SLOT_FACES = {
        0: ('U', 'B', 'L'), 1: ('U', 'R', 'B'), 2: ('U', 'F', 'R'), 3: ('U', 'L', 'F'),
        4: ('D', 'F', 'L'), 5: ('D', 'R', 'F'), 6: ('D', 'B', 'R'), 7: ('D', 'L', 'B'),
    }

    # JB Letter Map for Edge Targets: { slot_index: { face: JB_letter } }
    EDGE_LETTER_MAP = {
        0: {'U': 'E', 'B': 'F'},  # UB
        1: {'U': 'G', 'R': 'H'},  # UR
        # Slot 2 is UF Buffer
        3: {'U': 'C', 'L': 'D'},  # UL
        4: {'F': 'S', 'L': 'T'},  # FL
        5: {'F': 'Q', 'R': 'R'},  # FR
        6: {'R': 'Z', 'B': 'Y'},  # BR (White = Z, Orange = Y)
        7: {'B': 'W', 'L': 'X'},  # BL
        8: {'D': 'A', 'F': 'J'},  # DF
        9: {'D': 'B', 'R': 'P'},  # DR
        10: {'D': 'M', 'B': 'N'}, # DB
        11: {'D': 'K', 'L': 'L'}, # DL
    }

    # JB Letter Map for Corner Targets: { slot_index: { face: JB_letter } }
    CORNER_LETTER_MAP = {
        0: {'U': 'D', 'B': 'F', 'L': 'E'}, # UBL
        1: {'U': 'G', 'B': 'H', 'R': 'I'}, # UBR
        2: {'U': 'J', 'F': 'L', 'R': 'K'}, # UFR
        # Slot 3 is UFL Buffer
        4: {'D': 'W', 'F': 'N', 'L': 'M'}, # DFL
        5: {'D': 'X', 'F': 'Y', 'R': 'Z'}, # DFR
        6: {'D': 'R', 'B': 'T', 'R': 'S'}, # DBR
        7: {'D': 'O', 'B': 'P', 'L': 'Q'}, # DBL
    }

    # Placeholder labels for buffer piece stickers (no JB letter)
    EDGE_BUFFER_STICKERS = {'U': '#U', 'F': '#F'}
    CORNER_BUFFER_STICKERS = {'U': '#U', 'F': '#F', 'L': '#L'}

    # Clockwise Quarter-Turn Permutations & Orientation Changes:
    # edges: list of (src_slot, dst_slot, new_ori_if_ori_0, new_ori_if_ori_1)
    # corners: list of (src_slot, dst_slot, twist), new_ori = (ori + twist) % 3
    MOVES = {
        'U': {
            'edges': [
                (2, 3, 0, 1), (3, 0, 0, 1), (0, 1, 0, 1), (1, 2, 0, 1)
            ],
            'corners': [
                (2, 3, 0), (3, 0, 0), (0, 1, 0), (1, 2, 0)
            ]
        },
        'D': {
            'edges': [
                (8, 9, 0, 1), (9, 10, 0, 1), (10, 11, 0, 1), (11, 8, 0, 1)
            ],
            'corners': [
                (4, 5, 0), (5, 6, 0), (6, 7, 0), (7, 4, 0)
            ]
        },
        'R': {
            'edges': [
                (1, 6, 1, 0), (6, 9, 1, 0), (9, 5, 0, 1), (5, 1, 0, 1)
            ],
            'corners': [
                (2, 1, 1), (1, 6, 2), (6, 5, 1), (5, 2, 2)
            ]
        },
        'L': {
            'edges': [
                (3, 4, 0, 1), (4, 11, 0, 1), (11, 7, 0, 1), (7, 3, 0, 1)
            ],
            'corners': [
                (0, 3, 1), (3, 4, 2), (4, 7, 1), (7, 0, 2)
            ]
        },
        'F': {
            'edges': [
                (2, 5, 1, 0), (5, 8, 1, 0), (8, 4, 1, 0), (4, 2, 1, 0)
            ],
            'corners': [
                (3, 2, 1), (2, 5, 2), (5, 4, 1), (4, 3, 2)
            ]
        },
        'B': {
            'edges': [
                (0, 7, 1, 0), (7, 10, 1, 0), (10, 6, 0, 1), (6, 0, 0, 1)
            ],
            'corners': [
                (1, 0, 1), (0, 7, 2), (7, 6, 1), (6, 1, 2)
            ]
        }
    }

    MOVE_PATTERN = re.compile(r"^([UDLRFB])(2|')?$")

    # Face turned in the blindfold hold for each face turned in the WCA hold
    # (WCA: white top, green front -> blindfold: green top, red front)
    WCA_TO_HOLD = {'U': 'R', 'F': 'U', 'R': 'F', 'D': 'L', 'B': 'D', 'L': 'B'}

    def __init__(self):
        # 12 edge slots: initialized to home piece and orientation 0 -> (piece_id, orientation)
        self.edges = [(i, 0) for i in range(12)]
        # 8 corner slots: initialized to home piece and orientation 0 -> (piece_id, orientation)
        self.corners = [(i, 0) for i in range(8)]

    @classmethod
    def edge_sticker_label(cls, piece_id: int, home_face: str) -> str:
        """JB letter (or buffer placeholder) of an edge piece's sticker."""
        if piece_id == cls.EDGE_BUFFER_SLOT:
            return cls.EDGE_BUFFER_STICKERS[home_face]
        return cls.EDGE_LETTER_MAP[piece_id][home_face]

    @classmethod
    def corner_sticker_label(cls, piece_id: int, home_face: str) -> str:
        """JB letter (or buffer placeholder) of a corner piece's sticker."""
        if piece_id == cls.CORNER_BUFFER_SLOT:
            return cls.CORNER_BUFFER_STICKERS[home_face]
        return cls.CORNER_LETTER_MAP[piece_id][home_face]

    @staticmethod
    def is_buffer_letter(label: str) -> bool:
        """True if a sticker label belongs to a buffer piece."""
        return label.startswith('#')

    def get_edge_letter(self, slot_idx: int, face: str) -> str:
        """Query the sticker label currently visible on a specific face of an edge slot."""
        piece_id, ori = self.edges[slot_idx]
        face_pos = self.EDGE_SLOT_FACES[slot_idx].index(face)

        # Determine piece sticker currently visible on this slot face
        sticker_home_face = self.EDGE_SLOT_FACES[piece_id][(face_pos + ori) % 2]
        return self.edge_sticker_label(piece_id, sticker_home_face)

    def get_corner_letter(self, slot_idx: int, face: str) -> str:
        """Query the sticker label currently visible on a specific face of a corner slot."""
        piece_id, ori = self.corners[slot_idx]
        face_pos = self.CORNER_SLOT_FACES[slot_idx].index(face)

        # Determine piece sticker currently visible on this slot face
        sticker_home_face = self.CORNER_SLOT_FACES[piece_id][(face_pos + ori) % 3]
        return self.corner_sticker_label(piece_id, sticker_home_face)

    def _apply_base_move(self, base_move: str):
        """Execute a single 90-degree clockwise outer layer turn."""
        move_def = self.MOVES[base_move]

        # Update Edge Permutations and Orientations
        new_edges = list(self.edges)
        for src, dst, e0, e1 in move_def['edges']:
            piece_id, old_ori = self.edges[src]
            new_edges[dst] = (piece_id, e0 if old_ori == 0 else e1)
        self.edges = new_edges

        # Update Corner Permutations and Orientations
        new_corners = list(self.corners)
        for src, dst, twist in move_def['corners']:
            piece_id, old_ori = self.corners[src]
            new_corners[dst] = (piece_id, (old_ori + twist) % 3)
        self.corners = new_corners

    def apply_move(self, move_str: str):
        """
        Apply a single move string to the cube state.
        Supports standard outer layer turns (U, D, L, R, F, B) and modifiers (' or 2).
        """
        move_str = move_str.strip()
        if not move_str:
            return

        match = self.MOVE_PATTERN.match(move_str)
        if not match:
            raise ValueError(f"Unsupported move: '{move_str}'")

        base_move, modifier = match.groups()
        count = {None: 1, '2': 2, "'": 3}[modifier]
        for _ in range(count):
            self._apply_base_move(base_move)

    def scramble(self, scramble_str: str):
        """Execute a space-separated string of moves on the cube state."""
        for move in scramble_str.strip().split():
            self.apply_move(move)

    def scramble_wca(self, scramble_str: str):
        """Execute a scramble written for the WCA hold, translated to the blindfold hold."""
        for move in scramble_str.strip().split():
            if not self.MOVE_PATTERN.match(move):
                raise ValueError(f"Unsupported move: '{move}'")  # report the move as typed
            self.apply_move(self.WCA_TO_HOLD[move[0]] + move[1:])
