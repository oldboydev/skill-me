"""skill-me observer para Hermes (issue #4, recorte U1).

Contrato público usado: ``register(ctx)`` + ``ctx.register_hook`` (hermes_cli/plugins.py,
0.21.4). Cada callback aceita ``**kwargs`` e devolve ``None``: nunca altera argumentos ou
resultados, nunca bloqueia, aprova ou injeta contexto.

``pre_tool_call`` roda sob ``plugins.hook_callback_timeout`` e, nesse hook, tanto timeout
quanto exceção viram bloqueio da ferramenta (plugins_dispatch.py:44-50 e 209-243). Por isso
o callback só faz uma projeção O(1) e um ``put_nowait`` numa fila limitada; quem fala com o
destino é uma thread daemon. Destino travado ou fila cheia viram contagem, nunca espera.

Este arquivo não tem regra de privacidade, limite de tamanho de campo, enum, envelope,
atribuição ou persistência: projeta só os nomes listados em ``kwargs.json`` (o mesmo
arquivo lido pelo adaptador Node) e entrega ao comando ``integrations ingest``, onde a
fronteira compartilhada decide tudo. O destino é o argv JSON de
``SKILL_ME_HERMES_DELIVERY``; sem ela, o ``hermesDelivery`` gravado uma vez por
``integrations observe setup`` em ``~/.skill-me/observe.json`` (issue #23). On/off,
raiz e sessão continuam decididos no ingest. Sem nenhum dos dois, a observação fica
inativa: nenhuma fila, thread ou processo.
"""

import json
import os
import queue
import stat
import subprocess
import threading
from pathlib import Path

_HOOKS = (
    "pre_tool_call",
    "post_tool_call",
    "on_skill_lifecycle",
    "on_session_start",
    "on_session_end",
    "subagent_start",
    "subagent_stop",
)

_lock = threading.Lock()
_stats = {
    "enqueued": 0,
    "delivered": 0,
    "droppedQueueFull": 0,
    "deliveryFailed": 0,
    "oversize": 0,
    "serializationFailed": 0,
}
_state = {
    "names": {},
    "delivery": None,
    "queue": None,
    "maxRecordBytes": 0,
    "worker": None,
    "disabled": False,
}


def observer_stats():
    """Contadores numéricos (sem conteúdo) e se a entrega está configurada."""
    with _lock:
        stats = dict(_stats)
    stats["active"] = _state["delivery"] is not None and not _state["disabled"]
    return stats


def _count(key, amount=1):
    with _lock:
        _stats[key] += amount


def _load_config():
    try:
        with open(Path(__file__).with_name("kwargs.json"), encoding="utf-8") as handle:
            data = json.load(handle)
        hooks = data["hooks"]
        names = {hook: tuple(hooks[hook]) for hook in _HOOKS}
        if not all(all(isinstance(n, str) for n in listed) for listed in names.values()):
            return None
        return names, int(data["queueCapacity"]), int(data["maxRecordBytes"])
    except Exception:
        return None


_CONFIG_DIR = ".skill-me"
_CONFIG_FILE = "observe.json"
_MAX_CONFIG_BYTES = 64 * 1024
# Junção só existe no Windows, o único que exporta a constante: no POSIX, `stat`
# não a define e acessá-la direto deixava o plugin sem destino numa pasta comum
# (achado P1 da revisão formal da issue #23).
_JUNCTION_TAG = getattr(stat, "IO_REPARSE_TAG_MOUNT_POINT", None)


def _argv(value):
    if isinstance(value, list) and value and all(isinstance(item, str) and item for item in value):
        return value
    return None


def _folder_identity(folder):
    # Diretório real, nunca link nem junção: o Python do Hermes (3.11) reporta a
    # junção como diretório, só com a marca de reparse, e `is_symlink()` a aceita.
    info = os.lstat(folder)
    junction = _JUNCTION_TAG is not None and getattr(info, "st_reparse_tag", 0) == _JUNCTION_TAG
    if stat.S_ISLNK(info.st_mode) or junction:
        return None
    if not stat.S_ISDIR(info.st_mode):
        return None
    return (info.st_dev, info.st_ino)


