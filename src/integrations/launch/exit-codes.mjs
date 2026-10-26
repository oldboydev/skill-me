// Códigos fechados do launcher → código de saída (issue #25, linha "Códigos de
// saída" do Landing em .checks/issue-25-agent-launch.md), na mesma escala dos
// comandos `observe` e `privacy`: 3 estado ou formato, 4 conflito, 5 E/S.
const EXIT_BY_CODE = Object.freeze({
  setup_declined: 3,
  setup_required: 3,
  not_configured: 3,
  root_not_found: 3,
  root_not_directory: 3,
  store_invalid: 3,
  config_invalid: 3,
  capture_invalid: 3,
  observe_on: 4,
  lock_present: 4,
  link_refused: 4,
  foreign_entry: 4,
  root_changed: 4,
  io_failure: 5,
});

export const exitFor = (code) => EXIT_BY_CODE[code] ?? 5;
export const knownCode = (code) => (Object.hasOwn(EXIT_BY_CODE, code) ? code : "io_failure");
