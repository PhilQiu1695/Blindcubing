# Reusable prompts

Copy a block, fill in the `<...>` parts, and paste it into Claude Code. You can also
reference this file directly: "use the *Implement a step* prompt in @prompt.md for step 4".

---

## Implement a workflow step
Implement workflow step <N> (<name>) from @design_doc.text.
- First, restate the plan in a few bullets and list any rule in the doc that is
  ambiguous. Ask me about those before writing code.
- Write the tests first in `tests.py` (class `TestCube3BLDStep<N>`). Include at least
  one test whose expected value comes from a hand-traced or physical cube, not
  from the code's own output.
- Then implement, and run `python3 tests.py` until everything passes.
- Finish with a summary: what changed, what's still open, and anything in the
  design doc that should be updated.

## Debug a wrong result
On scramble `<scramble>`, I expected `<expected memo / sticker>` but got `<actual>`.
Find the root cause before changing anything. Show the cube state step by step
and name the exact line that's wrong. Then fix it and add a regression test.

## Review my work
Review <file / the last change> against @design_doc.text and CLAUDE.md. Look for
bugs, untested edge cases (buffer in place, flipped/twisted pieces, parity), and
places where the code and the doc disagree. Don't edit anything; just report.

## Update the design doc
Update @design_doc.text to match what we decided: <decision>. Keep my structure and
wording style. Only change the sections affected, and show me the diff.

## End-of-session wrap-up
Summarize what we did this session. Update the "Known issues" section of
CLAUDE.md (remove fixed items, add new ones) and mark finished workflow steps
in design_doc.text.