def _configured_delivery():
    # Mesmo home do Node (USERPROFILE no Windows, HOME no POSIX); só o argv é
    # lido. Como no Node, link no lugar do arquivo ou da pasta é recusado, e a
    # pasta é conferida de novo depois da leitura: trocada no meio, o argv lido
    # seria o de outra configuração (linha "Pasta da configuração" do Landing da
    # issue #23).
    try:
        folder = Path.home().joinpath(_CONFIG_DIR)
        identity = _folder_identity(folder)
        path = folder.joinpath(_CONFIG_FILE)
        if identity is None or path.is_symlink():
            return None
        with open(path, "rb") as handle:
            data = handle.read(_MAX_CONFIG_BYTES + 1)
        if _folder_identity(folder) != identity or len(data) > _MAX_CONFIG_BYTES:
            return None
        config = json.loads(data.decode("utf-8"))
        return _argv(config.get("hermesDelivery")) if isinstance(config, dict) else None
    except Exception:
        return None


def _load_delivery():
    raw = os.environ.get("SKILL_ME_HERMES_DELIVERY")
    if not raw:
        return _configured_delivery()
    try:
        return _argv(json.loads(raw))
    except Exception:
        return None


def _is_scalar(value):
    return value is None or isinstance(value, (str, bool, int, float))


def _project(hook, kwargs):
    # Só nomes listados; valor escalar segue inalterado, não escalar só é nomeado.
    picked = {}
    non_scalar = []
    for name in _state["names"].get(hook, ()):
        if name in kwargs:
            value = kwargs[name]
            if _is_scalar(value):
                picked[name] = value
            else:
                non_scalar.append(name)
    return {"hook": hook, "kwargs": picked, "nonScalar": non_scalar}


def _spawn(argv):
    flags = getattr(subprocess, "CREATE_NO_WINDOW", 0)
    return subprocess.Popen(
        argv,
        stdin=subprocess.PIPE,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
        close_fds=True,
        creationflags=flags,
    )


def _disable_and_drain(pending_queue):
    # Sem retry: a entrega deste processo fica desligada e cada registro
    # perdido conta como falha de entrega.
    _state["disabled"] = True
    lost = 1
    while True:
        try:
            pending_queue.get_nowait()
            lost += 1
        except queue.Empty:
            break
    _count("deliveryFailed", lost)


def _worker():
    pending_queue = _state["queue"]
    process = None
    while True:
        record = pending_queue.get()
        try:
            line = (json.dumps(record, ensure_ascii=False, allow_nan=False, separators=(",", ":")) + "\n").encode("utf-8")
        except Exception:
            _count("serializationFailed")
            continue
        if len(line) > _state["maxRecordBytes"]:
            _count("oversize")
            continue
        try:
            if process is None:
                process = _spawn(_state["delivery"])
            process.stdin.write(line)
            process.stdin.flush()
            _count("delivered")
        except Exception:
            _disable_and_drain(pending_queue)
            return


def _ensure_worker():
    with _lock:
        if _state["worker"] is None:
            worker = threading.Thread(target=_worker, name="skill-me-observer-delivery", daemon=True)
            _state["worker"] = worker
            worker.start()


def _make_callback(hook):
    def callback(**kwargs):
        try:
            if _state["delivery"] is None:
                return None
            if _state["disabled"]:
                _count("deliveryFailed")
                return None
            record = _project(hook, kwargs)
            _ensure_worker()
            try:
                _state["queue"].put_nowait(record)
            except queue.Full:
                _count("droppedQueueFull")
                return None
            _count("enqueued")
        except Exception:
            pass
        return None

    callback.__name__ = "skill_me_" + hook
    return callback


def register(ctx):
    config = _load_config()
    if config is not None:
        _state["names"], capacity, _state["maxRecordBytes"] = config
        _state["delivery"] = _load_delivery()
        if _state["delivery"] is not None:
            _state["queue"] = queue.Queue(maxsize=capacity)
    for hook in _HOOKS:
        ctx.register_hook(hook, _make_callback(hook))
