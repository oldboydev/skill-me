// Cobertura da timeline (issue #6, crit. 13): o que a leitura NÃO conseguiu
// afirmar, em contagens. Contadores e limites são os da captura (#8) sem
// recálculo; nenhum percentual de cumprimento é produzido.

function parseGap(gap) {
  const at = gap.indexOf(":");
  return { field: gap.slice(0, at), reason: gap.slice(at + 1) };
}

const count = (items, predicate) => items.filter(predicate).length;
const sum = (counts) => Object.values(counts).reduce((total, value) => total + value, 0);

// `partial`: registro malformado ou descartado, lacuna de envelope, evento ou
// operação inconclusivos, operação aberta (ainda que só com fronteira) ou
// órfã. Duplicata, instante regressivo e conteúdo omitido por política são
// contados, mas não tornam a leitura parcial.
export function coverageOf(capture, entries, operations) {
  const eventGaps = entries.filter((entry) => entry.gaps.length > 0).map((entry) => ({ sequence: entry.sequence, gaps: entry.gaps.map(parseGap) }));
  const totals = {
    inconclusiveEntries: count(entries, (entry) => entry.session.strength === "inconclusive"),
    inconclusiveOperations: count(operations, (op) => op.strength === "inconclusive"),
    orphanResult: count(operations, (op) => op.state === "orphan_result"),
    open: count(operations, (op) => op.state === "open"),
    boundaryOnly: count(operations, (op) => op.state === "boundary_only"),
    duplicates: count(entries, (entry) => entry.duplicateOf !== null),
    outOfOrder: count(entries, (entry) => entry.outOfOrder),
  };
  const { counters, limits } = capture;
  const partial =
    counters.malformed > 0 ||
    sum(counters.dropped) > 0 ||
    eventGaps.length > 0 ||
    totals.inconclusiveEntries + totals.inconclusiveOperations + totals.orphanResult + totals.open + totals.boundaryOnly > 0;
  return { capture: { counters: structuredClone(counters), limits: structuredClone(limits) }, eventGaps, totals, partial };
}
