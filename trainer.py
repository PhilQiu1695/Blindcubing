import random

from cube_state import Cube3BLD
from memo import check_memo, parse_memo, trace_memo
from visual import render_net


FACES = 'UDLRFB'
AXIS = {'U': 'UD', 'D': 'UD', 'L': 'LR', 'R': 'LR', 'F': 'FB', 'B': 'FB'}
MODIFIERS = ['', "'", '2']

HELP = """Commands at any prompt: /net shows the cube net, /skip reveals the answer
(not scored), /quit ends the session. Case, brackets and spaces in memos are ignored."""


def generate_scramble(rng=None, length: int = 18) -> str:
    """
    Random-move scramble of `length` moves in the WCA hold. No face is turned twice in a row,
    and no three moves in a row share an axis (e.g. R L R).
    """
    rng = rng or random.Random()
    moves = []
    for _ in range(length):
        while True:
            face = rng.choice(FACES)
            if moves and face == moves[-1][0]:
                continue
            if len(moves) >= 2 and AXIS[face] == AXIS[moves[-1][0]] == AXIS[moves[-2][0]]:
                continue
            break
        moves.append(face + rng.choice(MODIFIERS))
    return ' '.join(moves)


class _Quit(Exception):
    pass


class Trainer:
    """Interactive practice loop. input_fn/output_fn are swappable for testing."""

    def __init__(self, input_fn=input, output_fn=print, rng=None):
        self.input = input_fn
        self.output = output_fn
        self.rng = rng or random.Random()
        self.correct = 0
        self.attempts = 0

    def ask(self, prompt: str) -> str:
        try:
            return self.input(prompt).strip()
        except EOFError:
            raise _Quit
        except KeyboardInterrupt:
            raise _Quit

    def show_answer(self, cube: Cube3BLD):
        edges, corners = trace_memo(cube)
        self.output(f"  Reference memo  edges: {edges or '(solved)'}")
        self.output(f"                corners: {corners or '(solved)'}")

    def ask_memo(self, label: str, kind: str, cube: Cube3BLD):
        """Prompt until a memo with valid letters is entered. Returns None if skipped."""
        while True:
            text = self.ask(f"{label} memo: ")
            command = text.lower()
            if command == '/quit':
                raise _Quit
            if command == '/skip':
                return None
            if command == '/net':
                self.output(render_net(cube, 'colour'))
                continue
            try:
                parse_memo(text, kind)
                return text
            except ValueError as err:
                self.output(f"  {err}. Try again.")

    def practise(self, scramble: str, show_net: bool = False):
        """One attempt: show the scramble, take both memos, check and report."""
        cube = Cube3BLD()
        cube.scramble_wca(scramble)
        self.output("")
        self.output(f"Scramble (white top, green front): {scramble}")
        if show_net:
            self.output("Check your scramble (held green top, red front;"
                        " G=green R=red W=white O=orange Y=yellow B=blue):")
            self.output(render_net(cube, 'colour'))
        self.output("Memo holding green top, red front.")

        edges = self.ask_memo("Edge", 'edge', cube)
        corners = None if edges is None else self.ask_memo("Corner", 'corner', cube)
        if edges is None or corners is None:
            self.output("Skipped (not scored).")
            self.show_answer(cube)
            return

        result = check_memo(cube, edges, corners)
        self.attempts += 1
        if result.correct:
            self.correct += 1
            self.output("Success!" + (" (parity)" if result.has_parity else ""))
        else:
            self.output("Fail.")
            for message in result.messages:
                self.output(f"  {message}")
        self.show_answer(cube)
        self.output(f"Score: {self.correct}/{self.attempts}")

        if self.ask("Show cube net? (y/N): ").lower() in ('y', 'yes'):
            self.output(render_net(cube, 'colour'))
            self.output("")
            self.output(render_net(cube, 'letter'))

    def run(self):
        self.output("3BLD memo trainer (JB letter scheme)")
        self.output(HELP)
        try:
            while True:
                self.output("")
                choice = self.ask("[1] random scramble  [2] enter a scramble  [q] quit: ").lower()
                if choice in ('q', '/quit'):
                    break
                if choice == '1':
                    self.practise(generate_scramble(self.rng), show_net=True)
                elif choice == '2':
                    scramble = self.ask("Scramble (WCA hold): ")
                    try:
                        Cube3BLD().scramble_wca(scramble)
                    except ValueError as err:
                        self.output(f"  {err}")
                        continue
                    self.practise(scramble)
                else:
                    self.output("  Choose 1, 2 or q.")
        except _Quit:
            pass
        self.output("")
        self.output(f"Session over. Score: {self.correct}/{self.attempts}")


if __name__ == '__main__':
    Trainer().run()
