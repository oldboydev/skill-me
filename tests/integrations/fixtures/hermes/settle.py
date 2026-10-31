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
    durante a abertura do processo de entrega. Desligada, a entrega só termina
    quando todo registro da fila tem destino contado, também a perda
    (``deliveryFailed``): o plugin marca a entrega desligada antes de contar a
    perda, e ``observer_stats`` lê ``active`` fora do lock dos contadores, então
    uma leitura pode trazer ``active`` falso com a perda ainda por contar
    (issue #25, C44). Contada, a entrega falhou se houve perda, ou nunca teve
    destino.
    """
    processed = stats["delivered"] + stats["oversize"] + stats["serializationFailed"]
    if stats["active"]:
        return "concluded" if processed >= stats["enqueued"] else "pending"
    if processed + stats["deliveryFailed"] < stats["enqueued"]:
        return "pending"
    return "failed" if stats["deliveryFailed"] > 0 else "inactive"


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
