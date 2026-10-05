import random
import unittest
from cube_state import Cube3BLD
from memo import check_memo, parse_memo, trace_memo
from visual import get_face_grid, render_net
from trainer import AXIS, Trainer, generate_scramble

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



class TestCube3BLDStep5(unittest.TestCase):
    """Memo checker: executing a valid memo as buffer swaps solves the cube."""

    def scrambled(self, case_index):
        cube = Cube3BLD()
        cube.scramble_wca(TUTORIAL_CASES[case_index][0])
        return cube

    def test_tutorial_memos_accepted(self):
        for n, (scramble, edges, corners) in enumerate(TUTORIAL_CASES, 1):
            with self.subTest(case=n):
                cube = Cube3BLD()
                cube.scramble_wca(scramble)
                result = check_memo(cube, edges, corners)
                self.assertTrue(result.correct, result.messages)

    def test_format_ignored(self):
        """Case, brackets and spaces are only formatting."""
        cube = self.scrambled(2)
        for edges, corners in [("zbaetxmcrckl", "mqgjzers"),
                               ("ZBAETXMCRCKL", "MQGJZERS"),
                               ("Z B A E T X M C R C (K L)", "mq gj ze rs"),
                               ("zb ae tx mc rc kl", "((MQ)) GJ ZE RS")]:
            with self.subTest(edges=edges, corners=corners):
                self.assertTrue(check_memo(cube, edges, corners).correct)

    def test_alternate_small_cycle_start_accepted(self):
        """Breaking into a different piece of the same cycle is still valid (case 4)."""
        cube = self.scrambled(3)
        self.assertTrue(check_memo(cube, "TN Fg YD Lg qB WA q", "MP RK dZ e (gh)").correct)

    def test_wrong_memos_rejected(self):
        cube = self.scrambled(3)
        good_edges, good_corners = TUTORIAL_CASES[3][1], TUTORIAL_CASES[3][2]
        bad = {
            "swapped letters": ("TN cF KH Zc qB WA q", good_corners),
            "wrong twist direction": (good_edges, "MP RK dZ e (gi)"),
            "missing twist": (good_edges, "MP RK dZ e"),
            "missing letter": ("TN Fc KH Zc qB WA", good_corners),
            "extra letter": (good_edges, "MP RK dZ e (gh) A"),
        }
        for name, (edges, corners) in bad.items():
            with self.subTest(name):
                self.assertFalse(check_memo(cube, edges, corners).correct)

    def test_result_reports_which_part_failed(self):
        cube = self.scrambled(3)
        result = check_memo(cube, TUTORIAL_CASES[3][1], "MP RK dZ e (gi)")
        self.assertTrue(result.edges_ok)
        self.assertFalse(result.corners_ok)
        self.assertTrue(any("UBR" in m for m in result.messages))

    def test_invalid_letters_reported_not_crash(self):
        """Letters outside the scheme (edges have no I, O, U, V) fail with a message."""
        cube = self.scrambled(0)
        result = check_memo(cube, "HE PK IZ CM RW", "YG MJ QS")
        self.assertFalse(result.edges_ok)
        self.assertTrue(result.corners_ok)
        self.assertIn("'I'", result.messages[0])
        with self.assertRaises(ValueError):
            parse_memo("AB,CD", 'edge')

    def test_parity_flag(self):
        """Cases 2, 4 and 5 have odd letter counts (parity); 1 and 3 do not."""
        for n, (scramble, edges, corners) in enumerate(TUTORIAL_CASES, 1):
            cube = Cube3BLD()
            cube.scramble_wca(scramble)
            self.assertEqual(check_memo(cube, edges, corners).has_parity, n in (2, 4, 5), f"case {n}")

    def test_solved_cube_empty_memo(self):
        self.assertTrue(check_memo(Cube3BLD(), "", "").correct)
        self.assertFalse(check_memo(Cube3BLD(), "AB", "").correct)

    def test_check_does_not_modify_cube(self):
        cube = self.scrambled(0)
        before = (list(cube.edges), list(cube.corners))
        check_memo(cube, TUTORIAL_CASES[0][1], TUTORIAL_CASES[0][2])
        self.assertEqual((cube.edges, cube.corners), before)



def random_scramble(rng, length=25):
    return ' '.join(rng.choice('UDLRFB') + rng.choice(['', "'", '2']) for _ in range(length))


