import { describe, it, expect, vi } from "vitest";
import type { Ator } from "@/lib/permissoes";

/** Banco falso: clientes e veículos de duas oficinas, filtrando por empresa como o Prisma faria. */
const clientes = [
  { id: "c1", empresaId: "emp-a", nome: "MARIA SOUZA", cpf: "52998224725", telefone: "11912345678" },
  { id: "c2", empresaId: "emp-a", nome: "JOAO SILVA", cpf: null, telefone: "1133334444" },
  // Mesmo CPF, mas na OUTRA oficina: não pode ser reaproveitado.
  { id: "c9", empresaId: "emp-b", nome: "PEDRO", cpf: "01234567890", telefone: null },
];
const veiculos = [
  { empresaId: "emp-a", placa: "AAA1A11" },
  { empresaId: "emp-b", placa: "BBB2B22" },
];
vi.mock("@/lib/db", () => ({
  db: {
    cliente: { findMany: async ({ where }: any) => clientes.filter((c) => c.empresaId === where.empresaId) },
    veiculo: {
      findMany: async ({ where }: any) => veiculos.filter((v) => v.empresaId === where.empresaId && where.placa.in.includes(v.placa)),
    },
  },
}));

const adminA: Ator = { usuarioId: "u", papel: "ADMIN", empresaId: "emp-a", clienteIds: [] };

describe("conferência da importação de cadastros", () => {
  it("não duplica cliente, ignora placa existente e só olha a própria oficina", async () => {
    const { conferirImportacao } = await import("@/servicos/cadastros-planilha");
    const csv = [
      "Nome;CPF;Telefone;Placa;Marca;Modelo;Ano",
      "Maria Souza;529.982.247-25;;CCC3C33;Fiat;Uno;2015", // CPF já cadastrado -> cliente existente, carro novo
      "João Silva;;(11) 3333-4444;AAA1A11;VW;Gol;2010", // nome+telefone já cadastrado; placa já existe -> nada entra
      "Pedro;012.345.678-90;;BBB2B22;Fiat;Palio;2012", // CPF e placa só existem na outra oficina -> tudo novo
      "Pedro;012.345.678-90;;DDD4D44;Fiat;Mobi;2020", // mesmo Pedro da linha anterior
      "Ana;;;CCC3C33;Ford;Ka;2018", // placa repetida na planilha
      "Bia;;;;;;", // cliente sem carro
    ].join("\n");
    const r = await conferirImportacao(adminA, csv);
    if (!r.ok) throw new Error(r.erro);
    expect(r.linhas.map((l) => [l.numero, l.situacao])).toEqual([
      [2, "NOVO"],
      [3, "JA_EXISTE"],
      [4, "NOVO"],
      [5, "NOVO"],
      [6, "ERRO"],
      [7, "NOVO"],
    ]);
    expect(r.linhas[4].detalhes[0]).toContain("Placa repetida na planilha (já está na linha 2)");
    expect(r.resumo).toEqual({ linhas: 6, clientesNovos: 2, clientesExistentes: 2, veiculosNovos: 3, veiculosJaCadastrados: 1, linhasComErro: 1 });
  });

  it("nome e telefone iguais com CPFs diferentes são pessoas diferentes", async () => {
    const { conferirImportacao } = await import("@/servicos/cadastros-planilha");
    const r = await conferirImportacao(adminA, "Nome;CPF;Telefone\nMaria Souza;012.345.678-90;(11) 91234-5678");
    if (!r.ok) throw new Error(r.erro);
    expect(r.resumo.clientesNovos).toBe(1);
  });
});
