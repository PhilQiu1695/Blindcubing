# Blind-cubing (3BLD JB-method trainer)

A Python trainer for 3x3 blindfolded memo. It scrambles a cube, traces the correct
edge and corner memo using the JB letter scheme, and checks the user's memo.
The full spec and the step-by-step plan are in `design_doc.text`. Read it before
starting a new workflow step.

## Files
- `memo.py`: memo parser and checker (`parse_memo`, `execute_memo`, `check_memo`) and cycle tracer (`trace_memo`)
- `trainer.py`: CLI trainer (`generate_scramble`, `Trainer`); I/O is injectable for tests
- `visual.py`: 2D net (`get_face_grid`, `render_net`, `print_cube_state`; modes letter/face/colour)
- `cube_state.py`: the `Cube3BLD` class (state, letter maps, move engine, scramble parser)
- `tests.py`: unittest suite, with one test class per workflow step, plus `StickerModel`, an independent reference simulator
- `test-cases/`: tutorial scramble/memo photos (caseN.png, memoN.png); transcribed in `TUTORIAL_CASES` in `tests.py`
- `design_doc.text`: spec, memo rules, letter scheme, the 8-step workflow, and Phase 2 (website)

## Commands
- Run trainer: `python3 trainer.py`
- Run tests: `python3 tests.py` (Python 3.11, standard library only, no dependencies)

## Cube model
- Hold: **U = Green, F = Red, R = White, B = Orange, L = Yellow, D = Blue**.
  Scrambles written for the WCA hold (white top, green front) need translating:
  U→R, F→U, R→F, D→L, B→D, L→B. Use `Cube3BLD.scramble_wca()` for these.
- State: `edges[slot] = (piece_id, ori)` and `corners[slot] = (piece_id, ori)`.
  A piece id is the index of its home slot.
- Buffers: edge UF (slot 2), corner UFL (slot 3).
- `EDGE_LETTER_MAP` / `CORNER_LETTER_MAP` are the source of truth for letters, and
  they match the table in the design doc. Don't change letters without asking.
- Corner face tuples must all go around the corner in the same direction
  (clockwise). Otherwise a cyclic `ori` offset can't describe every state.

## Status (as of 2026-10-05)
- Workflow steps 1-3 are done: data structures, move engine and parser, and the
  sticker-model cross-check (`TestCube3BLDReference`).
- Step 4 (memo spec) is decided; see "What is a valid memo?" and workflow step 4
  in the design doc. Step 5 (memo checker) is done in `memo.py`: `check_memo()`
  ignores case/brackets/spaces and runs each letter as a buffer swap.
  Step 6 (cycle tracer) is done: `trace_memo()` in `memo.py`. Step 7 (net visualizer)
  is done in `visual.py`. Step 8 (CLI trainer) is
  built in `trainer.py`; the manual 5-session check is pending.
- Phase 2 (website, steps 9-13 in the design doc) is planned: JavaScript port
  in `web/`, kept identical to Python via `web/test_vectors.json`.
- Buffer stickers read as `#U` / `#F` / `#L`; use `Cube3BLD.is_buffer_letter()`.

## Working rules
- After any change to the move engine, run the tests. The reference sticker-model
  tests must pass; "N turns = identity" tests are not enough on their own.
- Get expected sticker values from a physical cube or the sticker model, never
  from the code's own output.
- Keep `cube_state.py` free of I/O. Put the CLI, visualizer and trainer loop in
  separate modules.
- New behavior gets a test in `tests.py`, in the class for its workflow step.
- Match the existing style: type hints, short docstrings, class-level constant tables.
- If a memo rule is ambiguous (parity, twist notation, closing letters), ask.
  Don't invent a rule.
