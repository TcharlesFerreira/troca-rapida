import { describe, it, expect } from "vitest";
import { montarDescricao } from "@/lib/servicos-os";
import { ordemSchema } from "@/lib/validacao";

const base = { veiculoId: "v1", dataEntrada: "2026-11-18", kmEntrada: "10000" };

describe("serviços da OS", () => {
  it("monta a descrição de cada serviço", () => {
    expect(montarDescricao("TROCA_OLEO", undefined, [])).toBe("Troca de óleo");
    expect(montarDescricao("TROCA_OLEO_INCOMPLETA", "só completou 1 litro", [])).toBe("Troca de óleo incompleta: só completou 1 litro");
    expect(montarDescricao("TROCA_FILTROS", undefined, ["AR", "OLEO"])).toBe("Troca de filtros: óleo, ar do motor");
  });

  it("troca incompleta pede o que foi trocado", () => {
    const r = ordemSchema.safeParse({ ...base, tipoServico: "TROCA_OLEO_INCOMPLETA" });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.flatten().fieldErrors.detalheServico).toBeDefined();
  });

  it("troca de filtros pede ao menos um filtro", () => {
    expect(ordemSchema.safeParse({ ...base, tipoServico: "TROCA_FILTROS" }).success).toBe(false);
    const ok = ordemSchema.safeParse({ ...base, tipoServico: "TROCA_FILTROS", filtroTrocado_COMBUSTIVEL: "on" });
    expect(ok.success && ok.data.descricao).toBe("Troca de filtros: combustível");
  });

  it("troca de óleo simples não pede nada a mais", () => {
    const r = ordemSchema.safeParse({ ...base, tipoServico: "TROCA_OLEO" });
    expect(r.success && r.data.descricao).toBe("Troca de óleo");
  });
});
