import { describe, it, expect } from "vitest";
import { criarAreaCliente, type BancoAreaCliente } from "@/servicos/area-cliente";
import { ErroPermissao } from "@/lib/erros";
import type { Ator } from "@/lib/permissoes";

/**
 * Banco falso em memória que APLICA o "where" de verdade (igualdade, "in", "not" e filtro
 * de relação). Se um serviço esquecer o filtro por cliente, este teste quebra.
 */
type Linha = Record<string, any>;

function combina(linha: Linha, where: Linha | undefined): boolean {
  if (!where) return true;
  return Object.entries(where).every(([campo, condicao]) => {
    const valor = linha[campo];
    if (condicao !== null && typeof condicao === "object" && !(condicao instanceof Date)) {
      if ("in" in condicao) return (condicao.in as unknown[]).includes(valor);
      if ("not" in condicao) return valor !== condicao.not;
      if ("isNot" in condicao) return condicao.isNot === null ? valor !== null && valor !== undefined : true;
      return valor ? combina(valor as Linha, condicao as Linha) : false; // filtro de relação
    }
    return valor === condicao;
  });
}

function tabela(linhas: Linha[]) {
  const achar = (args: { where?: Linha }) => linhas.filter((l) => combina(l, args.where));
  return {
    findMany: async (args: { where?: Linha } = {}) => achar(args),
    findFirst: async (args: { where?: Linha } = {}) => achar(args)[0] ?? null,
  };
}

const veiculoDaAna = { id: "v-ana", clienteId: "cli-ana", placa: "AAA1A11" };
const veiculoDoBeto = { id: "v-beto", clienteId: "cli-beto", placa: "BBB2B22" };

const banco = {
  veiculo: tabela([veiculoDaAna, veiculoDoBeto]),
  ordemServico: tabela([
    { id: "os-ana", status: "EM_ANDAMENTO", veiculo: veiculoDaAna },
    { id: "os-beto", status: "EM_ANDAMENTO", veiculo: veiculoDoBeto },
    { id: "os-beto-entregue", status: "ENTREGUE", veiculo: veiculoDoBeto },
  ]),
} as unknown as BancoAreaCliente;

const area = criarAreaCliente(banco);
const ana: Ator = { usuarioId: "u-ana", papel: "CLIENTE", clienteId: "cli-ana" };
const semVinculo: Ator = { usuarioId: "u-novo", papel: "CLIENTE", clienteId: null };
const admin: Ator = { usuarioId: "u-admin", papel: "ADMIN", clienteId: null };

describe("o cliente nunca vê dados de outro cliente (critério 6)", () => {
  it("lista só os próprios veículos", async () => {
    const lista = (await area.meusVeiculos(ana)) as Array<{ id: string }>;
    expect(lista.map((v) => v.id)).toEqual(["v-ana"]);
  });

  it("não abre o veículo de outro cliente, mesmo sabendo o id", async () => {
    expect(await area.detalheVeiculo(ana, "v-beto")).toBeNull();
    expect(await area.detalheVeiculo(ana, "v-ana")).not.toBeNull();
  });

  it("não abre a OS de outro cliente, mesmo sabendo o id", async () => {
    expect(await area.detalheOrdem(ana, "os-beto")).toBeNull();
    expect(await area.detalheOrdem(ana, "os-ana")).not.toBeNull();
  });

  it("as OS em andamento são só as dele", async () => {
    const lista = (await area.ordensEmAndamento(ana)) as Array<{ id: string }>;
    expect(lista.map((o) => o.id)).toEqual(["os-ana"]);
  });

  it("conta sem vínculo confirmado não enxerga nada (nem tenta consultar)", async () => {
    let falhou = 0;
    for (const chamar of [
      () => area.meusVeiculos(semVinculo),
      () => area.ordensEmAndamento(semVinculo),
      () => area.detalheVeiculo(semVinculo, "v-ana"),
      () => area.detalheOrdem(semVinculo, "os-ana"),
    ]) {
      try {
        await chamar();
      } catch (e) {
        if (e instanceof ErroPermissao) falhou++;
      }
    }
    expect(falhou).toBe(4);
  });

  it("administrador não usa a área do cliente", async () => {
    let bloqueado = false;
    try {
      await area.meusVeiculos(admin);
    } catch (e) {
      bloqueado = e instanceof ErroPermissao;
    }
    expect(bloqueado).toBe(true);
  });
});
