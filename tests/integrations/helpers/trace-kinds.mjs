import path from "node:path";

// Tipo do arquivo de uma operação de disco medida nas provas (issues #8 e #25):
// só o tipo, nunca o caminho. Consumidores: a pré-carga de tempos, nos processos
// filhos (helpers/traces-probe.mjs), e o io medido dos produtores em processo
// (helpers/traces.mjs). Fica fora da pré-carga porque importá-la envolveria o
// node:fs do processo da prova.
const FILE_KINDS = [
  [/^\.lock$/, "lock"],
  // Liberação do lock (issue #25, C46 (u)): a reserva — o prefixo dado ao
  // `mkdtemp` e a pasta criada — e o lock retirado dentro dela, que não é o lock.
  [/^\.lock-release-(?:[A-Za-z0-9]{6})?$/, "lock.reserva"],
  [/^lock$/, "lock.retirado"],
  [/^store\.json$/, "store.json"],
  [/^state\.json$/, "state.json"],
  [/^key$/, "key"],
  [/^events-\d{6}\.ndjson$/, "segmento"],
  [/^events-\d{6}\.ndjson\.[0-9a-f]{8}\.skill-me-tmp$/, "segmento.tmp"],
  [/^state\.json\.[0-9a-f]{8}\.skill-me-tmp$/, "state.json.tmp"],
  // Configuração da observação no home e estado dela no store (#23): o mesmo nome.
  [/^observe\.json$/, "observe.json"],
  [/^observe\.json\.[0-9a-f]{8}\.skill-me-tmp$/, "observe.json.tmp"],
];

export const fileKind = (file) => (typeof file === "string" ? (FILE_KINDS.find(([pattern]) => pattern.test(path.basename(file)))?.[1] ?? "pasta") : "fd");
