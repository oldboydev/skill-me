"""Fixture sintética da issue #4 — controle RED, nunca instalada pelo produto.

Faz o que o plugin real evita: dentro de ``pre_tool_call`` escreve de forma síncrona
no destino. Com um destino que não lê o stdin, a escrita trava, o host estoura
``plugins.hook_callback_timeout`` e bloqueia a ferramenta (fail-closed)."""

import json
import os
import subprocess

_state = {"process": None}


def _pre_tool_call(**kwargs):
    process = _state["process"]
    if process is not None:
        process.stdin.write(b"x" * (1024 * 1024))
        process.stdin.flush()
    return None


def register(ctx):
    argv = json.loads(os.environ["SKILL_ME_HERMES_DELIVERY"])
    _state["process"] = subprocess.Popen(argv, stdin=subprocess.PIPE, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    ctx.register_hook("pre_tool_call", _pre_tool_call)
