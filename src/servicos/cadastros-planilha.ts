import { db } from "@/lib/db";
import { ErroDeNegocio } from "@/lib/erros";
import { exigirAdmin, type Ator } from "@/lib/permissoes";
import {
  CAMPOS,
  NOME_EXEMPLO,
  TITULO,
  chaveCliente,
  filtroParaPlanilha,
  lerCadastros,
  type ClienteLido,
  type VeiculoLido,
} from "@/lib/cadastros-planilha";
import { formatarCpf } from "@/lib/cpf";
import { dataBR, telefoneBR } from "@/lib/formatar";
import { gerarCsv } from "@/lib/planilha";
import { formatarPlaca } from "@/lib/placa";
import { buscarRecomendacao } from "./base-oleo";
import { ligarContaExistente } from "./clientes";
import { exigirForaDaDemonstracao } from "./demonstracao-guarda";

const virgula = (n: number | null | undefined) => (n === null || n === undefined ? "" : String(n).replace(".", ","));
const tel = (t: string | null) => (t ? telefoneBR(t) : "");

/** Colunas só de consulta na exportação (a importação ignora). */
const EXTRAS = ["Último óleo", "Data da última troca", "Próxima troca (km)", "Próxima troca (data)"];

// ---------------------------------------------------------------------------------------------
// Exportar
// ---------------------------------------------------------------------------------------------

/** Todos os clientes e veículos da oficina numa planilha (uma linha por veículo). */
export async function exportarCadastros(ator: Ator): Promise<string> {
  const empresaId = exigirAdmin(ator);
  const clientes = await db.cliente.findMany({
    where: { empresaId },
    orderBy: [{ nome: "asc" }, { id: "asc" }],
    include: {
      veiculos: {
        orderBy: { placa: "asc" },
        include: {
          ordens: {
            where: { status: { not: "CANCELADO" }, trocaOleo: { isNot: null } },
            orderBy: [{ dataEntrada: "desc" }, { numero: "desc" }],
            take: 1,
            include: { trocaOleo: true },
          },
        },
      },
    },
  });

  const linhas: Array<Array<string | number | null>> = [[...CAMPOS.map((c) => TITULO[c]), ...EXTRAS]];
  for (const c of clientes) {
    const dono = [c.nome, c.cpf ? formatarCpf(c.cpf) : "", tel(c.telefone), c.email ?? "", c.endereco ?? ""];
    if (c.veiculos.length === 0) {
      linhas.push(dono);
      continue;
    }
    for (const v of c.veiculos) {
      const ultima = v.ordens[0];
      const troca = ultima?.trocaOleo;
      linhas.push([
        ...dono,
        formatarPlaca(v.placa),
        v.marca,
        v.modelo,
        v.motor,
        v.ano,
        v.cor,
        v.kmAtual,
        virgula(v.capacidadeOleoL),
        filtroParaPlanilha(v.filtroOleo),
        filtroParaPlanilha(v.filtroCombustivel),
        filtroParaPlanilha(v.filtroAr),
        filtroParaPlanilha(v.filtroArCabine),
        troca ? `${troca.oleoMarca} ${troca.oleoViscosidade}`.trim() : "",
        ultima ? dataBR(ultima.dataEntrada) : "",
        troca?.proximaTrocaKm ?? "",
        troca?.proximaTrocaData ? dataBR(troca.proximaTrocaData) : "",
      ]);
    }
  }
  return gerarCsv(linhas);
}

/** Planilha modelo: o cabeçalho e uma linha de exemplo (que a importação recusa). */
export function modeloCsv(): string {
  const exemplo: Record<(typeof CAMPOS)[number], string> = {
    nome: NOME_EXEMPLO,
    cpf: "529.982.247-25",
    telefone: "(11) 91234-5678",
    email: "cliente@exemplo.com",
    endereco: "Rua Exemplo, 100",
    placa: "ABC1D23",
    marca: "Fiat",
    modelo: "Argo",
    motor: "1.0 Firefly",
    ano: "2022",
    cor: "Prata",
    km: "35000",
    quantidadeOleo: "3,2",
    filtroOleo: "PSL 55",
    filtroCombustivel: "GI 04/7",
    filtroAr: "ARL 8840",
    filtroArCabine: "Não tem",
  };
  return gerarCsv([CAMPOS.map((c) => TITULO[c]), CAMPOS.map((c) => exemplo[c])]);
}

