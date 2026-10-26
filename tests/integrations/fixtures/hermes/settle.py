"""Fixture sintética da issue #25: quando a harness nativa do Hermes para de esperar a entrega.

Usada pela ``harness.py`` (carregada pelo caminho: com ``python -I`` a pasta do
script não entra no ``sys.path``) e por ``hermes-harness.unit.test.mjs``, que a
exercita sem o Hermes instalado. Lê só os contadores de ``observer_stats()`` do
plugin; não toca no plugin, nos callbacks nem no destino. Forma e alternativas
na linha "Espera da harness nativa do Hermes" do Landing em
``.checks/issue-25-agent-launch.md``.
"""

import time

DEFAULT_SETTLE_MAX_MS = 5000
POLL_SECONDS = 0.05


def delivery_state(stats):
    """Estado da entrega pelos contadores: concluded, pending, failed ou inactive.

    Com a entrega ativa, todo registro posto na fila (``enqueued``) sai dela como
    entregue, grande demais (``oversize``) ou não serializável; enquanto algum
    não saiu, a entrega está pendente — mesmo com os contadores parados, como
    durante a abertura do processo de entrega. Desligada, a entrega falhou se
    contou perdas, ou nunca teve destino.
    """
    if not stats["active"]:
        return "failed" if stats["deliveryFailed"] > 0 else "inactive"
    processed = stats["delivered"] + stats["oversize"] + stats["serializationFailed"]
    return "concluded" if processed >= stats["enqueued"] else "pending"


def settle_max_ms(scenario):
    """Prazo máximo da espera: o ``settleMaxMs`` do cenário ou o padrão."""
    return scenario.get("settleMaxMs", DEFAULT_SETTLE_MAX_MS)


def wait_for_delivery(read_stats, max_ms, clock=time.monotonic, sleep=time.sleep):
    """Relê os contadores até a entrega sair de ``pending`` ou o prazo acabar.

    Devolve ``{"state", "waitedMs", "stats"}``; ``state`` é ``timeout`` quando o
    prazo acaba com a entrega ainda pendente (destino travado).
    """
    started = clock()
    deadline = started + max_ms / 1000
    while True:
        stats = read_stats()
        state = delivery_state(stats)
        now = clock()
        if state != "pending":
            return {"state": state, "waitedMs": (now - started) * 1000, "stats": stats}
        if now >= deadline:
            return {"state": "timeout", "waitedMs": (now - started) * 1000, "stats": stats}
        sleep(min(POLL_SECONDS, deadline - now))
