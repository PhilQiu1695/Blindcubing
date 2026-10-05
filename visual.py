from cube_state import Cube3BLD


# Face normals, and each face's (up, right) directions as seen looking at it from outside.
# Matches the letter table in the design doc: U has B at the top, D has F at the top,
# and the side faces have U at the top.
NORMALS = {'U': (0, 1, 0), 'D': (0, -1, 0), 'F': (0, 0, 1),
           'B': (0, 0, -1), 'R': (1, 0, 0), 'L': (-1, 0, 0)}
VIEWS = {
    'U': ((0, 0, -1), (1, 0, 0)),
    'F': ((0, 1, 0), (1, 0, 0)),
    'R': ((0, 1, 0), (0, 0, -1)),
    'B': ((0, 1, 0), (-1, 0, 0)),
    'L': ((0, 1, 0), (0, 0, 1)),
    'D': ((0, 0, 1), (1, 0, 0)),
}

# Colours in the blindfold hold
FACE_COLOURS = {'U': 'G', 'F': 'R', 'R': 'W', 'B': 'O', 'L': 'Y', 'D': 'B'}

MODES = ('letter', 'face', 'colour')


def _position(faces) -> tuple:
    return tuple(sum(NORMALS[f][i] for f in faces) for i in range(3))


_EDGE_AT = {_position(faces): slot for slot, faces in Cube3BLD.EDGE_SLOT_FACES.items()}
_CORNER_AT = {_position(faces): slot for slot, faces in Cube3BLD.CORNER_SLOT_FACES.items()}


def _home_face(label: str, kind: str) -> str:
    """Face a sticker belongs to on a solved cube."""
    if Cube3BLD.is_buffer_letter(label):
        return label[1]
    # Edge and corner schemes reuse letters, so look up within the right scheme
    letter_map = Cube3BLD.EDGE_LETTER_MAP if kind == 'edge' else Cube3BLD.CORNER_LETTER_MAP
    return next(face for faces in letter_map.values() for face, letter in faces.items() if letter == label)


def get_face_grid(cube: Cube3BLD, face: str, mode: str = 'letter') -> list:
    """
    3x3 grid of one face as seen from outside the cube.
    mode 'letter': JB letters ('#' for buffer stickers, '·' for the centre)
    mode 'face':   the face each sticker belongs to on a solved cube (U, F, R, ...)
    mode 'colour': sticker colour initial in the blindfold hold (G, R, W, O, Y, B)
    """
    if mode not in MODES:
        raise ValueError(f"Unknown mode '{mode}', use one of {MODES}")
    n = NORMALS[face]
    up, right = VIEWS[face]
    grid = []
    for row in range(3):
        cells = []
        for col in range(3):
            pos = tuple(n[i] + up[i] * (1 - row) + right[i] * (col - 1) for i in range(3))
            nonzero = sum(1 for x in pos if x)
            if nonzero == 1:
                label, home = None, face
            elif nonzero == 2:
                label = cube.get_edge_letter(_EDGE_AT[pos], face)
                home = _home_face(label, 'edge')
            else:
                label = cube.get_corner_letter(_CORNER_AT[pos], face)
                home = _home_face(label, 'corner')

            if mode == 'face':
                cells.append(home)
            elif mode == 'colour':
                cells.append(FACE_COLOURS[home])
            elif label is None:
                cells.append('·')
            else:
                cells.append('#' if Cube3BLD.is_buffer_letter(label) else label)
        grid.append(cells)
    return grid


def render_net(cube: Cube3BLD, mode: str = 'letter') -> str:
    """Unfolded cube net as text: U on top, L F R B in the middle, D at the bottom."""
    grids = {face: get_face_grid(cube, face, mode) for face in NORMALS}
    row_text = lambda grid, r: ' '.join(grid[r])
    pad = ' ' * 8
    lines = []
    for r in range(3):
        lines.append(pad + row_text(grids['U'], r))
    lines.append('')
    for r in range(3):
        lines.append('  '.join(row_text(grids[f], r) for f in 'LFRB'))
    lines.append('')
    for r in range(3):
        lines.append(pad + row_text(grids['D'], r))
    return '\n'.join(lines)


def print_cube_state(cube: Cube3BLD, mode: str = 'letter'):
    """Print the unfolded cube net."""
    print(render_net(cube, mode))
