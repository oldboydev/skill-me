// Linhas de um shim de texto que começam um comando, segundo o contexto
// léxico do dialeto — só como texto, sem interpretar nem executar o shell.
// Uma linha que continua a anterior, ou que está dentro de uma string ou de
// um here-document, não começa comando nenhum: o texto dela é dado de outro
// comando (por exemplo, o que um echo/cat imprime). Fluxo de controle
// (goto, exit, if) e valores de variáveis não são avaliados.

// Delimitador de here-document após "<<" ou "<<-": palavra simples ou entre
// aspas. Um "<<" que não forma um delimitador reconhecido deixa o restante do
// arquivo sem nenhum início de comando (leitura conservadora).
const HEREDOC_OPERATOR = /^<<(-?)[ \t]*(?:'([^']+)'|"([^"]+)"|\\?([\w.-]+))/;

function splitLines(text) {
  return text.split("\n").map((line) => line.replace(/\r$/, ""));
}

// cmd.exe não tem string que atravesse linhas; o único contexto que passa
// de uma linha para a seguinte é o "^" no fim da linha (continuação). Toda
// linha depois de um "^" final é tratada como continuação — inclusive
// depois de um REM —, mesmo que um "^^" fosse um circunflexo literal.
function cmdCommandStarts(lines) {
  return lines.map((_, n) => n === 0 || !lines[n - 1].endsWith("^"));
}

// sh: aspas simples (sem escape) e duplas (com "\") podem atravessar linhas;
// "\" no fim da linha, fora de aspas, continua o comando; um here-document
// ocupa as linhas seguintes até a linha do delimitador; "#" no início de uma
// palavra começa um comentário até o fim da linha.
function shCommandStarts(lines) {
  const starts = [];
  const heredocs = [];
  let quote = null;
  let continued = false;
  let lost = false;
  for (const line of lines) {
    if (heredocs.length > 0) {
      starts.push(false);
      const { delimiter, stripTabs } = heredocs[0];
      if ((stripTabs ? line.replace(/^\t+/, "") : line) === delimiter) heredocs.shift();
      continue;
    }
    starts.push(!lost && quote === null && !continued);
    continued = false;
    for (let i = 0; i < line.length && !lost; i += 1) {
      const ch = line[i];
      if (quote === "'") {
        if (ch === "'") quote = null;
      } else if (ch === "\\") {
        if (quote === null && i === line.length - 1) continued = true;
        i += 1;
      } else if (quote === '"') {
        if (ch === '"') quote = null;
      } else if (ch === "'" || ch === '"') {
        quote = ch;
      } else if (ch === "#" && (i === 0 || /[\s;&|()]/.test(line[i - 1]))) {
        break;
      } else if (line.startsWith("<<<", i)) {
        i += 2;
      } else if (line.startsWith("<<", i)) {
        const operator = HEREDOC_OPERATOR.exec(line.slice(i));
        if (operator === null) {
          lost = true;
        } else {
          heredocs.push({
            delimiter: operator[2] ?? operator[3] ?? operator[4],
            stripTabs: operator[1] === "-",
          });
          i += operator[0].length - 1;
        }
      }
    }
  }
  return starts;
}

// Linhas (sem o "\r" final) que começam um comando no dialeto informado.
export function commandStartLines(text, dialect) {
  const lines = splitLines(text);
  const starts = dialect === "cmd" ? cmdCommandStarts(lines) : shCommandStarts(lines);
  return lines.filter((_, n) => starts[n]);
}
