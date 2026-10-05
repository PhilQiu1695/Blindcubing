import copy
from dataclasses import dataclass, field

from cube_state import Cube3BLD


# Characters that are only formatting; case is also ignored
FORMAT_CHARS = set(" ()")

FACE_NAME_ORDER = "UDFBLR"


@dataclass
class MemoCheck:
    """Result of checking a user's edge and corner memo against a scrambled cube."""
    correct: bool
    edges_ok: bool
    corners_ok: bool
    edge_count: int = 0
    corner_count: int = 0
    messages: list = field(default_factory=list)

    @property
    def has_parity(self) -> bool:
        """An odd number of letters means the solve needs the parity algorithm."""
        return self.edge_count % 2 == 1


def _piece_tables(kind: str):
    """Return (state attribute, slot faces, letter map, buffer slot, modulus) for edges or corners."""
    if kind == 'edge':
        return 'edges', Cube3BLD.EDGE_SLOT_FACES, Cube3BLD.EDGE_LETTER_MAP, Cube3BLD.EDGE_BUFFER_SLOT, 2
    return 'corners', Cube3BLD.CORNER_SLOT_FACES, Cube3BLD.CORNER_LETTER_MAP, Cube3BLD.CORNER_BUFFER_SLOT, 3


def _slot_name(faces) -> str:
    """Standard piece name for a slot, e.g. ('U','R','B') -> 'UBR'."""
    return ''.join(sorted(faces, key=FACE_NAME_ORDER.index))


def parse_memo(text: str, kind: str) -> list:
    """
    Turn a memo string into a list of uppercase target letters.
    Case, spaces and brackets are formatting only and are ignored.
    Raises ValueError for any other character or a letter not in the scheme.
    """
    _, _, letter_map, _, _ = _piece_tables(kind)
    valid = {letter for faces in letter_map.values() for letter in faces.values()}
    letters = []
    for ch in text:
        if ch in FORMAT_CHARS:
            continue
        letter = ch.upper()
        if letter not in valid:
            raise ValueError(f"'{ch}' is not a {kind} letter in the JB scheme")
        letters.append(letter)
    return letters


def execute_memo(cube: Cube3BLD, kind: str, letters: list):
    """
    Apply each letter as one buffer swap, in place.
    A swap moves the buffer piece so that its sticker on the buffer's U face lands
    on the target sticker, and brings the target slot's piece to the buffer with
    the target sticker on the buffer's U face.
    """
    attr, slot_faces, letter_map, buffer_slot, n = _piece_tables(kind)
    home = {letter: (slot, face) for slot, faces in letter_map.items() for face, letter in faces.items()}
    state = list(getattr(cube, attr))

    for letter in letters:
        target, face = home[letter]
        j = slot_faces[target].index(face)

        buffer_piece, buffer_ori = state[buffer_slot]
        target_piece, target_ori = state[target]
        k = buffer_ori % n                 # buffer piece sticker on buffer U face (index 0)
        m = (j + target_ori) % n           # target piece sticker on the target face

        state[target] = (buffer_piece, (k - j) % n)
        state[buffer_slot] = (target_piece, m)

    setattr(cube, attr, state)


def unsolved_pieces(cube: Cube3BLD, kind: str) -> list:
    """Names of slots whose piece is not home with orientation 0."""
    attr, slot_faces, _, _, _ = _piece_tables(kind)
    return [_slot_name(slot_faces[slot]) for slot, (piece, ori) in enumerate(getattr(cube, attr))
            if (piece, ori) != (slot, 0)]


def check_memo(cube: Cube3BLD, edge_memo: str, corner_memo: str) -> MemoCheck:
    """
    Check a user's memo against a scrambled cube without changing it.
    The memo is correct if executing both memos as buffer swaps solves the cube.
    Any valid memo is accepted, whichever pieces the small cycles start from.
    """
    results = {}
    counts = {}
    messages = []
    for kind, text in (('edge', edge_memo), ('corner', corner_memo)):
        try:
            letters = parse_memo(text, kind)
        except ValueError as err:
            results[kind] = False
            counts[kind] = 0
            messages.append(f"{kind.capitalize()}s: {err}")
            continue

        counts[kind] = len(letters)
        trial = copy.deepcopy(cube)
        execute_memo(trial, kind, letters)
        left = unsolved_pieces(trial, kind)
        results[kind] = not left
        if left:
            messages.append(f"{kind.capitalize()}s: memo leaves {', '.join(left)} unsolved")

    return MemoCheck(
        correct=results['edge'] and results['corner'],
        edges_ok=results['edge'],
        corners_ok=results['corner'],
        edge_count=counts['edge'],
        corner_count=counts['corner'],
        messages=messages,
    )


def _format_memo(letters: list, in_place: list) -> str:
    """Letters in pairs separated by spaces, then each in-place block in brackets."""
    pairs = [''.join(letters[i:i + 2]) for i in range(0, len(letters), 2)]
    return ' '.join(pairs + [f"({block})" for block in in_place])


def trace(cube: Cube3BLD, kind: str) -> str:
    """
    Trace the reference memo for edges or corners using the JB rules:
    - Start from the buffer's U sticker and follow targets until a buffer sticker.
    - Break into each remaining cycle with a lowercase start letter and record the
      lowercase closing letter (any sticker of the start piece).
    - Corners start small cycles from the U/D sticker. Among unsolved pieces, the
      one with the lowest start letter is broken into first.
    - Pieces in place but flipped/twisted become 2-letter blocks in brackets at the end.
    """
    attr, slot_faces, letter_map, buffer_slot, _ = _piece_tables(kind)
    get = cube.get_edge_letter if kind == 'edge' else cube.get_corner_letter
    home = {letter: (slot, face) for slot, faces in letter_map.items() for face, letter in faces.items()}
    state = getattr(cube, attr)

    letters, in_place = [], []
    recorded = {buffer_slot}

    # Main cycle from the buffer's U sticker
    pos = (buffer_slot, 'U')
    while not Cube3BLD.is_buffer_letter(get(*pos)):
        letter = get(*pos)
        letters.append(letter)
        pos = home[letter]
        recorded.add(pos[0])

    # Small cycles, broken into in order of their start letter
    start_face = {slot: slot_faces[slot][0] for slot in letter_map}  # U/D face first for corners
    for slot in sorted(letter_map, key=lambda s: letter_map[s][start_face[s]]):
        piece, ori = state[slot]
        if slot in recorded or (piece, ori) == (slot, 0):
            continue
        recorded.add(slot)
        start = (slot, start_face[slot])
        start_letter = letter_map[slot][start_face[slot]].lower()

        if piece == slot:
            in_place.append(start_letter + get(*start).lower())
            continue

        letters.append(start_letter)
        pos = start
        while True:
            letter = get(*pos)
            pos = home[letter]
            if pos[0] == slot:
                letters.append(letter.lower())
                break
            letters.append(letter)
            recorded.add(pos[0])

    return _format_memo(letters, in_place)


def trace_memo(cube: Cube3BLD) -> tuple:
    """Reference (edge memo, corner memo) for a scrambled cube."""
    return trace(cube, 'edge'), trace(cube, 'corner')
