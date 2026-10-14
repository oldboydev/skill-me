// Processo filho isolado para o teste de FIFO de fs-adapter.posix.test.mjs:
// chama createProductionFsAdapter().open() num PROCESSO SEPARADO para que um
// RED que ainda bloqueia (antes da correção) seja interrompido por
// spawnSync(..., { timeout }) matando o processo, em vez de travar o runner
// de testes inteiro no mesmo processo que o invoca.
import { createProductionFsAdapter } from "../../../src/doctor/fs-adapter.mjs";

const [, , targetPath] = process.argv;
const fs = createProductionFsAdapter();

try {
  const handle = await fs.open(targetPath);
  await handle.close();
  process.stdout.write("OPENED_OK\n");
} catch (error) {
  process.stdout.write(`REJECTED:${error.code}\n`);
}
