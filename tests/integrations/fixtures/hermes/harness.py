"""Fixture sintética da issue #4: harness do dispatch nativo do Hermes 0.21.4.

Executado como ``python -I -B harness.py <cenário.json>`` com HERMES_HOME temporário:
nenhum modelo é chamado. Ferramentas passam pelo ``model_tools.handle_function_call``
real (que dispara pre_tool_call/post_tool_call pelo ``invoke_hook`` do host); os demais
hooks são disparados pelo ``hermes_cli.plugins.invoke_hook`` real com os kwargs dos
locais de disparo. O resultado vai para o arquivo indicado no cenário."""

import importlib.util
import json
import sys
import time
from pathlib import Path

# Quando parar de esperar a entrega (settle.py, ao lado): com ``-I`` a pasta do
# script não está no sys.path, então o módulo é carregado pelo caminho.
_spec = importlib.util.spec_from_file_location("skill_me_harness_settle", Path(__file__).with_name("settle.py"))
settle = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(settle)


def main():
    with open(sys.argv[1], encoding="utf-8") as handle:
        scenario = json.load(handle)

    import model_tools
    from hermes_cli import plugins

    identities = lambda: [id(plugins.invoke_hook), id(model_tools.handle_function_call), id(plugins._dispatch_pre_tool_call_hooks)]
    before = identities()
    manager = plugins.get_plugin_manager()
    manager.discover_and_load()
    loaded = {
        key: {
            "enabled": value.enabled,
            "error": value.error,
            "hooks": sorted(value.hooks_registered),
            "tools": sorted(value.tools_registered),
            "middleware": sorted(value.middleware_registered),
            "commands": sorted(value.commands_registered),
        }
        for key, value in manager._plugins.items()
    }

    ids = scenario.get("ids", {})
    tool_results = []
    tool_ms = []
    for index in range(scenario.get("toolCalls", 0)):
        started = time.monotonic()
        tool_results.append(
            model_tools.handle_function_call(
                "skillme_fixture_echo",
                dict(scenario["toolArgs"]),
                task_id=ids.get("task_id"),
                tool_call_id=f"call-{index}",
                session_id=ids.get("session_id"),
                turn_id=ids.get("turn_id"),
            )
        )
        tool_ms.append((time.monotonic() - started) * 1000)
        if scenario.get("pauseBetweenCallsMs"):
            time.sleep(scenario["pauseBetweenCallsMs"] / 1000)

    direct_pre_ms = []
    for index in range(scenario.get("directPreToolCalls", 0)):
        started = time.monotonic()
        plugins.invoke_hook("pre_tool_call", tool_name="skillme_fixture_echo", args={"value": "x"}, tool_call_id=f"direct-{index}", session_id=ids.get("session_id"))
        direct_pre_ms.append((time.monotonic() - started) * 1000)

    invoke_results = []
    for invoke in scenario.get("invokes", []):
        started = time.monotonic()
        results = plugins.invoke_hook(invoke["hook"], **invoke["kwargs"])
        invoke_results.append({"hook": invoke["hook"], "results": [repr(item) for item in results], "ms": (time.monotonic() - started) * 1000})

    block = plugins.get_pre_tool_call_block_message("skillme_fixture_echo", {"value": "y"}, tool_call_id="block-check", session_id=ids.get("session_id"))

    observer = sys.modules.get("hermes_plugins.skill_me_observer")
    stats = None
    settled = None
    if observer is not None:
        # Espera a entrega concluir, falhar ou o prazo do cenário acabar — não
        # contadores parados: a abertura do processo de entrega pode passar de
        # 300 ms sem mudar nenhum (issue #25, S6).
        outcome = settle.wait_for_delivery(observer.observer_stats, settle.settle_max_ms(scenario))
        stats = outcome["stats"]
        settled = {"state": outcome["state"], "waitedMs": outcome["waitedMs"]}

    fixture_tool = sys.modules.get("hermes_plugins.skillme_fixture_tool")
    result = {
        "loaded": loaded,
        "identitiesUnchanged": before == identities(),
        "toolResults": tool_results,
        "toolCalls": fixture_tool.CALLS if fixture_tool else None,
        "toolMs": tool_ms,
        "directPreMs": direct_pre_ms,
        "invokeResults": invoke_results,
        "blockMessage": block,
        "stats": stats,
        "settle": settled,
        "dontWriteBytecode": sys.flags.dont_write_bytecode,
        "isolated": sys.flags.isolated,
    }
    with open(scenario["resultPath"], "w", encoding="utf-8") as handle:
        json.dump(result, handle, ensure_ascii=False)


main()
