import { spawnSync } from "node:child_process";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

// `npm run test:integrations`: o mesmo `node --test` com o mesmo glob, mas com
// no máximo 8 arquivos em paralelo. O padrão do Node é um arquivo por núcleo
// lógico menos um (31 numa máquina de 32): os processos das provas saturavam o
// disco no Windows e entregas reais estouravam o prazo de 750 ms
// (`delivery_timeout`, G1 da issue #23 em .checks/issue-23-observacao-on-off.build.md).
// O teto só reduz: com até 9 núcleos lógicos, como nos runners da CI, o
// paralelismo é o padrão do Node. Um `--test-concurrency=8` fixo o aumentaria lá.
export const INTEGRATION_TESTS = "tests/integrations/**/*.test.mjs";
export const MAX_PARALLEL_FILES = 8;

export const testConcurrency = (available = os.availableParallelism()) => Math.max(1, Math.min(available - 1, MAX_PARALLEL_FILES));
export const testArgs = (concurrency = testConcurrency()) => ["--test", `--test-concurrency=${concurrency}`, INTEGRATION_TESTS];

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = spawnSync(process.execPath, testArgs(), { stdio: "inherit" });
  process.exitCode = result.status ?? 1;
}
