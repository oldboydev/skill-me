// Monta traces no formato que `replayCapture` entrega ao consumidor (issue #6):
// `{ capture, records: [{ sequence, record }] }` com registros v1 já sanitizados.
// Os IDs são textos arbitrários (pseudônimos fictícios); nenhuma regra de
// correlação vive aqui — o esperado de cada prova é escrito no próprio teste.

export const CAPTURE_A = "a".repeat(32);
export const CAPTURE_B = "b".repeat(32);

export const SOURCES = Object.freeze({
  claude: { agent: "claude", mechanism: "command_hook", contract: "claude-code-hooks@docs-2026-10-16", signal: "native_hook" },
  codexHooks: { agent: "codex", mechanism: "command_hook", contract: "codex-hooks@rust-v0.162.1", signal: "native_hook" },
  codexExec: { agent: "codex", mechanism: "exec_jsonl", contract: "codex-exec-jsonl@rust-v0.162.1", signal: "supervised_exec" },
  hermes: { agent: "hermes", mechanism: "python_plugin", contract: "hermes-plugin-hooks@0.21.4", signal: "native_plugin" },
});

const BASE_MS = Date.parse("2026-10-19T10:00:00.000Z");
export const at = (seconds) => new Date(BASE_MS + seconds * 1000).toISOString();

const LIMITS = { maxEvents: 500, maxBytes: 8 * 1024 * 1024 };

// Cada item: { src, kind, native, ids, fields, gaps, content, at (segundos desde a base) }.
// Sem `at`, o instante cresce 1 s por posição.
export function buildTrace(items, { captureId = CAPTURE_A, counters = {} } = {}) {
  const records = items.map((item, index) => {
    const { signal, ...source } = SOURCES[item.src];
    return {
      sequence: index + 1,
      record: {
        recordVersion: 1,
        envelope: {
          schemaVersion: 1,
          source,
          signal,
          eventKind: item.kind,
          nativeEvent: item.native ?? "Evento",
          ids: item.ids ?? {},
          fields: item.fields ?? {},
          gaps: item.gaps ?? [],
          observedAt: at(item.at ?? index + 1),
        },
        privacy: [],
        content: item.content ?? null,
      },
    };
  });
  return {
    capture: {
      id: captureId,
      state: "stopped",
      content: false,
      retentionDays: 7,
      createdAt: at(0),
      endedAt: at(1000),
      dataBytes: 0,
      counters: { accepted: items.length, persisted: items.length, malformed: 0, dropped: {}, contentOmitted: {}, ...counters },
      limits: { ...LIMITS },
    },
    records,
  };
}
