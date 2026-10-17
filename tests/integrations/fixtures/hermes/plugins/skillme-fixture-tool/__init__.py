"""Fixture sintética da issue #4: ferramenta eco registrada pelo contrato público
``ctx.register_tool``. Guarda os argumentos recebidos para provar que chegaram intactos."""

import json

CALLS = []


def _echo(args, **_kwargs):
    CALLS.append(json.loads(json.dumps(args)))
    return json.dumps({"echo": args}, ensure_ascii=False, sort_keys=True)


def register(ctx):
    ctx.register_tool(
        name="skillme_fixture_echo",
        toolset="skillme_fixture",
        schema={
            "name": "skillme_fixture_echo",
            "description": "eco sintético",
            "parameters": {"type": "object", "properties": {"value": {"type": "string"}}},
        },
        handler=_echo,
    )
