// O separador usado para montar/decompor um caminho é detectado no próprio
// caminho recebido, não a partir de um parâmetro de "platform" simulado:
// assim a mesma lógica funciona tanto para um caminho real do Windows
// (sempre "\\", vindo de PATH/path.join nativos) quanto para um caminho
// construído manualmente por um teste com adaptador de filesystem falso.
export function detectSeparator(filePath) {
  return filePath.includes("\\") ? "\\" : "/";
}

// Encontra o último separador (de qualquer estilo) sem presumir que o
// caminho inteiro usa um único estilo: um caminho pode chegar aqui com um
// prefixo nativo do SO e uma junção final em "/", como o restante desta
// suíte produz ao montar o candidato de PATH.
export function dirnameGeneric(filePath) {
  const match = /^(.*)[\\/][^\\/]*$/.exec(filePath);
  return match ? match[1] : "";
}

export function joinGeneric(sep, ...parts) {
  return parts
    .filter((part) => part !== "" && part !== undefined && part !== null)
    .join(sep);
}

// Acrescenta um nome de arquivo a um diretório já resolvido, usando o
// separador que esse diretório já usa (ou "/" por padrão). Usado onde o
// chamador só tem o diretório base, não uma lista de segmentos — ex.:
// procurar um launcher dentro de cada diretório do PATH.
export function joinPath(dirPath, name) {
  return `${dirPath}${detectSeparator(dirPath)}${name}`;
}

// Resolve uma referência relativa extraída de um shim (com "/" ou "\\",
// independente da plataforma) a partir de um diretório já resolvido,
// tratando "." e ".." sem tocar o filesystem. Devolve null se ".." tentar
// subir acima da raiz do caminho base (unidade do Windows ou "/").
export function resolveRelative(baseDir, relative, sep) {
  const segments = baseDir.split(/[\\/]/);
  for (const part of relative.split(/[\\/]/)) {
    if (part === "" || part === ".") continue;
    if (part === "..") {
      if (segments.length <= 1) return null;
      segments.pop();
      continue;
    }
    segments.push(part);
  }
  return segments.join(sep);
}

// Remove linhas inteiras de comentário (shell/Python "#", batch "REM"/"::")
// antes de procurar uma referência real de vínculo ao pacote/fonte: sem
// isto, um comentário mencionando o caminho certo (sem de fato executá-lo
// ou importá-lo) seria reconhecido como vínculo genuíno. Não interpreta
// shell/Python arbitrário: só descarta linhas cujo conteúdo, ignorando
// espaço à esquerda, começa com um marcador de comentário conhecido.
const COMMENT_LINE_PATTERN = /^[ \t]*(#|::|rem\b)/i;

export function stripCommentLines(text) {
  return text
    .split("\n")
    .map((line) => (COMMENT_LINE_PATTERN.test(line) ? "" : line))
    .join("\n");
}
