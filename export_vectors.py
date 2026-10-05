"""
Export shared test vectors from the Python reference implementation.
The JavaScript port in web/ must reproduce every value exactly.

Run after any change to cube_state.py, memo.py or visual.py:
    python3 export_vectors.py
"""
import json
import random
from dataclasses import asdict

from cube_state import Cube3BLD
from memo import check_memo, trace_memo
from tests import TUTORIAL_CASES
from trainer import generate_scramble
from visual import get_face_grid

OUTPUT = 'web/test_vectors.json'
SEED = 2026
RANDOM_CASES = 200
INVALID_MOVES = ["R2'", "R'2", "r", "Rw", "x", "M", "U3", "RU"]


def check_result(cube, edges, corners) -> dict:
    result = check_memo(cube, edges, corners)
    return {'edges': edges, 'corners': corners, **asdict(result), 'has_parity': result.has_parity}


def wrong_variants(memo: str) -> list:
    """Wrong or reformatted versions of a memo to exercise the checker."""
    letters = [ch for ch in memo if ch.isalpha()]
    variants = [memo.replace(' ', '').replace('(', '').replace(')', '').lower()]  # formatting only
    if len(letters) >= 2:
        swapped = letters[:]
        swapped[0], swapped[1] = swapped[1], swapped[0]
        variants.append(''.join(swapped))                                          # swapped letters
        variants.append(''.join(letters[:-1]))                                     # missing letter
    return variants


def case_vector(cube: Cube3BLD, scramble: str, hold: str, memos=None) -> dict:
    edges, corners = trace_memo(cube)
    checks = [check_result(cube, edges, corners)]
    for variant in wrong_variants(edges):
        checks.append(check_result(cube, variant, corners))
    for variant in wrong_variants(corners):
        checks.append(check_result(cube, edges, variant))
    checks.append(check_result(cube, edges + ' I', corners))       # letter not in the edge scheme
    checks.append(check_result(cube, edges, corners + ' C'))       # letter not in the corner scheme
    if memos:
        checks.append(check_result(cube, *memos))                  # tutorial memo as written

    return {
        'scramble': scramble,
        'hold': hold,                                               # 'wca' or 'memo'
        'edges': [list(p) for p in cube.edges],
        'corners': [list(p) for p in cube.corners],
        'grids': {mode: {face: get_face_grid(cube, face, mode) for face in 'UDFBLR'}
                  for mode in ('letter', 'face', 'colour')},
        'trace': [edges, corners],
        'checks': checks,
    }


def build_vectors() -> dict:
    rng = random.Random(SEED)
    cases = []

    for scramble, edges, corners in TUTORIAL_CASES:
        cube = Cube3BLD()
        cube.scramble_wca(scramble)
        cases.append(case_vector(cube, scramble, 'wca', (edges, corners)))

    for i in range(RANDOM_CASES):
        hold = 'wca' if i % 2 == 0 else 'memo'
        scramble = generate_scramble(rng, length=rng.randint(1, 25))
        cube = Cube3BLD()
        cube.scramble_wca(scramble) if hold == 'wca' else cube.scramble(scramble)
        cases.append(case_vector(cube, scramble, hold))

    single_moves = {}
    for face in 'UDLRFB':
        for mod in ['', "'", '2']:
            cube = Cube3BLD()
            cube.apply_move(face + mod)
            single_moves[face + mod] = {'edges': [list(p) for p in cube.edges],
                                        'corners': [list(p) for p in cube.corners]}

    return {
        'generated_by': 'export_vectors.py',
        'seed': SEED,
        'invalid_moves': INVALID_MOVES,
        'single_moves': single_moves,
        'cases': cases,
    }


def main():
    vectors = build_vectors()
    cases = vectors['cases']
    with open(OUTPUT, 'w', encoding='utf-8') as f:
        json.dump(vectors, f, ensure_ascii=False, separators=(',', ':'))
    print(f"Wrote {len(cases)} cases to {OUTPUT}")


if __name__ == '__main__':
    main()
