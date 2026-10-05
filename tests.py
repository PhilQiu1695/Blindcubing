import random
import unittest
from cube_state import Cube3BLD

class TestCube3BLDStep1(unittest.TestCase):
    def setUp(self):
        self.cube = Cube3BLD()

    def test_initial_state(self):
        """Verify initialization of edges and corners to solved tuples."""
        self.assertEqual(len(self.cube.edges), 12)
        self.assertEqual(len(self.cube.corners), 8)
        self.assertEqual(self.cube.edges, [(i, 0) for i in range(12)])
        self.assertEqual(self.cube.corners, [(i, 0) for i in range(8)])

    def test_buffer_constants(self):
        """Verify buffer constants point to UF (2) and UFL (3)."""
        self.assertEqual(Cube3BLD.EDGE_BUFFER_SLOT, 2)
        self.assertEqual(Cube3BLD.CORNER_BUFFER_SLOT, 3)

    def test_all_edge_stickers_solved_state(self):
        """Verify all 22 non-buffer edge stickers match JB scheme on solved cube."""
        sticker_count = 0
        for slot_idx, expected_dict in Cube3BLD.EDGE_LETTER_MAP.items():
            for face, expected_letter in expected_dict.items():
                actual_letter = self.cube.get_edge_letter(slot_idx, face)
                self.assertEqual(
                    actual_letter, 
                    expected_letter, 
                    f"Mismatch at Edge Slot {slot_idx} ({face} face)"
                )
                sticker_count += 1
        self.assertEqual(sticker_count, 22)

    def test_all_corner_stickers_solved_state(self):
        """Verify all 21 non-buffer corner stickers match JB scheme on solved cube."""
        sticker_count = 0
        for slot_idx, expected_dict in Cube3BLD.CORNER_LETTER_MAP.items():
            for face, expected_letter in expected_dict.items():
                actual_letter = self.cube.get_corner_letter(slot_idx, face)
                self.assertEqual(
                    actual_letter, 
                    expected_letter, 
                    f"Mismatch at Corner Slot {slot_idx} ({face} face)"
                )
                sticker_count += 1
        self.assertEqual(sticker_count, 21)


