import { describe, it, expect } from "vitest";
import { INTERNO, NAO_TEM, mesmoFiltro, normalizarCodigoFiltro, textoFiltro } from "@/lib/filtros";

describe("códigos de filtro", () => {
  it("limpa o código anotado", () => {
    expect(normalizarCodigoFiltro(" psl  675* ")).toBe("PSL 675");
    expect(normalizarCodigoFiltro("GI 04/7")).toBe("GI 04/7");
    // "GL" das fichas antigas é o GI da Tecfil
    expect(normalizarCodigoFiltro("GL 04/7")).toBe("GI 04/7");
    expect(normalizarCodigoFiltro("ARL - ARL 8840")).toBe("ARL 8840");
  });

  it("entende 'não tem', 'interno' e prefixo sem número", () => {
    expect(normalizarCodigoFiltro("N/T")).toBe(NAO_TEM);
    expect(normalizarCodigoFiltro("não tem")).toBe(NAO_TEM);
    expect(normalizarCodigoFiltro("INT")).toBe(INTERNO);
    expect(normalizarCodigoFiltro("ACP")).toBeNull();
    expect(normalizarCodigoFiltro("")).toBeNull();
  });

  it("compara ignorando espaço e hífen", () => {
    expect(mesmoFiltro("PSL 675", "PSL675")).toBe(true);
    expect(mesmoFiltro("GI 04/7", "GI04/7")).toBe(true);
    expect(mesmoFiltro("PSL 675", "PSL 676")).toBe(false);
  });

  it("mostra texto amigável", () => {
    expect(textoFiltro(NAO_TEM)).toBe("Não tem");
    expect(textoFiltro(null)).toBe("Não informado");
    expect(textoFiltro("ARL 8832")).toBe("ARL 8832");
  });
});
