import { describe, it, expect } from "vitest";
import { compararOleo, normalizarCodigo } from "@/lib/oleo";

const recomendado = { viscosidade: "5W-30", especificacao: "Dexos1 Gen 3 API SP" };

describe("comparação do óleo informado com o recomendado", () => {
  it("normaliza códigos", () => {
    expect(normalizarCodigo("5w 30")).toBe("5W30");
    expect(normalizarCodigo("API SP")).toBe("APISP");
  });

  it("sem recomendação na base, não compara", () => {
    expect(compararOleo({ viscosidade: "5W-30", especificacao: "API SP" }, null).situacao).toBe("SEM_RECOMENDACAO");
  });

  it("óleo igual ao recomendado não gera aviso (mesmo escrito diferente)", () => {
    expect(compararOleo({ viscosidade: "5w30", especificacao: "dexos1 gen 3 api sp" }, recomendado).situacao).toBe("IGUAL");
  });

  it("avisa quando a viscosidade é diferente, mas não impede nada", () => {
    const r = compararOleo({ viscosidade: "10W-40", especificacao: "Dexos1 Gen 3 API SP" }, recomendado);
    expect(r.situacao).toBe("DIFERENTE");
    if (r.situacao === "DIFERENTE") {
      expect(r.viscosidadeDiferente).toBe(true);
      expect(r.especificacaoDiferente).toBe(false);
      expect(r.mensagem).toContain("10W-40");
    }
  });

  it("avisa quando a especificação é diferente", () => {
    const r = compararOleo({ viscosidade: "5W-30", especificacao: "API SN" }, recomendado);
    expect(r.situacao).toBe("DIFERENTE");
  });
});
