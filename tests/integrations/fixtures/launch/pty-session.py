"""Fixture sintética da issue #25: terminal real (pty) no POSIX.

Inicia o comando recebido num pseudoterminal — stdin, stdout e stderr dele são
o terminal — e responde a cada pergunta quando o texto dela aparece na tela.
Grava em JSON o código de saída e tudo o que o terminal mostrou.
"""

import json
import os
import pty
import select
import sys
import time


def main():
    with open(sys.argv[1], encoding="utf-8") as handle:
        config = json.load(handle)
    pid, fd = pty.fork()
    if pid == 0:
        os.execve(config["argv"][0], config["argv"], config["env"])
    screen = b""
    answers = list(config["answers"])
    deadline = time.monotonic() + 120
    status = None
    while time.monotonic() < deadline:
        ready, _, _ = select.select([fd], [], [], 0.05)
        if ready:
            try:
                chunk = os.read(fd, 4096)
            except OSError:
                chunk = b""
            if not chunk:
                break
            screen += chunk
        while answers and answers[0]["after"].encode("utf-8") in screen:
            answer = answers.pop(0)
            os.write(fd, answer["send"].encode("utf-8"))
        if status is None:
            done, code = os.waitpid(pid, os.WNOHANG)
            if done:
                status = code
    if status is None:
        _, status = os.waitpid(pid, 0)
    return {"status": os.waitstatus_to_exitcode(status), "screen": screen.decode("utf-8", "replace"), "pending": len(answers)}


if __name__ == "__main__":
    outcome = main()
    with open(sys.argv[2], "w", encoding="utf-8") as handle:
        json.dump(outcome, handle)
