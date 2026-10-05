# Blind-cubing (3BLD JB-method trainer)

A Python trainer for 3x3 blindfolded memo. It scrambles a cube, traces the correct
edge and corner memo using the JB letter scheme, and checks the user's memo.
The full spec and the step-by-step plan are in `design_doc.text`. Read it before
starting a new workflow step.

## Files
- `web/js/`: JavaScript port (`cube.js`, `memo.js`, `visual.js`, `scramble.js`); `web/tests/`: Node tests
- `web/index.html`, `web/css/style.css`, `web/js/app.js` (UI wiring), `render.js` (sticker data + SVG net, DOM-free and
  tested), `cube3d.js` (CSS 3D cube), `timer.js` (memo-split timer + attempt records), `stats.js` (success rate, best, mo3, ao12),
  `storage.js` (localStorage, JSON/CSV export, JSON import); all DOM-free and tested
- `export_vectors.py`: writes `web/test_vectors.json` from the Python code
- `memo.py`: memo parser and checker (`parse_memo`, `execute_memo`, `check_memo`) and cycle tracer (`trace_memo`)
- `trainer.py`: CLI trainer (`generate_scramble`, `Trainer`); I/O is injectable for tests
- `visual.py`: 2D net (`get_face_grid`, `render_net`, `print_cube_state`; modes letter/face/colour)
- `cube_state.py`: the `Cube3BLD` class (state, letter maps, move engine, scramble parser)
- `tests.py`: unittest suite, with one test class per workflow step, plus `StickerModel`, an independent reference simulator
- `test-cases/`: tutorial scramble/memo photos (caseN.png, memoN.png); transcribed in `TUTORIAL_CASES` in `tests.py`
- `design_doc.text`: spec, memo rules, letter scheme, the 8-step workflow, and Phase 2 (website)

## Commands
- Run trainer: `python3 trainer.py`
- Run tests: `python3 tests.py`
- JS tests: `cd web && node --test` (Node 24, no dependencies)
- Regenerate shared test vectors: `python3 export_vectors.py`
- Run the website locally: `cd web && python3 -m http.server 8000`, then open http://localhost:8000
  (ES modules don't load from file://) (Python 3.11, standard library only, no dependencies)

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
- Phase 1 (steps 1-8) is complete: engine, reference cross-check, memo spec,
  checker and tracer (`memo.py`), net (`visual.py`), CLI trainer (`trainer.py`).
- Memo rules are in "What is a valid memo?" in the design doc. `check_memo()`
  ignores case/brackets/spaces and runs each letter as a buffer swap.
- Phase 2 (website, steps 9-13): steps 9-12 done. The JS port in `web/js/` is kept
  identical to Python via `web/test_vectors.json`. Next: step 13, deploy.
- Buffer stickers read as `#U` / `#F` / `#L`; use `Cube3BLD.is_buffer_letter()`.

## Working rules
- After any change to the move engine, run the tests. The reference sticker-model
  tests must pass; "N turns = identity" tests are not enough on their own.
- Get expected sticker values from a physical cube or the sticker model, never
  from the code's own output.
- Python is the reference. After changing `cube_state.py`, `memo.py` or `visual.py`,
  mirror the change in `web/js/`, run `python3 export_vectors.py`, then both test suites.
- Keep `cube_state.py` free of I/O. Put the CLI, visualizer and trainer loop in
  separate modules.
- New behavior gets a test in `tests.py`, in the class for its workflow step.
- Match the existing style: type hints, short docstrings, class-level constant tables.
- If a memo rule is ambiguous (parity, twist notation, closing letters), ask.
  Don't invent a rule.
