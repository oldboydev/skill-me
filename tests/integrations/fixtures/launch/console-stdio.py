"""Fixture sintética da issue #25: console real do Windows em um lado do stdio.

Iniciado sem console (processo destacado), cria um console próprio e oculto e
inicia nele o comando recebido com o stdin e o stderr escolhidos: o próprio
console (`"console"`) ou fora dele (`stdin: "null"`, `stderr: "file"`). Antes,
digita `pretype` no buffer de entrada do console, como teclas. No fim, grava em
JSON o código de saída, o texto que ficou na tela do console e o stderr gravado
em arquivo, quando houver.
"""

import ctypes
import json
import msvcrt
import subprocess
import sys
from ctypes import wintypes

GENERIC_READ = 0x80000000
GENERIC_WRITE = 0x40000000
FILE_SHARE_READ_WRITE = 0x3
OPEN_EXISTING = 3
KEY_EVENT = 0x0001
INVALID_HANDLE = ctypes.c_void_p(-1).value

kernel32 = ctypes.WinDLL("kernel32", use_last_error=True)
kernel32.CreateFileW.restype = wintypes.HANDLE
kernel32.CreateFileW.argtypes = [wintypes.LPCWSTR, wintypes.DWORD, wintypes.DWORD, ctypes.c_void_p, wintypes.DWORD, wintypes.DWORD, wintypes.HANDLE]


class KEY_EVENT_RECORD(ctypes.Structure):
    _fields_ = [
        ("bKeyDown", wintypes.BOOL),
        ("wRepeatCount", wintypes.WORD),
        ("wVirtualKeyCode", wintypes.WORD),
        ("wVirtualScanCode", wintypes.WORD),
        ("uChar", wintypes.WCHAR),
        ("dwControlKeyState", wintypes.DWORD),
    ]


class INPUT_RECORD(ctypes.Structure):
    _fields_ = [("EventType", wintypes.WORD), ("Event", KEY_EVENT_RECORD)]


class COORD(ctypes.Structure):
    _fields_ = [("X", wintypes.SHORT), ("Y", wintypes.SHORT)]


class SMALL_RECT(ctypes.Structure):
    _fields_ = [("Left", wintypes.SHORT), ("Top", wintypes.SHORT), ("Right", wintypes.SHORT), ("Bottom", wintypes.SHORT)]


class SCREEN_INFO(ctypes.Structure):
    _fields_ = [("dwSize", COORD), ("dwCursorPosition", COORD), ("wAttributes", wintypes.WORD), ("srWindow", SMALL_RECT), ("dwMaximumWindowSize", COORD)]


def console_handle(name):
    handle = kernel32.CreateFileW(name, GENERIC_READ | GENERIC_WRITE, FILE_SHARE_READ_WRITE, None, OPEN_EXISTING, 0, None)
    if handle == INVALID_HANDLE:
        raise OSError(ctypes.get_last_error(), name)
    return handle


def type_keys(text):
    handle = console_handle("CONIN$")
    records = []
    for char in text:
        for down in (True, False):
            event = KEY_EVENT_RECORD(down, 1, 0x0D if char == "\r" else 0, 0, char, 0)
            records.append(INPUT_RECORD(KEY_EVENT, event))
    array = (INPUT_RECORD * len(records))(*records)
    written = wintypes.DWORD()
    if not kernel32.WriteConsoleInputW(handle, array, len(records), ctypes.byref(written)):
        raise OSError(ctypes.get_last_error(), "WriteConsoleInputW")
    kernel32.CloseHandle(handle)


def screen_text():
    handle = console_handle("CONOUT$")
    info = SCREEN_INFO()
    kernel32.GetConsoleScreenBufferInfo(handle, ctypes.byref(info))
    width, height = info.dwSize.X, info.dwCursorPosition.Y + 1
    buffer = ctypes.create_unicode_buffer(width * height)
    read = wintypes.DWORD()
    kernel32.ReadConsoleOutputCharacterW(handle, buffer, width * height, COORD(0, 0), ctypes.byref(read))
    kernel32.CloseHandle(handle)
    text = buffer[: read.value]
    return "\n".join(text[row * width : (row + 1) * width].rstrip() for row in range(height)).strip("\n")


def main():
    with open(sys.argv[1], encoding="utf-8") as handle:
        config = json.load(handle)
    kernel32.FreeConsole()
    if not kernel32.AllocConsole():
        return {"stage": "alloc_console_failed"}
    window = kernel32.GetConsoleWindow()
    if window:
        ctypes.WinDLL("user32").ShowWindow(window, 0)
    # Linhas largas o bastante para nenhuma mensagem quebrar na tela lida de volta.
    output = console_handle("CONOUT$")
    if not kernel32.SetConsoleScreenBufferSize(output, COORD(1024, 300)):
        raise OSError(ctypes.get_last_error(), "SetConsoleScreenBufferSize")
    kernel32.CloseHandle(output)
    if config.get("pretype"):
        type_keys(config["pretype"])
    stdin = msvcrt.open_osfhandle(console_handle("CONIN$"), 0) if config["stdin"] == "console" else subprocess.DEVNULL
    stderr = msvcrt.open_osfhandle(console_handle("CONOUT$"), 0) if config["stderr"] == "console" else open(config["stderrFile"], "wb")
    with open(config["stdoutFile"], "wb") as stdout:
        process = subprocess.Popen(config["argv"], env=config["env"], stdin=stdin, stdout=stdout, stderr=stderr)
        try:
            status = process.wait(timeout=config.get("timeoutSec", 120))
        except subprocess.TimeoutExpired:
            process.kill()
            process.wait()
            return {"stage": "timeout", "screen": screen_text()}
    return {"stage": "done", "status": status, "screen": screen_text()}


if __name__ == "__main__":
    try:
        outcome = main()
    except Exception as error:  # noqa: BLE001 - o motivo vai para a prova
        outcome = {"stage": "error", "error": repr(error)}
    with open(sys.argv[2], "w", encoding="utf-8") as handle:
        json.dump(outcome, handle)