class TestCube3BLDStep6(unittest.TestCase):
    """Cycle tracer: its memo must always be accepted by the checker."""

    def test_random_scrambles_traced_memo_solves(self):
        """Property test: 1000 random scrambles, traced memo passes the checker."""
        rng = random.Random(6)
        for _ in range(1000):
            scramble = random_scramble(rng)
            cube = Cube3BLD()
            cube.scramble(scramble)
            edges, corners = trace_memo(cube)
            result = check_memo(cube, edges, corners)
            self.assertTrue(result.correct, f"{scramble}: {edges} | {corners} {result.messages}")

    def test_tutorial_cases(self):
        """Cases 1-3 have no cycle-break choices and match exactly; 4-5 must be valid."""
        for n, (scramble, edges, corners) in enumerate(TUTORIAL_CASES, 1):
            with self.subTest(case=n):
                cube = Cube3BLD()
                cube.scramble_wca(scramble)
                traced = trace_memo(cube)
                if n <= 3:
                    self.assertEqual(traced, (edges, corners))
                self.assertTrue(check_memo(cube, *traced).correct)
                letters = lambda memo: sum(ch.isalpha() for ch in memo)
                self.assertEqual((letters(traced[0]), letters(traced[1])),
                                 (letters(edges), letters(corners)))

    def test_single_swap_targets(self):
        cube = Cube3BLD()
        cube.scramble("U2")
        # Edges: UF<->UB gives E, then UL<->UR is a small cycle c G c.
        # Corners: UFL<->UBR gives G, then UBL<->UFR is a small cycle d J d.
        self.assertEqual(trace_memo(cube), ("Ec Gc", "Gd Jd"))
        self.assertTrue(check_memo(cube, *trace_memo(cube)).correct)
        cube = Cube3BLD()
        cube.scramble("R2")
        self.assertTrue(check_memo(cube, *trace_memo(cube)).correct)
        self.assertEqual(trace_memo(Cube3BLD()), ("", ""))

    def test_letter_count_rule(self):
        """Letters = 11 (or 7) - solved pieces + small cycles (in-place blocks count as one)."""
        rng = random.Random(7)
        for _ in range(300):
            cube = Cube3BLD()
            cube.scramble(random_scramble(rng))
            for memo, state, buf, total in ((trace_memo(cube)[0], cube.edges, 2, 11),
                                            (trace_memo(cube)[1], cube.corners, 3, 7)):
                solved = sum(1 for s, p in enumerate(state) if s != buf and p == (s, 0))
                small_cycles = sum(1 for ch in memo if ch.islower()) // 2
                self.assertEqual(sum(ch.isalpha() for ch in memo), total - solved + small_cycles, memo)

    def test_buffer_in_place(self):
        """Buffer piece already in its slot (solved, flipped, twisted): start a small cycle."""
        rng = random.Random(8)
        found = set()
        while len(found) < 4:
            cube = Cube3BLD()
            cube.scramble(random_scramble(rng))
            edges, corners = trace_memo(cube)
            for kind, memo, (piece, ori), buf in (('edge', edges, cube.edges[2], 2),
                                                  ('corner', corners, cube.corners[3], 3)):
                if piece == buf and memo:
                    found.add((kind, ori != 0))
                    self.assertTrue(memo[0].islower(), f"{kind} memo should start a small cycle: {memo}")
                    self.assertTrue(check_memo(cube, edges, corners).correct)

    def test_closing_letter_can_differ(self):
        """Case 4 corners: small cycle d Z e closes on a different UBL sticker."""
        cube = Cube3BLD()
        cube.scramble_wca(TUTORIAL_CASES[3][0])
        self.assertIn("dZ e", trace_memo(cube)[1])



class TestCube3BLDStep7(unittest.TestCase):
    """2D net visualizer."""

    # Letter table from the design doc ('#' = buffer, '·' = centre)
    DOC_TABLE = {
        'U': ["DEG", "C·G", "##J"],
        'F': ["##L", "S·Q", "NJY"],
        'R': ["KHI", "R·Z", "ZPS"],
        'B': ["HFF", "Y·W", "TNP"],
        'L': ["ED#", "X·T", "QLM"],
        'D': ["WAX", "K·B", "OMR"],
    }

    def test_solved_letters_match_design_doc_table(self):
        for face, rows in self.DOC_TABLE.items():
            grid = get_face_grid(Cube3BLD(), face, 'letter')
            self.assertEqual([''.join(r) for r in grid], rows, face)

    def test_solved_face_and_colour_modes(self):
        colours = {'U': 'G', 'F': 'R', 'R': 'W', 'B': 'O', 'L': 'Y', 'D': 'B'}
        for face, colour in colours.items():
            self.assertEqual(get_face_grid(Cube3BLD(), face, 'face'), [[face] * 3] * 3)
            self.assertEqual(get_face_grid(Cube3BLD(), face, 'colour'), [[colour] * 3] * 3)

    def test_colours_after_r(self):
        """After R: U right column red, F right column blue, B left column green."""
        cube = Cube3BLD()
        cube.apply_move('R')
        column = lambda face, c: [row[c] for row in get_face_grid(cube, face, 'colour')]
        self.assertEqual(column('U', 2), ['R'] * 3)
        self.assertEqual(column('F', 2), ['B'] * 3)
        self.assertEqual(column('D', 2), ['O'] * 3)
        self.assertEqual(column('B', 0), ['G'] * 3)
        self.assertEqual(column('U', 0), ['G'] * 3)

    def test_every_scrambled_face_has_nine_stickers_of_each_colour(self):
        cube = Cube3BLD()
        cube.scramble_wca(TUTORIAL_CASES[0][0])
        counts = {}
        for face in 'UDFBLR':
            for row in get_face_grid(cube, face, 'colour'):
                for c in row:
                    counts[c] = counts.get(c, 0) + 1
        self.assertEqual(counts, {c: 9 for c in 'GRWOYB'})

    def test_render_net_and_invalid_mode(self):
        lines = render_net(Cube3BLD()).splitlines()
        self.assertEqual(len(lines), 11)
        self.assertEqual(lines[0].strip(), "D E G")
        with self.assertRaises(ValueError):
            get_face_grid(Cube3BLD(), 'U', 'rainbow')



