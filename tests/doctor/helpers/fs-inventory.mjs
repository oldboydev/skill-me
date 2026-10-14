import { createHash } from "node:crypto";
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

// Inventário determinístico de um diretório: tamanho e mtime detectam a
// maioria das mutações, mas não um conteúdo trocado que mantenha o mesmo
// tamanho (ex.: outro agente reescrevendo um arquivo com o mesmo byte
// count). O SHA256 do conteúdo fecha essa lacuna para a prova de C4/C15
// ("zero mudanças em configuração, skills e perfil dos agentes").
export function inventory(root) {
  const entries = [];
  (function walk(dir) {
    for (const name of readdirSync(dir)) {
      const full = path.join(dir, name);
      const st = statSync(full);
      if (st.isDirectory()) walk(full);
      else {
        const hash = createHash("sha256").update(readFileSync(full)).digest("hex");
        entries.push([path.relative(root, full), st.size, st.mtimeMs, hash]);
      }
    }
  })(root);
  return entries.sort();
}
