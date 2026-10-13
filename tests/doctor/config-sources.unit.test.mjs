// C8 — a ausência de menção a LOCALAPPDATA na documentação pública do Hermes
// não prova a ausência do comportamento. Fonte primária local (lida apenas
// como texto, nunca importada/executada): hermes_constants.py, função
// `_get_platform_default_hermes_home` e `get_hermes_home`: no Windows, o
// default nativo é %LOCALAPPDATA%/hermes, com fallback para
// <HOME>/AppData/Local/hermes quando LOCALAPPDATA está vazio; HERMES_HOME
// continua tendo prioridade sobre os dois e aponta para o home exato, sem
// sufixo adicional. Nenhum caminho é hardcoded a uma máquina específica —
// tudo vem de overrides/env.
import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";
import { hermesHome } from "../../src/doctor/config-sources.mjs";

test("config-sources-C8 hermesHome no Windows usa %LOCALAPPDATA%/hermes quando definido", () => {
  const home = hermesHome({
    env: { LOCALAPPDATA: "C:\\Users\\alguem\\AppData\\Local" },
    platform: "win32",
  });
  assert.equal(home, "C:\\Users\\alguem\\AppData\\Local\\hermes");
});

test("config-sources-C8 hermesHome no Windows cai para <HOME>/AppData/Local/hermes sem LOCALAPPDATA", () => {
  const home = hermesHome({
    env: { USERPROFILE: "C:\\Users\\alguem" },
    platform: "win32",
  });
  assert.equal(home, "C:\\Users\\alguem\\AppData\\Local\\hermes");
});

test("config-sources-C8 HERMES_HOME continua tendo prioridade sobre o default do Windows", () => {
  const home = hermesHome({
    env: { HERMES_HOME: "C:\\custom\\hermes-home", LOCALAPPDATA: "C:\\Users\\alguem\\AppData\\Local" },
    platform: "win32",
  });
  assert.equal(home, "C:\\custom\\hermes-home");
});

test("config-sources-C8 hermesHome fora do Windows continua usando <HOME>/.hermes", () => {
  // path.join é nativo do SO do processo que roda o teste (não é
  // simulável por um parâmetro); compara contra a mesma função, não contra
  // um literal com separador fixo, para não acoplar o teste ao SO do
  // executor — ver nota equivalente nos demais testes deste arquivo.
  const home = hermesHome({ env: { HOME: "/home/alguem" }, platform: "linux" });
  assert.equal(home, path.join("/home/alguem", ".hermes"));
});