class TestCube3BLDStep8(unittest.TestCase):
    """CLI trainer: scramble generator and scripted sessions."""

    def run_session(self, inputs, rng=None):
        answers = iter(inputs)
        outputs = []

        def fake_input(prompt):
            outputs.append(prompt)
            answer = next(answers)
            # A callable answer computes the reply from what has been printed so far
            return answer(outputs) if callable(answer) else answer

        trainer = Trainer(input_fn=fake_input, output_fn=outputs.append, rng=rng or random.Random(1))
        trainer.run()
        return trainer, '\n'.join(outputs)

    @staticmethod
    def reference_answer(kind):
        """Reply with the tracer's memo for the last scramble shown."""
        def answer(outputs):
            line = [o for o in outputs if o.startswith("Scramble (white top")][-1]
            cube = Cube3BLD()
            cube.scramble_wca(line.split(": ", 1)[1])
            return trace_memo(cube)[0 if kind == 'edge' else 1]
        return answer

    def test_generator_rules(self):
        rng = random.Random(8)
        for _ in range(500):
            moves = generate_scramble(rng).split()
            self.assertEqual(len(moves), 18)
            Cube3BLD().scramble(' '.join(moves))  # every token valid
            for a, b in zip(moves, moves[1:]):
                self.assertNotEqual(a[0], b[0], moves)
            for a, b, c in zip(moves, moves[1:], moves[2:]):
                self.assertFalse(AXIS[a[0]] == AXIS[b[0]] == AXIS[c[0]], moves)

    def test_generator_seeded_is_reproducible(self):
        self.assertEqual(generate_scramble(random.Random(3)), generate_scramble(random.Random(3)))

    def test_custom_scramble_correct_unformatted_memo(self):
        trainer, out = self.run_session(["2", TUTORIAL_CASES[2][0], "zbaetxmcrckl", "mqgjzers", "n", "q"])
        self.assertIn("Success!", out)
        self.assertNotIn("Check your scramble", out)  # own scramble: no net up front
        self.assertEqual((trainer.correct, trainer.attempts), (1, 1))
        self.assertIn("Session over. Score: 1/1", out)

    def test_random_scramble_correct_and_wrong(self):
        trainer, out = self.run_session([
            "1", self.reference_answer('edge'), self.reference_answer('corner'), "n",
            "1", "AB", "DE", "y",
            "q"])
        self.assertEqual((trainer.correct, trainer.attempts), (1, 2))
        self.assertEqual(out.count("Check your scramble"), 2)  # colour net after each random scramble
        self.assertIn("Fail.", out)
        self.assertIn("Reference memo", out)
        self.assertIn("·", out)  # letter net printed after answering y
        self.assertIn("Score: 1/2", out)

    def test_invalid_letter_reprompts(self):
        trainer, out = self.run_session(["2", TUTORIAL_CASES[0][0], "HE PK IZ CM RW",
                                         "HE PK JZ CM RW", "YG MJ QS", "n", "q"])
        self.assertIn("'I' is not an edge letter", out)
        self.assertEqual((trainer.correct, trainer.attempts), (1, 1))

    def test_parity_reported(self):
        _, out = self.run_session(["2", TUTORIAL_CASES[1][0], TUTORIAL_CASES[1][1],
                                   TUTORIAL_CASES[1][2], "n", "q"])
        self.assertIn("Success! (parity)", out)

    def test_skip_net_and_quit_commands(self):
        trainer, out = self.run_session(["1", "/net", "/skip", "2", "R2 Rw", "1", "/quit"])
        self.assertIn("Skipped (not scored).", out)
        self.assertIn("Unsupported move", out)
        self.assertEqual(trainer.attempts, 0)
        self.assertIn("Session over. Score: 0/0", out)

    def test_empty_memo_on_solved_scramble(self):
        trainer, out = self.run_session(["2", "", "", "", "n", "q"])
        self.assertEqual(trainer.correct, 1)

    def test_end_of_input_exits_cleanly(self):
        def eof(prompt):
            raise EOFError
        trainer = Trainer(input_fn=eof, output_fn=lambda *_: None)
        trainer.run()
        self.assertEqual(trainer.attempts, 0)



class TestSharedVectors(unittest.TestCase):
    """web/test_vectors.json must match the current Python code (the JS port is tested against it)."""

    def test_vectors_file_is_up_to_date(self):
        import json
        from export_vectors import OUTPUT, build_vectors
        with open(OUTPUT, encoding='utf-8') as f:
            on_disk = json.load(f)
        current = json.loads(json.dumps(build_vectors(), ensure_ascii=False))
        self.assertTrue(on_disk == current,
                        "web/test_vectors.json is stale: run `python3 export_vectors.py`, then the JS tests")


if __name__ == '__main__':
    unittest.main(verbosity=2)