// ---------------------------------------------------------------------------------------------
// Importar
// ---------------------------------------------------------------------------------------------

export type SituacaoLinha = "NOVO" | "JA_EXISTE" | "ERRO";

export interface LinhaPlano {
  numero: number;
  nome: string;
  placa: string | null;
  situacao: SituacaoLinha;
  detalhes: string[];
}

export interface ResumoImportacao {
  linhas: number;
  clientesNovos: number;
  clientesExistentes: number;
  veiculosNovos: number;
  veiculosJaCadastrados: number;
  linhasComErro: number;
}

export type Conferencia =
  | { ok: true; resumo: ResumoImportacao; linhas: LinhaPlano[]; colunasIgnoradas: string[] }
  | { ok: false; erro: string };

interface NovoCliente {
  dados: ClienteLido;
  id?: string;
}
interface VeiculoAGravar {
  dados: VeiculoLido;
  clienteExistenteId?: string;
  novo?: NovoCliente;
}

/**
 * Lê a planilha e decide o que acontece com cada linha, sem gravar:
 * - cliente que já existe na oficina (mesmo CPF; sem CPF, mesmo nome e telefone) não é duplicado nem alterado;
 * - placa já cadastrada na oficina: o veículo é ignorado;
 * - linha com erro não entra (as outras entram).
 */
async function planejar(empresaId: string, texto: string) {
  const lidos = lerCadastros(texto);
  if (!lidos.ok) return { conferencia: { ok: false as const, erro: lidos.erro }, novos: [], veiculos: [] };

  const existentes = await db.cliente.findMany({ where: { empresaId }, select: { id: true, nome: true, cpf: true, telefone: true } });
  const existentePorCpf = new Map<string, string>();
  const existentePorNomeTel = new Map<string, { id: string; cpf: string | null }>();
  for (const c of existentes) {
    if (c.cpf) existentePorCpf.set(chaveCliente(c), c.id);
    existentePorNomeTel.set(chaveCliente({ ...c, cpf: null }), { id: c.id, cpf: c.cpf });
  }
  // Nome + telefone só juntam quando um dos dois lados não tem CPF (CPFs diferentes = pessoas diferentes).
  const semConflito = (a: string | null, b: string | null) => !a || !b || a === b;

  const placas = lidos.linhas.flatMap((l) => (l.veiculo && !l.erros.length ? [l.veiculo.placa] : []));
  const placasNoBanco = new Set(
    (await db.veiculo.findMany({ where: { empresaId, placa: { in: placas } }, select: { placa: true } })).map((v) => v.placa),
  );

  const novoPorCpf = new Map<string, NovoCliente>();
  const novoPorNomeTel = new Map<string, NovoCliente>();
  const novos: NovoCliente[] = [];
  const veiculos: VeiculoAGravar[] = [];
  const placaNaLinha = new Map<string, number>();
  const clientesExistentesUsados = new Set<string>();
  const linhas: LinhaPlano[] = [];
  let veiculosJaCadastrados = 0;

  for (const l of lidos.linhas) {
    const base = { numero: l.numero, nome: l.cliente.nome, placa: l.veiculo ? formatarPlaca(l.veiculo.placa) : null };
    const erros = [...l.erros];
    if (l.veiculo && !erros.length && placaNaLinha.has(l.veiculo.placa)) {
      erros.push(`Placa repetida na planilha (já está na linha ${placaNaLinha.get(l.veiculo.placa)}).`);
    }
    if (erros.length) {
      linhas.push({ ...base, situacao: "ERRO", detalhes: erros });
      continue;
    }

    const chaveCpf = l.cliente.cpf ? chaveCliente(l.cliente) : null;
    const chaveNomeTel = chaveCliente({ ...l.cliente, cpf: null });
    const porNomeTel = existentePorNomeTel.get(chaveNomeTel);
    const existenteId =
      (chaveCpf && existentePorCpf.get(chaveCpf)) || (porNomeTel && semConflito(porNomeTel.cpf, l.cliente.cpf) ? porNomeTel.id : undefined);
    const detalhes: string[] = [];
    let novo: NovoCliente | undefined;

    if (existenteId) {
      clientesExistentesUsados.add(existenteId);
      detalhes.push("Cliente já cadastrado: os dados dele não mudam.");
    } else {
      const novoNomeTel = novoPorNomeTel.get(chaveNomeTel);
      novo = (chaveCpf && novoPorCpf.get(chaveCpf)) || (novoNomeTel && semConflito(novoNomeTel.dados.cpf, l.cliente.cpf) ? novoNomeTel : undefined);
      if (novo) detalhes.push("Mesmo cliente de uma linha anterior.");
      else {
        novo = { dados: l.cliente };
        novos.push(novo);
        detalhes.push("Cliente novo.");
      }
      if (chaveCpf) novoPorCpf.set(chaveCpf, novo);
      if (!novoPorNomeTel.has(chaveNomeTel)) novoPorNomeTel.set(chaveNomeTel, novo);
    }

    let veiculoNovo = false;
    if (l.veiculo) {
      placaNaLinha.set(l.veiculo.placa, l.numero);
      if (placasNoBanco.has(l.veiculo.placa)) {
        veiculosJaCadastrados++;
        detalhes.push("Placa já cadastrada: o veículo fica como está.");
      } else {
        veiculos.push({ dados: l.veiculo, clienteExistenteId: existenteId, novo });
        veiculoNovo = true;
        detalhes.push("Veículo novo.");
      }
    }

    linhas.push({ ...base, situacao: existenteId && !veiculoNovo ? "JA_EXISTE" : "NOVO", detalhes });
  }

  const resumo: ResumoImportacao = {
    linhas: lidos.linhas.length,
    clientesNovos: novos.length,
    clientesExistentes: clientesExistentesUsados.size,
    veiculosNovos: veiculos.length,
    veiculosJaCadastrados,
    linhasComErro: linhas.filter((x) => x.situacao === "ERRO").length,
  };
  return { conferencia: { ok: true as const, resumo, linhas, colunasIgnoradas: lidos.colunasIgnoradas }, novos, veiculos };
}

