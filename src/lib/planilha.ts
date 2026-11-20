/**
 * Planilhas CSV (o Excel abre e salva nesse formato). Não depende do Prisma.
 * - Ler: aceita ";" (Excel em português), "," ou tabulação, aspas e quebras de linha dentro de aspas.
 * - Gerar: ";" e marca UTF-8 no início, para o Excel mostrar os acentos certos.
 */

/** Descobre o separador pela linha do cabeçalho (fora de aspas). */
function separadorDe(texto: string): string {
  const primeira = texto.split(/\r?\n/, 1)[0] ?? "";
  const conta = (c: string) => primeira.split(c).length - 1;
  const opcoes = [";", ",", "\t"].map((c) => ({ c, n: conta(c) }));
  opcoes.sort((a, b) => b.n - a.n);
  return opcoes[0].n > 0 ? opcoes[0].c : ";";
}

/** Lê o texto do CSV em linhas e células. Linhas totalmente vazias são descartadas. */
export function lerCsv(texto: string): string[][] {
  const t = texto.replace(/^﻿/, "");
  const sep = separadorDe(t);
  const linhas: string[][] = [];
  let linha: string[] = [];
  let celula = "";
  let aspas = false;

  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (aspas) {
      if (c === '"') {
        if (t[i + 1] === '"') {
          celula += '"';
          i++;
        } else aspas = false;
      } else celula += c;
    } else if (c === '"' && celula === "") {
      aspas = true;
    } else if (c === sep) {
      linha.push(celula);
      celula = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && t[i + 1] === "\n") i++;
      linha.push(celula);
      linhas.push(linha);
      linha = [];
      celula = "";
    } else celula += c;
  }
  linha.push(celula);
  linhas.push(linha);
  return linhas.filter((l) => l.some((x) => x.trim() !== ""));
}

/**
 * Célula segura para o Excel: texto começando com = + - @ seria lido como fórmula
 * (e poderia executar algo ao abrir), então ganha um apóstrofo na frente.
 */
function celulaSegura(valor: string | number | null | undefined): string {
  let s = valor === null || valor === undefined ? "" : String(valor);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** Gera o CSV (com a marca UTF-8 no início). */
export function gerarCsv(linhas: Array<Array<string | number | null | undefined>>): string {
  return "﻿" + linhas.map((l) => l.map(celulaSegura).join(";")).join("\r\n") + "\r\n";
}

/** Nome de coluna comparável: sem acento, minúsculo, só letras e números. */
export function chaveColuna(nome: string): string {
  return nome
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}