class TestCube3BLDStep2(unittest.TestCase):
    def setUp(self):
        self.cube = Cube3BLD()

    def test_single_face_turns_4_cycles_to_solved(self):
        """Verify 4 quarter turns of any face return the cube to solved state."""
        for base_move in ['U', 'D', 'L', 'R', 'F', 'B']:
            cube = Cube3BLD()
            for _ in range(4):
                cube.apply_move(base_move)
            self.assertEqual(cube.edges, [(i, 0) for i in range(12)], f"Edges failed 4x{base_move}")
            self.assertEqual(cube.corners, [(i, 0) for i in range(8)], f"Corners failed 4x{base_move}")

    def test_single_r_move_state(self):
        """Verify corner and edge permutations and orientation changes after single 'R' move."""
        self.cube.apply_move("R")

        # Affected Corners: 1 (UBR), 2 (UFR), 5 (DFR), 6 (DBR)
        # Permutation cycle: UFR(2) -> UBR(1) -> DBR(6) -> DFR(5) -> UFR(2)
        expected_corners = [(i, 0) for i in range(8)]
        expected_corners[1] = (2, 1)
        expected_corners[6] = (1, 2)
        expected_corners[5] = (6, 1)
        expected_corners[2] = (5, 2)
        self.assertEqual(self.cube.corners, expected_corners)

        # Affected Edges: 1 (UR), 5 (FR), 9 (DR), 6 (BR)
        # Cycle: UR(1) -> BR(6) -> DR(9) -> FR(5) -> UR(1)
        expected_edges = [(i, 0) for i in range(12)]
        expected_edges[6] = (1, 1)
        expected_edges[9] = (6, 1)
        expected_edges[5] = (9, 0)
        expected_edges[1] = (5, 0)
        self.assertEqual(self.cube.edges, expected_edges)

    def test_sexy_move_6_repetitions_solved(self):
        """Verify 6 repetitions of 'R U R' U'' return the cube state to solved."""
        for _ in range(6):
            self.cube.scramble("R U R' U'")
        
        self.assertEqual(self.cube.edges, [(i, 0) for i in range(12)])
        self.assertEqual(self.cube.corners, [(i, 0) for i in range(8)])

    def test_modifiers_equivalence(self):
        """Verify prime and double move modifiers match standard face turn combinations."""
        c1 = Cube3BLD()
        c2 = Cube3BLD()

        c1.apply_move("R'")
        c2.apply_move("R")
        c2.apply_move("R")
        c2.apply_move("R")
        self.assertEqual(c1.edges, c2.edges)
        self.assertEqual(c1.corners, c2.corners)

        c1 = Cube3BLD()
        c2 = Cube3BLD()
        c1.apply_move("U2")
        c2.apply_move("U")
        c2.apply_move("U")
        self.assertEqual(c1.edges, c2.edges)
        self.assertEqual(c1.corners, c2.corners)

    def test_scramble_parsing(self):
        """Verify multi-move scramble strings execute cleanly and match individual calls."""
        c1 = Cube3BLD()
        c2 = Cube3BLD()

        scramble_seq = "D2 R' F2 L B2 R U2"
        c1.scramble(scramble_seq)

        for m in scramble_seq.split():
            c2.apply_move(m)

        self.assertEqual(c1.edges, c2.edges)
        self.assertEqual(c1.corners, c2.corners)

    def test_physical_stickers_after_single_moves(self):
        """Verify sticker letters against a physical cube after one clockwise turn."""
        cases = [
            # (move, 'edge' or 'corner', slot, face, expected label)
            ('R', 'corner', 2, 'U', 'Y'),   # DFR front sticker comes up to UFR
            ('R', 'corner', 1, 'U', 'L'),   # UFR front sticker goes to UBR top
            ('U', 'edge', 0, 'U', 'C'),     # UL moves to UB
            ('U', 'edge', 3, 'U', '#U'),    # UF buffer moves to UL
            ('F', 'corner', 2, 'U', '#L'),  # UFL buffer's L sticker goes to UFR top
            ('D', 'edge', 9, 'D', 'A'),     # DF moves to DR
        ]
        for move, kind, slot, face, expected in cases:
            cube = Cube3BLD()
            cube.apply_move(move)
            getter = cube.get_edge_letter if kind == 'edge' else cube.get_corner_letter
            self.assertEqual(getter(slot, face), expected, f"{move}: {kind} slot {slot} {face}")

    def test_invalid_moves_rejected(self):
        """Verify malformed or unsupported move tokens raise ValueError."""
        for bad in ["R2'", "R'2", "r", "Rw", "x", "M", "U3", "RU"]:
            with self.assertRaises(ValueError, msg=bad):
                Cube3BLD().apply_move(bad)

    def test_buffer_piece_lookup_anywhere(self):
        """Verify every sticker is readable when buffer pieces leave their slots."""
        self.cube.scramble("U F")
        for slot, faces in Cube3BLD.EDGE_SLOT_FACES.items():
            for face in faces:
                self.cube.get_edge_letter(slot, face)
        for slot, faces in Cube3BLD.CORNER_SLOT_FACES.items():
            for face in faces:
                self.cube.get_corner_letter(slot, face)
        self.assertEqual(self.cube.get_edge_letter(2, 'U'), 'T')  # FL's L sticker moved up by F
        self.assertTrue(Cube3BLD.is_buffer_letter(self.cube.get_edge_letter(3, 'U')))  # UF buffer sent to UL by U


