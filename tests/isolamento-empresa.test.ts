import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Ator } from "@/lib/permissoes";

/**
 * Isolamento entre empresas: um administrador nunca vê clientes, veículos ou OS de outra
 * empresa, nem sabendo o id ou a placa. O banco é falso e APLICA o "where" de verdade:
 * se um serviço esquecer o filtro por empresa, este teste quebra.
 */
type Linha = Record<string, any>;

function combina(linha: Linha, where: Linha | undefined): boolean {
  if (!where) return true;
  return Object.entries(where).every(([campo, condicao]) => {
    if (campo === "OR") return (condicao as Linha[]).some((w) => combina(linha, w));
    if (campo === "NOT") return !combina(linha, condicao as Linha);
    if (campo === "empresaId_placa") return linha.empresaId === condicao.empresaId && linha.placa === condicao.placa;
    const valor = linha[campo];
    if (condicao !== null && typeof condicao === "object" && !(condicao instanceof Date)) {
      if ("in" in condicao) return (condicao.in as unknown[]).includes(valor);
      if ("not" in condicao) return valor !== condicao.not;
      if ("equals" in condicao) return String(valor).toLowerCase() === String(condicao.equals).toLowerCase();
      if ("contains" in condicao) return String(valor ?? "").toLowerCase().includes(String(condicao.contains).toLowerCase());
      if ("isNot" in condicao) return valor !== null && valor !== undefined;
      return valor ? combina(valor as Linha, condicao as Linha) : false; // filtro de relação
    }
    return valor === condicao;
  });
}

const apagados: string[] = [];

function tabela(linhas: Linha[]) {
  const achar = (args: { where?: Linha } = {}) => linhas.filter((l) => combina(l, args.where));
  return {
    findMany: async (args?: { where?: Linha }) => achar(args),
    findFirst: async (args?: { where?: Linha }) => achar(args)[0] ?? null,
    findUnique: async (args?: { where?: Linha }) => achar(args)[0] ?? null,
    count: async (args?: { where?: Linha }) => achar(args).length,
    delete: async (args: { where: Linha }) => {
      apagados.push(...achar(args).map((l) => l.id));
      return achar(args)[0];
    },
    deleteMany: async (args: { where: Linha }) => {
      apagados.push(...achar(args).map((l) => l.id));
      return { count: achar(args).length };
    },
  };
}

const clienteA = { id: "cli-a", empresaId: "emp-a", nome: "ANA", cpf: null, telefone: null, email: null };
const clienteB = { id: "cli-b", empresaId: "emp-b", nome: "BETO", cpf: null, telefone: null, email: null };
// A mesma placa pode existir nas duas empresas (cada uma tem o seu cadastro).
const carroA = { id: "v-a", empresaId: "emp-a", clienteId: "cli-a", placa: "ABC1D23", kmAtual: 1000, cliente: clienteA, ordens: [] };
const carroB = { id: "v-b", empresaId: "emp-b", clienteId: "cli-b", placa: "ABC1D23", kmAtual: 2000, cliente: clienteB, ordens: [] };
const osA = { id: "os-a", status: "AGUARDANDO", veiculoId: "v-a", veiculo: carroA };
const osB = { id: "os-b", status: "AGUARDANDO", veiculoId: "v-b", veiculo: carroB };
// Cliente e carro da empresa A sem nenhuma OS: podem ser excluídos.
const clienteC = { id: "cli-c", empresaId: "emp-a", nome: "CAIO", cpf: null, telefone: null, email: null };
const carroC = { id: "v-c", empresaId: "emp-a", clienteId: "cli-c", placa: "CCC1C11", kmAtual: 0, cliente: clienteC, ordens: [] };

const banco = {
  cliente: tabela([clienteA, clienteB, clienteC]),
  veiculo: tabela([carroA, carroB, carroC]),
  ordemServico: tabela([osA, osB]),
  $transaction: async (ops: Promise<unknown>[]) => Promise.all(ops),
  solicitacaoVinculo: tabela([
    { id: "s-a", status: "PENDENTE", cliente: clienteA },
    { id: "s-b", status: "PENDENTE", cliente: clienteB },
  ]),
};
vi.mock("@/lib/db", () => ({ db: banco }));

const adminA: Ator = { usuarioId: "u-a", papel: "ADMIN", empresaId: "emp-a", clienteIds: [] };

