// Normaliza qualquer adaptador de filesystem para a forma "abrível"
// (open/read/stat/close) usada por leituras limitadas de verdade (ver
// snapshot-read.mjs, version-sources/pe.mjs). Um adaptador plano (só
// stat/readFile, como o adaptador em memória usado pelos testes) ainda
// funciona, materializando o conteúdo uma vez e servindo-o por posição —
// sem esse ganho de memória, mas com o mesmo contrato de leitura.
export function toOpenableFsAdapter(fs) {
  if (typeof fs.open === "function") return fs;
  return {
    async open(filePath) {
      const [content, stats] = await Promise.all([fs.readFile(filePath), fs.stat(filePath)]);
      return {
        async read(buffer, offset, length, position) {
          const bytesRead = Math.max(0, Math.min(length, content.length - position));
          if (bytesRead > 0) content.copy(buffer, offset, position, position + bytesRead);
          return { bytesRead };
        },
        async stat() {
          return stats;
        },
        async close() {},
      };
    },
  };
}
