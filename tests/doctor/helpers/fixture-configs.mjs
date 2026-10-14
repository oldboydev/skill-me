import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

const ONE_MIB = 1024 * 1024;

export const CANARY = "CANARY-SECRET-37f1c9a2";

function put(dir, name, content) {
  mkdirSync(dir, { recursive: true });
  const file = path.join(dir, name);
  writeFileSync(file, content);
  return file;
}

export function writeValidYamlConfig(dir) {
  return put(
    dir,
    "valid-hooks.yaml",
    "hooks:\n  pre_tool_call:\n    command: \"internal-safe-handler\"\n  enabled: true\n",
  );
}

export function writeDisabledYamlConfig(dir) {
  return put(dir, "disabled-hooks.yaml", "hooks:\n  enabled: false\n");
}

export function writeInvalidYamlConfig(dir) {
  return put(
    dir,
    "invalid-hooks.yaml",
    "hooks:\n  enabled: [true\n  pre_tool_call: }broken\n",
  );
}

export function writePolicyBlockedYamlConfig(dir) {
  return put(
    dir,
    "policy-blocked-hooks.yaml",
    "hooks:\n  enabled: true\nmanagedPolicy:\n  scope: organization\n  override: denied\n",
  );
}

// Tags/âncoras que um parser inseguro (ex.: js-yaml FAILSAFE/DEFAULT sem
// schema seguro, ou libs que resolvem `!!python/object`) poderia executar
// ou interpolar. A projeção deve recusar ou tratar como texto opaco.
export function writeUnsafeYamlConfig(dir) {
  return put(
    dir,
    "unsafe-tags.yaml",
    'hooks:\n  enabled: true\n  command: !!js/function "function () { return 1; }"\n  path: "${HOME}/.secrets"\n',
  );
}

export function writeCanaryYamlConfig(dir) {
  return put(
    dir,
    "canary-hooks.yaml",
    `hooks:\n  enabled: true\n  command: "curl -H 'Authorization: ${CANARY}' https://example.invalid"\ncredential: "${CANARY}"\nprompt: "${CANARY}"\n`,
  );
}

export function writeValidTomlConfig(dir) {
  return put(
    dir,
    "valid-hooks.toml",
    '[hooks]\nenabled = true\ncommand = "internal-safe-handler"\n',
  );
}

export function writeInvalidTomlConfig(dir) {
  return put(dir, "invalid-hooks.toml", "[hooks\nenabled = true\n");
}

export function writeOversizedConfig(dir, { extraBytes = 1 } = {}) {
  const size = ONE_MIB + extraBytes;
  const body = Buffer.alloc(size, 0x20);
  const marker = Buffer.from(`enabled = true # ${CANARY}\n`);
  marker.copy(body, 0);
  return put(dir, "oversized.toml", body);
}

export function writeAtLimitConfig(dir) {
  const body = Buffer.alloc(ONE_MIB, 0x20);
  const marker = Buffer.from("enabled = true\n");
  marker.copy(body, 0);
  return put(dir, "at-limit.toml", body);
}

export const ONE_MIB_BYTES = ONE_MIB;
