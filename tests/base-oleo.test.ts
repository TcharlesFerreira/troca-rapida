import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { consolidar, dominioBase, validarMarcaJson } from "@/lib/base-oleo-json";

const fonte = (extra: Record<string, unknown> = {}) => ({
  tipo: "TECNICA",
  url: "https://exemplo-a.com.br/onix",
  consultadaEm: "2026-11-16",
  dados: { viscosidade: "5W-30", especificacao: "API SP" },
  ...extra,
});
const arquivo = (motores: unknown[]) => ({ marca: "Teste", modelos: [{ nome: "Modelo", motores }] });
const motor = (fontes: unknown[], anos: number[] = [2020, 2022], nome = "1.0") => ({ motor: nome, anos, fontes });

describe("validação da base de óleo", () => {
  it("aceita um registro com fonte", () => {
    const r = validarMarcaJson(arquivo([motor([fonte()])]));
    expect(r.erros).toHaveLength(0);
    expect(r.registros).toHaveLength(1);
  });

  it("registro sem fonte não entra", () => {
    const r = validarMarcaJson(arquivo([motor([])]));
    expect(r.registros).toHaveLength(0);
    expect(r.erros.length).toBeGreaterThan(0);
  });

  it("fonte sem URL não entra", () => {
    const r = validarMarcaJson(arquivo([motor([fonte({ url: "" })])]));
    expect(r.registros).toHaveLength(0);
  });

  it("fórum e rede social não valem como fonte", () => {
    expect(validarMarcaJson(arquivo([motor([fonte({ url: "https://forum.carros.com.br/topico" })])])).registros).toHaveLength(0);
    expect(validarMarcaJson(arquivo([motor([fonte({ url: "https://www.reddit.com/r/carros" })])])).registros).toHaveLength(0);
  });

  it("exige viscosidade e especificação em alguma fonte", () => {
    const r = validarMarcaJson(arquivo([motor([fonte({ dados: { intervaloKm: 10000 } })])]));
    expect(r.registros).toHaveLength(0);
  });

  it("rejeita número fora do razoável e campo desconhecido", () => {
    expect(validarMarcaJson(arquivo([motor([fonte({ dados: { viscosidade: "5W-30", especificacao: "API SP", capacidadeComFiltroL: 99 } })])])).registros).toHaveLength(0);
    expect(validarMarcaJson(arquivo([motor([fonte({ dados: { viscosidade: "5W-30", especificacao: "API SP", inventado: 1 } })])])).registros).toHaveLength(0);
  });

  it("rejeita faixas de anos que se sobrepõem no mesmo motor", () => {
    const r = validarMarcaJson(arquivo([motor([fonte()], [2020, 2022]), motor([fonte()], [2022, 2024])]));
    expect(r.registros).toHaveLength(1);
    expect(r.erros.length).toBeGreaterThan(0);
  });

  it("aceita motores diferentes do mesmo modelo e faixas seguidas", () => {
    const r = validarMarcaJson(arquivo([motor([fonte()], [2020, 2022]), motor([fonte()], [2023, 2024]), motor([fonte()], [2020, 2024], "1.4")]));
    expect(r.erros).toHaveLength(0);
    expect(r.registros).toHaveLength(3);
  });
});

describe("confiança calculada a partir das fontes", () => {
  it("uma fonte só: Fonte única", () => {
    expect(consolidar({ fontes: [fonte()] as never }).confianca).toBe("FONTE_UNICA");
  });

  it("duas páginas do mesmo site contam como uma fonte só", () => {
    const f = [fonte({ url: "https://exemplo-a.com.br/1" }), fonte({ url: "https://www.exemplo-a.com.br/2" })];
    expect(consolidar({ fontes: f as never }).confianca).toBe("FONTE_UNICA");
  });

  it("dois sites independentes que concordam: Confirmado", () => {
    const f = [fonte(), fonte({ url: "https://exemplo-b.com/onix", dados: { viscosidade: "5w30", especificacao: "api sp" } })];
    const c = consolidar({ fontes: f as never });
    expect(c.confianca).toBe("CONFIRMADO");
    expect(c.divergencias).toHaveLength(0);
  });

  it("dois sites que discordam: Divergente, e diz em quê", () => {
    const f = [fonte(), fonte({ url: "https://exemplo-b.com/onix", dados: { viscosidade: "0W-20", especificacao: "API SP" } })];
    const c = consolidar({ fontes: f as never });
    expect(c.confianca).toBe("DIVERGENTE");
    expect(c.divergencias).toContain("viscosidade");
  });

  it("o valor oficial vem da fonte preferida (montadora antes de fonte técnica)", () => {
    const f = [
      fonte({ url: "https://exemplo-b.com/x", dados: { viscosidade: "10W-40", especificacao: "API SN" } }),
      fonte({ tipo: "MONTADORA", url: "https://montadora.com.br/manual", dados: { viscosidade: "0W-20", especificacao: "API SP" } }),
    ];
    expect(consolidar({ fontes: f as never }).viscosidade).toBe("0W-20");
  });

  it("extrai o domínio base", () => {
    expect(dominioBase("https://www.exemplo.com.br/a")).toBe("exemplo.com.br");
    expect(dominioBase("https://blog.exemplo.com/a")).toBe("exemplo.com");
  });
});

describe("arquivos reais em data/oleo (critério 5: toda informação tem fonte e confiança)", () => {
  const pasta = join(process.cwd(), "data", "oleo");
  const arquivos = readdirSync(pasta).filter((a) => a.endsWith(".json"));

  it("existe ao menos um arquivo de marca", () => {
    expect(arquivos.length).toBeGreaterThan(0);
  });

  for (const nome of arquivos) {
    it(`${nome}: todos os registros são válidos e têm fonte`, () => {
      const r = validarMarcaJson(JSON.parse(readFileSync(join(pasta, nome), "utf8")), nome);
      expect(r.erros).toHaveLength(0);
      expect(r.registros.length).toBeGreaterThan(0);
      for (const reg of r.registros) {
        expect(reg.fontes.length).toBeGreaterThan(0);
        expect(["CONFIRMADO", "FONTE_UNICA", "DIVERGENTE"]).toContain(consolidar(reg).confianca);
        for (const f of reg.fontes) expect(f.url.startsWith("http")).toBe(true);
      }
    });
  }
});
