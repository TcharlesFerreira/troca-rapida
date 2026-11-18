import { describe, it, expect } from "vitest";
import { montarDescricao } from "@/lib/servicos-os";
import { ordemSchema } from "@/lib/validacao";

const base = { veiculoId: "v1", dataEntrada: "2026-11-18", kmEntrada: "10000" };
const montar = (extra: Record<string, string>) => {
  const r = ordemSchema.safeParse({ ...base, ...extra });
  return r.success ? r.data.descricao : null;
};

describe("serviços da OS", () => {
  it("não existe mais a opção 'troca de óleo' sozinha", () => {
    expect(ordemSchema.safeParse({ ...base, tipoServico: "TROCA_OLEO" }).success).toBe(false);
  });

  it("troca completa, com bujão e arruela trocados separadamente", () => {
    expect(montar({ tipoServico: "TROCA_OLEO_COMPLETA" })).toBe("Troca de óleo completa");
    expect(montar({ tipoServico: "TROCA_OLEO_COMPLETA", pecaTrocada_ARRUELA: "on" })).toBe("Troca de óleo completa: arruela do bujão");
    expect(montar({ tipoServico: "TROCA_OLEO_COMPLETA", pecaTrocada_BUJAO: "on", pecaTrocada_ARRUELA: "on" })).toBe(
      "Troca de óleo completa: bujão do cárter, arruela do bujão",
    );
  });

  it("troca incompleta aceita filtros, peças e texto, mas pede ao menos um", () => {
    expect(montar({ tipoServico: "TROCA_OLEO_INCOMPLETA" })).toBeNull();
    expect(montar({ tipoServico: "TROCA_OLEO_INCOMPLETA", filtroTrocado_OLEO: "on" })).toBe("Troca de óleo incompleta: filtro de óleo");
    expect(montar({ tipoServico: "TROCA_OLEO_INCOMPLETA", filtroTrocado_OLEO: "on", pecaTrocada_ARRUELA: "on", detalheServico: "completou 1 litro" })).toBe(
      "Troca de óleo incompleta: filtro de óleo, arruela do bujão, completou 1 litro",
    );
  });

  it("troca incompleta não aceita todos os filtros marcados", () => {
    const todos = { filtroTrocado_OLEO: "on", filtroTrocado_COMBUSTIVEL: "on", filtroTrocado_AR: "on", filtroTrocado_AR_CABINE: "on" };
    expect(montar({ tipoServico: "TROCA_OLEO_INCOMPLETA", ...todos })).toBeNull();
    expect(montar({ tipoServico: "TROCA_OLEO_INCOMPLETA", ...todos, filtroTrocado_AR_CABINE: "" })).toBe(
      "Troca de óleo incompleta: filtro de óleo, filtro de combustível, filtro de ar do motor",
    );
  });

  it("troca de filtros pede ao menos um filtro", () => {
    expect(montar({ tipoServico: "TROCA_FILTROS" })).toBeNull();
    expect(montar({ tipoServico: "TROCA_FILTROS", filtroTrocado_COMBUSTIVEL: "on" })).toBe("Troca de filtros: filtro de combustível");
  });

  it("outro serviço usa o texto escrito", () => {
    expect(montar({ tipoServico: "OUTRO" })).toBeNull();
    expect(montarDescricao("OUTRO", "Troca das pastilhas de freio", [])).toBe("Troca das pastilhas de freio");
  });
});