class StickerModel:
    """Independent 3D sticker simulator used as a reference for the move engine."""

    NORMALS = {'U': (0, 1, 0), 'D': (0, -1, 0), 'F': (0, 0, 1),
               'B': (0, 0, -1), 'R': (1, 0, 0), 'L': (-1, 0, 0)}

    @classmethod
    def position(cls, faces):
        return tuple(sum(cls.NORMALS[f][i] for f in faces) for i in range(3))

    @staticmethod
    def rotate(v, a):
        """Rotate v by 90 degrees clockwise as seen from the +a side."""
        cross = (a[1]*v[2] - a[2]*v[1], a[2]*v[0] - a[0]*v[2], a[0]*v[1] - a[1]*v[0])
        d = sum(x * y for x, y in zip(a, v))
        return tuple(-cross[i] + a[i] * d for i in range(3))

    def __init__(self):
        # (position, normal) -> sticker label
        self.stickers = {}
        for slot, faces in Cube3BLD.EDGE_SLOT_FACES.items():
            for f in faces:
                self.stickers[(self.position(faces), self.NORMALS[f])] = Cube3BLD.edge_sticker_label(slot, f)
        for slot, faces in Cube3BLD.CORNER_SLOT_FACES.items():
            for f in faces:
                self.stickers[(self.position(faces), self.NORMALS[f])] = Cube3BLD.corner_sticker_label(slot, f)

    def apply_move(self, move):
        a = self.NORMALS[move[0]]
        for _ in range({'': 1, '2': 2, "'": 3}[move[1:]]):
            self.stickers = {
                ((self.rotate(p, a), self.rotate(n, a))
                 if sum(x * y for x, y in zip(p, a)) == 1 else (p, n)): label
                for (p, n), label in self.stickers.items()
            }

    def sticker(self, faces, face):
        return self.stickers[(self.position(faces), self.NORMALS[face])]


class TestCube3BLDReference(unittest.TestCase):
    """Cross-check the move engine against the independent sticker model."""

    def assert_matches_model(self, moves):
        cube, model = Cube3BLD(), StickerModel()
        for m in moves:
            cube.apply_move(m)
            model.apply_move(m)
        label = ' '.join(moves)
        for slot, faces in Cube3BLD.EDGE_SLOT_FACES.items():
            for f in faces:
                self.assertEqual(cube.get_edge_letter(slot, f), model.sticker(faces, f),
                                 f"Edge slot {slot} {f} after '{label}'")
        for slot, faces in Cube3BLD.CORNER_SLOT_FACES.items():
            for f in faces:
                self.assertEqual(cube.get_corner_letter(slot, f), model.sticker(faces, f),
                                 f"Corner slot {slot} {f} after '{label}'")

    def test_each_single_move(self):
        """Verify every face turn and modifier matches the reference model."""
        for base in 'UDLRFB':
            for mod in ['', "'", '2']:
                self.assert_matches_model([base + mod])

    def test_random_scrambles(self):
        """Verify 500 seeded random scrambles match the reference model."""
        rng = random.Random(2026)
        for _ in range(500):
            moves = [rng.choice('UDLRFB') + rng.choice(['', "'", '2'])
                     for _ in range(rng.randint(1, 25))]
            self.assert_matches_model(moves)



# Verified cases from the Bilibili JB tutorial (photos in test-cases/caseN.png, memoN.png).
# Scrambles are in the WCA hold; memos use our notation (pairs, lowercase small-cycle
# start/closing letters, in-place pieces in brackets at the end).
TUTORIAL_CASES = [
    ("L B' R' F2 R2 D R' F' L U' F' R2 L2 F D2 F R2 B' L2 F2 L2",
     "HE PK JZ CM RW", "YG MJ QS"),
    ("F' L2 R2 F2 R2 B' U2 L2 U' L R' F2 D' U2 F2 D B' U2 L",
     "HQ PC YN LS WE A", "HZ DW TO L"),
    ("F2 R D L D' B' L2 F R' F L2 U2 F2 B U2 B' D2 L2 U2",
     "ZB AE TX Mc Rc (kl)", "MQ GJ ZE (rs)"),
    ("D2 L F2 U2 R2 D2 L B' L' D' U R2 D' B' U2 L D F",
     "TN Fc KH Zc qB WA q", "MP RK dZ e (gh)"),
    ("B2 U2 L2 B L2 D2 L2 F2 U' B2 F L F' U B L' U' B' F",
     "cA cg KY ge NQ eb TX p", "GQ dN fj YR k"),
]