describe("cada empresa vê só os próprios dados", () => {
  let servicos: {
    clientes: typeof import("@/servicos/clientes");
    veiculos: typeof import("@/servicos/veiculos");
    ordens: typeof import("@/servicos/ordens");
    painel: typeof import("@/servicos/painel");
    placa: typeof import("@/servicos/busca-placa");
    vinculos: typeof import("@/servicos/vinculos");
  };
  beforeEach(async () => {
    servicos = {
      clientes: await import("@/servicos/clientes"),
      veiculos: await import("@/servicos/veiculos"),
      ordens: await import("@/servicos/ordens"),
      painel: await import("@/servicos/painel"),
      placa: await import("@/servicos/busca-placa"),
      vinculos: await import("@/servicos/vinculos"),
    };
  });

  it("listas de clientes, veículos e OS só trazem a própria empresa", async () => {
    expect((await servicos.clientes.listarClientes(adminA)).itens.map((c) => c.id)).toEqual(["cli-a", "cli-c"]);
    expect((await servicos.clientes.listarClientes(adminA, "BETO")).itens.map((c) => c.id)).toEqual([]);
    expect((await servicos.clientes.sugerirClientes(adminA, "a")).map((c) => c.id)).toEqual([]);
    expect((await servicos.clientes.sugerirClientes(adminA, "be")).map((c) => c.id)).toEqual([]);
    expect((await servicos.clientes.sugerirClientes(adminA, "an")).map((c) => c.id)).toEqual(["cli-a"]);
    expect((await servicos.veiculos.listarVeiculos(adminA)).itens.map((v) => v.id)).toEqual(["v-a", "v-c"]);
    expect((await servicos.ordens.listarOrdens(adminA)).map((o) => o.id)).toEqual(["os-a"]);
    expect((await servicos.vinculos.listarSolicitacoesPendentes(adminA)).map((s) => s.id)).toEqual(["s-a"]);
  });

  it("não abre cliente, veículo ou OS de outra empresa, mesmo sabendo o id", async () => {
    expect(await servicos.clientes.obterCliente(adminA, "cli-b")).toBeNull();
    expect(await servicos.veiculos.obterVeiculo(adminA, "v-b")).toBeNull();
    expect(await servicos.ordens.obterOrdem(adminA, "os-b")).toBeNull();
    expect(await servicos.clientes.obterCliente(adminA, "cli-a")).not.toBeNull();
  });

  it("a busca por placa acha o carro da própria empresa, não o da outra com a mesma placa", async () => {
    const r = await servicos.placa.consultarPlaca(adminA, "ABC-1D23");
    expect(r.tipo).toBe("encontrada");
    if (r.tipo === "encontrada") expect(r.veiculo.id).toBe("v-a");
  });

  it("os números do painel contam só a própria empresa", async () => {
    const p = await servicos.painel.dadosDoPainel(adminA);
    expect([p.clientes, p.veiculos, p.ordensAbertas, p.vinculosPendentes]).toEqual([2, 2, 1, 1]);
  });

  it("não cadastra veículo para cliente de outra empresa", async () => {
    await expect(
      servicos.veiculos.criarVeiculo(adminA, {
        clienteId: "cli-b",
        placa: "XYZ9A99",
        marca: "Fiat",
        modelo: "Uno",
        motor: "1.0",
        ano: 2015,
        cor: "Prata",
        kmAtual: 0,
      }),
    ).rejects.toThrow("Escolha um cliente da lista.");
  });

  it("não abre OS para veículo de outra empresa", async () => {
    await expect(
      servicos.ordens.criarOrdem(adminA, { veiculoId: "v-b", dataEntrada: new Date(), kmEntrada: 3000, descricao: "Troca de óleo" }),
    ).rejects.toThrow("Escolha um veículo da lista.");
  });

  it("só exclui cliente e carro da própria empresa, e nunca com ordem de serviço", async () => {
    await expect(servicos.veiculos.excluirVeiculo(adminA, "v-b")).rejects.toThrow("Veículo não encontrado.");
    await expect(servicos.clientes.excluirCliente(adminA, "cli-b")).rejects.toThrow("Cliente não encontrado.");
    await expect(servicos.veiculos.excluirVeiculo(adminA, "v-a")).rejects.toThrow("1 ordem de serviço no histórico");
    await expect(servicos.clientes.excluirCliente(adminA, "cli-a")).rejects.toThrow("1 ordem de serviço no histórico");
    expect(apagados).toEqual([]);

    await servicos.clientes.excluirCliente(adminA, "cli-c");
    expect(apagados.sort()).toEqual(["cli-c", "v-c"]);
  });
});