/** Mostra o que a importação faria (nada é gravado). */
export async function conferirImportacao(ator: Ator, texto: string): Promise<Conferencia> {
  const empresaId = exigirAdmin(ator);
  return (await planejar(empresaId, texto)).conferencia;
}

/**
 * Grava os clientes e veículos novos da planilha. Lê e confere tudo de novo no servidor
 * (não confia na conferência mostrada antes). Tudo ou nada: se algo falhar, nada fica gravado.
 */
export async function importarCadastros(ator: Ator, texto: string): Promise<ResumoImportacao> {
  const empresaId = exigirAdmin(ator);
  await exigirForaDaDemonstracao(empresaId);
  const { conferencia, novos, veiculos } = await planejar(empresaId, texto);
  if (!conferencia.ok) throw new ErroDeNegocio(conferencia.erro);
  if (novos.length === 0 && veiculos.length === 0) throw new ErroDeNegocio("Não há nada novo para importar nesta planilha.");

  // A recomendação de óleo de cada carro sai da base (fora da transação, que fica mais curta).
  const recomendacoes: Array<{ id: string } | null> = [];
  for (let i = 0; i < veiculos.length; i += 20) {
    recomendacoes.push(...(await Promise.all(veiculos.slice(i, i + 20).map((v) => buscarRecomendacao(v.dados)))));
  }

  await db.$transaction(
    async (tx) => {
      for (const n of novos) {
        const criado = await tx.cliente.create({ data: { empresaId, ...n.dados } });
        n.id = criado.id;
        await ligarContaExistente(tx, criado);
      }
      for (const [i, v] of veiculos.entries()) {
        const clienteId = v.clienteExistenteId ?? v.novo?.id;
        if (!clienteId) throw new Error("Veículo sem cliente na importação.");
        await tx.veiculo.create({ data: { empresaId, clienteId, ...v.dados, recomendacaoOleoId: recomendacoes[i]?.id ?? null } });
      }
    },
    { timeout: 120_000, maxWait: 10_000 },
  );
  return conferencia.resumo;
}
