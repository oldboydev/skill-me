"""Fixture sintética da issue #25: Ctrl+C real num console do Windows.

Iniciado sem console (processo destacado), cria um console próprio e oculto,
inicia nele o comando recebido (o `skill-me` com o agente de fixture) e, quando
o agente avisa que está pronto, gera CTRL_C_EVENT para todos os processos desse
console — o mesmo evento que a tecla Ctrl+C produz. Só este processo ignora o
evento. Grava em JSON o código de saída do comando e as saídas dele.
"""

import ctypes
import json
import os
import subprocess
import sys
import time

CTRL_C_EVENT = 0


def wait_for(path, timeout):
    deadline = time.monotonic() + timeout
    while not os.path.exists(path):
        if time.monotonic() > deadline:
            return False
        time.sleep(0.02)
    return True


def main():
    with open(sys.argv[1], encoding="utf-8") as handle:
        config = json.load(handle)
    result = {"stage": "start"}
    kernel32 = ctypes.WinDLL("kernel32", use_last_error=True)
    try:
        kernel32.FreeConsole()
        if not kernel32.AllocConsole():
            result["stage"] = "alloc_console_failed"
            return result
        window = kernel32.GetConsoleWindow()
        if window:
            ctypes.WinDLL("user32").ShowWindow(window, 0)
        # O processo destacado nasce com Ctrl+C ignorado, e os filhos herdam a
        # marca: ela é desfeita antes de iniciar o comando.
        kernel32.SetConsoleCtrlHandler(None, False)
        process = subprocess.Popen(config["argv"], env=config["env"], stdin=subprocess.DEVNULL, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        if not wait_for(config["ready"], 60):
            process.kill()
            result["stage"] = "agent_not_ready"
            return result
        kernel32.SetConsoleCtrlHandler(None, True)
        result["generated"] = bool(kernel32.GenerateConsoleCtrlEvent(CTRL_C_EVENT, 0))
        result["seen"] = wait_for(config["seen"], 30)
        open(config["release"], "w").close()
        stdout, stderr = process.communicate(timeout=120)
        result.update(stage="done", status=process.returncode, stdout=stdout.decode("utf-8", "replace"), stderr=stderr.decode("utf-8", "replace"))
    except Exception as error:  # noqa: BLE001 - o motivo vai para a prova
        result["error"] = repr(error)
    return result


if __name__ == "__main__":
    outcome = main()
    with open(sys.argv[2], "w", encoding="utf-8") as handle:
        json.dump(outcome, handle)