class TestTutorialCases(unittest.TestCase):
    """Check the verified tutorial memos against the cube state, letter by letter."""

    def follow_memo(self, cube, kind, memo):
        """Walk every cycle in a memo and assert each letter matches the cube."""
        if kind == 'edge':
            get, lmap, faces, buf, state = (cube.get_edge_letter, Cube3BLD.EDGE_LETTER_MAP,
                                            Cube3BLD.EDGE_SLOT_FACES, Cube3BLD.EDGE_BUFFER_SLOT, cube.edges)
        else:
            get, lmap, faces, buf, state = (cube.get_corner_letter, Cube3BLD.CORNER_LETTER_MAP,
                                            Cube3BLD.CORNER_SLOT_FACES, Cube3BLD.CORNER_BUFFER_SLOT, cube.corners)
        home = {letter: (slot, face) for slot, d in lmap.items() for face, letter in d.items()}

        main = memo.split('(')[0].replace(' ', '')
        brackets = [b.strip(') ') for b in memo.split('(')[1:]]
        covered = {buf}

        # Main cycle: uppercase letters before the first small cycle
        i, pos = 0, (buf, 'U')
        while i < len(main) and main[i].isupper():
            self.assertEqual(get(*pos), main[i], f"{kind} main cycle letter {i}")
            pos = home[main[i]]
            covered.add(pos[0])
            i += 1
        self.assertTrue(Cube3BLD.is_buffer_letter(get(*pos)), f"{kind} main cycle should end at buffer")

        # Small cycles: lowercase start, uppercase targets, lowercase closing letter
        while i < len(main):
            start = home[main[i].upper()]
            self.assertTrue(main[i].islower(), f"{kind} small cycle must start lowercase")
            pos, i = start, i + 1
            covered.add(start[0])
            while main[i].isupper():
                self.assertEqual(get(*pos), main[i])
                pos = home[main[i]]
                covered.add(pos[0])
                i += 1
            self.assertEqual(get(*pos), main[i].upper(), f"{kind} small cycle closing letter")
            self.assertEqual(home[main[i].upper()][0], start[0], "closing letter on start piece")
            i += 1

        # In-place pieces: start sticker position shows the closing sticker
        for block in brackets:
            slot, face = home[block[0].upper()]
            self.assertEqual(state[slot][0], slot, f"({block}) piece must be in place")
            self.assertEqual(get(slot, face), block[1].upper(), f"({block}) orientation")
            covered.add(slot)

        unsolved = {s for s, (p, o) in enumerate(state) if (p, o) != (s, 0)}
        self.assertTrue(unsolved <= covered, f"{kind} memo misses slots {unsolved - covered}")

    def test_tutorial_memos_match_cube(self):
        for n, (scramble, edges, corners) in enumerate(TUTORIAL_CASES, 1):
            with self.subTest(case=n):
                cube = Cube3BLD()
                cube.scramble_wca(scramble)
                self.follow_memo(cube, 'edge', edges)
                self.follow_memo(cube, 'corner', corners)

    def test_parity_matches(self):
        """Edge and corner letter counts are both odd or both even."""
        for n, (_, edges, corners) in enumerate(TUTORIAL_CASES, 1):
            count = lambda memo: sum(ch.isalpha() for ch in memo)
            self.assertEqual(count(edges) % 2, count(corners) % 2, f"case {n}")

    def test_wca_translation(self):
        """WCA-hold U turns the white face, which is R in the blindfold hold."""
        c1, c2 = Cube3BLD(), Cube3BLD()
        c1.scramble_wca("U F' R2 D B L")
        c2.scramble("R U' F2 L D B")
        self.assertEqual((c1.edges, c1.corners), (c2.edges, c2.corners))


if __name__ == '__main__':
    unittest.main(verbosity=2)