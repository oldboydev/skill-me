"""Fixture sintética da issue #25: sessão Hermes com o plugin real.

Carrega `src/integrations/hermes/plugin/__init__.py` pelo contrato do Hermes
(`register(ctx)`), dispara os hooks recebidos como o Hermes os dispara e sai
logo depois de o plugin entregar o último registro ao processo de entrega —
sem esperar a gravação dele. Antes dos demais hooks, espera o primeiro registro
gravado na execução: o processo de entrega já está em execução, como depois do
`on_session_start` de uma sessão real. Escreve em stdout os contadores do
plugin (`observer_stats`).

Cada espera tem um orçamento abaixo do prazo de 60 s do teste que inicia o
`skill-me` (25 s + 25 s, com 10 s de margem): a sessão sempre termina e informa
o que viu. Se o primeiro registro não for gravado no prazo, os demais hooks não
são disparados, nada é reenviado, e a saída traz `started` e `delivered` falsos
(linha "Diagnóstico do C28 na fixture" do Landing em
`.checks/issue-25-agent-launch.md`).
"""

import importlib.util
import json
import os
import sys
import time

FIRST_PERSISTED_SECONDS = 25
DELIVERED_SECONDS = 25


def persisted():
    root = os.environ["SKILL_ME_LAUNCH_ROOT"]
    invocation = os.environ["SKILL_ME_LAUNCH_ID"]
    captures = os.path.join(root, "skill-me-privacy", "captures")
    total = 0
    for name in os.listdir(captures) if os.path.isdir(captures) else []:
        try:
            with open(os.path.join(captures, name, "state.json"), encoding="utf-8") as handle:
                state = json.load(handle)
        except (OSError, ValueError):
            continue
        if state.get("invocation") == invocation:
            total += state["counters"]["persisted"]
    return total


def wait(predicate, timeout):
    deadline = time.monotonic() + timeout
    while not predicate():
        if time.monotonic() > deadline:
            return False
        time.sleep(0.02)
    return True


def main():
    plugin, hooks_json = sys.argv[1], sys.argv[2]
    with open(hooks_json, encoding="utf-8") as handle:
        hooks = json.load(handle)
    spec = importlib.util.spec_from_file_location("skill_me_observer_launch", plugin)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    callbacks = {}

    class Context:
        def register_hook(self, name, callback):
            callbacks[name] = callback

    module.register(Context())
    first, rest = hooks[0], hooks[1:]
    callbacks[first["hook"]](**first["kwargs"])
    started = wait(lambda: persisted() >= 1, FIRST_PERSISTED_SECONDS)
    delivered = False
    if started:
        for entry in rest:
            callbacks[entry["hook"]](**entry["kwargs"])
        delivered = wait(lambda: module.observer_stats()["delivered"] == len(hooks), DELIVERED_SECONDS)
    print(json.dumps({"started": started, "delivered": delivered, "stats": module.observer_stats()}))
    sys.stdout.flush()


if __name__ == "__main__":
    main()
