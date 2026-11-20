"use server";

import { exigirAdminSessao } from "@/lib/sessao";
import { conferirImportacao, importarCadastros, type Conferencia, type ResumoImportacao } from "@/servicos/cadastros-planilha";
import { atualizarTelas, mensagemDeErro } from "./utils";

const LIMITE = 4 * 1024 * 1024; // 4 MB de texto

/** Lê a planilha e mostra o que vai acontecer (nada é gravado). */
export async function conferirImportacaoAction(texto: string): Promise<Conferencia> {
  const ator = await exigirAdminSessao();
  if (typeof texto !== "string" || !texto.trim()) return { ok: false, erro: "O arquivo está vazio." };
  if (texto.length > LIMITE) return { ok: false, erro: "Arquivo grande demais (máximo 4 MB). Divida a planilha em partes." };
  try {
    return await conferirImportacao(ator, texto);
  } catch (erro) {
    return { ok: false, erro: mensagemDeErro(erro) };
  }
}

/** Grava os cadastros novos da planilha. */
export async function importarCadastrosAction(texto: string): Promise<{ ok: true; resumo: ResumoImportacao } | { ok: false; erro: string }> {
  const ator = await exigirAdminSessao();
  if (typeof texto !== "string" || !texto.trim()) return { ok: false, erro: "O arquivo está vazio." };
  if (texto.length > LIMITE) return { ok: false, erro: "Arquivo grande demais (máximo 4 MB). Divida a planilha em partes." };
  try {
    const resumo = await importarCadastros(ator, texto);
    atualizarTelas();
    return { ok: true, resumo };
  } catch (erro) {
    return { ok: false, erro: mensagemDeErro(erro) };
  }
}
