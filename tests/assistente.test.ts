import { describe, it, expect } from "vitest";
import { interpretar, montarResposta, normalizarTexto, type AplicacaoFiltro, type CatalogoNomes, type RegistroOleo } from "@/lib/assistente";

const catalogo: CatalogoNomes = [
  { marca: "Volkswagen", modelos: ["Gol", "Polo", "T-Cross"] },
  { marca: "Hyundai", modelos: ["HB20", "HB20/HB20S", "Tucson"] },
  { marca: "Honda", modelos: ["HR-V", "Civic"] },
  { marca: "Chevrolet", modelos: ["Onix", "Onix Plus"] },
  { marca: "Fiat", modelos: ["Uno"] },
];

const fonte = (url: string, dados: Partial<RegistroOleo["fontes"][number]> = {}): RegistroOleo["fontes"][number] => ({
  id: url,
  tipo: "TECNICA",
  url,
  consultadaEm: new Date("2026-11-18"),
  observacao: null,
  viscosidade: null,
  especificacao: null,
  capacidadeComFiltroL: null,
  capacidadeSemFiltroL: null,
  intervaloKm: null,
  intervaloMeses: null,
  ...dados,
});

const registro = (dados: Partial<RegistroOleo>): RegistroOleo => ({
  id: "r1",
  motor: "1.0 8V",
  anoInicial: 2009,
  anoFinal: 2013,
  viscosidade: "5W-40",
  especificacao: "API SL",
  capacidadeComFiltroL: 3.5,
  capacidadeSemFiltroL: null,
  intervaloKm: 10000,
  intervaloMeses: 12,
  confianca: "FONTE_UNICA",
  divergencias: [],
  fontes: [fonte("https://www.exemplo.com.br/gol", { viscosidade: "5W-40", especificacao: "API SL" })],
  ...dados,
});

const gol8v = registro({ id: "gol-8v" });
const golMpi = registro({ id: "gol-mpi", motor: "1.0 12V MPI (EA211)", anoInicial: 2014, anoFinal: 2023, viscosidade: "5W-40", especificacao: "VW 508 88" });
const hb20Div = registro({
  id: "hb20-asp",
  motor: "1.0 aspirado (Kappa)",
  anoInicial: 2012,
  anoFinal: 2024,
  viscosidade: "5W-30",
  especificacao: "API SL / ACEA A5",
  confianca: "DIVERGENTE",
  divergencias: ["especificacao"],
  fontes: [
    fonte("https://omecanico.com.br/hb20", { viscosidade: "5W-30", especificacao: "API SL / ACEA A5" }),
    fonte("https://www.manualdooleo.com.br/hb20", { viscosidade: "5W-30", especificacao: "API SP / ACEA A5" }),
  ],
});
const hb20Turbo = registro({ id: "hb20-turbo", motor: "1.0 turbo (TGDI)", anoInicial: 2019, anoFinal: 2024, viscosidade: "5W-30", especificacao: "API SP" });

describe("interpretar", () => {
  it("acha modelo, marca, motor e ano", () => {
    expect(interpretar("Qual óleo do Gol 1.0 2015?", catalogo)).toEqual({ assunto: "OLEO", marca: "Volkswagen", modelo: "Gol", ano: 2015, motor: "1.0" });
  });

  it("entende vírgula, 'mil', turbo e aspirado", () => {
    expect(interpretar("gol mil 2012", catalogo).motor).toBe("1.0");
    expect(interpretar("HB20 1,0 turbo 2021", catalogo).motor).toBe("1.0 turbo");
    expect(interpretar("hb20 aspirado", catalogo).motor).toBe("aspirado");
    expect(interpretar("Polo 200 TSI", catalogo).motor).toBe("turbo");
  });

  it("prefere o nome mais comprido e aceita nome com hífen escrito de outro jeito", () => {
    expect(interpretar("onix plus 2020", catalogo).modelo).toBe("Onix Plus");
    expect(interpretar("hrv 2019", catalogo).modelo).toBe("HR-V");
    expect(interpretar("hr v 2019", catalogo).modelo).toBe("HR-V");
    expect(interpretar("T-Cross 2021", catalogo).modelo).toBe("T-Cross");
    expect(interpretar("hb20s 2018", catalogo).modelo).toBe("HB20/HB20S");
  });

  it("não confunde palavra parecida com modelo", () => {
    expect(interpretar("qual o golpe do dia", catalogo).modelo).toBeNull();
    expect(interpretar("unoxx", catalogo).modelo).toBeNull();
  });

  it("descobre o assunto pelas palavras", () => {
    expect(interpretar("quantos litros leva o gol 2015", catalogo).assunto).toBe("CAPACIDADE");
    expect(interpretar("quando trocar o oleo do gol", catalogo).assunto).toBe("INTERVALO");
    expect(interpretar("filtro de ar do gol 2015", catalogo).assunto).toBe("FILTROS");
    expect(interpretar("oi", catalogo).assunto).toBe("AJUDA");
    expect(interpretar("", catalogo).assunto).toBe("AJUDA");
  });

  it("marca sem modelo, pelo apelido", () => {
    expect(interpretar("oleo de vw", catalogo)).toMatchObject({ marca: "Volkswagen", modelo: null });
  });

  it("normaliza acento, pontuação e decimal", () => {
    expect(normalizarTexto("Óleo do HB20, 1,0 TURBO?!")).toBe("oleo do hb20 1.0 turbo");
  });
});

describe("montarResposta: regras anti-invenção", () => {
  const perguntar = (texto: string, registros: RegistroOleo[], filtros: AplicacaoFiltro[] = []) =>
    montarResposta(interpretar(texto, catalogo), { registros, filtros }, catalogo);

  it("sem registro do carro: diz que não tem a informação e não traz valores", () => {
    const r = perguntar("qual oleo do civic 2015", []);
    expect(r.tipo).toBe("NAO_ENCONTRADO");
    expect(r.texto).toMatch(/não tenho essa informação/i);
    expect(r.texto).not.toMatch(/\d+W-?\d+/);
    expect(r.registros).toHaveLength(0);
  });

  it("carro na base mas não no ano pedido: não chuta o mais perto", () => {
    const r = perguntar("oleo do gol 1.0 2030", [gol8v, golMpi]);
    expect(r.tipo).toBe("NAO_ENCONTRADO");
    expect(r.texto).toMatch(/não tenho essa informação/i);
    expect(r.registros).toHaveLength(0);
    expect(r.opcoes.length).toBeGreaterThan(0);
  });

  it("toda resposta encontrada traz fonte e confiança, e os valores vêm do registro", () => {
    for (const [pergunta, regs] of [
      ["qual oleo do gol 1.0 2010", [gol8v, golMpi]],
      ["quantos litros leva o gol 1.0 2010", [gol8v, golMpi]],
      ["quando trocar o oleo do gol 2010", [gol8v, golMpi]],
      ["oleo do hb20 aspirado 2015", [hb20Div, hb20Turbo]],
    ] as const) {
      const r = perguntar(pergunta, [...regs]);
      expect(r.tipo, pergunta).toBe("ENCONTRADO");
      expect(r.registros).toHaveLength(1);
      expect(r.texto).toMatch(/Confiança: (Confirmado|Fonte única|Divergente)/);
      expect(r.texto).toMatch(/fontes?: [a-z.]+\.(com|br)/);
      expect(r.registros[0].fontes.length).toBeGreaterThan(0);
      // Nenhuma viscosidade no texto que não esteja no registro ou nas fontes dele.
      const conhecidas = new Set([r.registros[0].viscosidade, ...r.registros[0].fontes.map((f) => f.viscosidade)]);
      for (const v of r.texto.match(/\d+W-?\d+/g) ?? []) expect(conhecidas.has(v)).toBe(true);
    }
  });

  it("divergência: mostra o valor de cada fonte e não escolhe", () => {
    const r = perguntar("oleo do hb20 aspirado 2015", [hb20Div, hb20Turbo]);
    expect(r.texto).toMatch(/fontes discordam/);
    expect(r.texto).toContain("omecanico.com.br diz API SL / ACEA A5");
    expect(r.texto).toContain("manualdooleo.com.br diz API SP / ACEA A5");
    expect(r.texto).toMatch(/Não escolho entre elas/);
  });

  it("mais de um motor possível: pergunta qual, sem escolher", () => {
    const r = perguntar("oleo do hb20 2021", [hb20Div, hb20Turbo]);
    expect(r.tipo).toBe("ESCLARECER");
    expect(r.registros).toHaveLength(0);
    expect(r.opcoes.map((o) => o.rotulo)).toEqual(["1.0 aspirado (Kappa), 2012 a 2024", "1.0 turbo (TGDI), 2019 a 2024"]);
    // A opção vira uma pergunta que acha um registro só.
    const escolhida = perguntar(r.opcoes[1].pergunta, [hb20Div, hb20Turbo]);
    expect(escolhida.tipo).toBe("ENCONTRADO");
    expect(escolhida.registros[0].id).toBe("hb20-turbo");
  });

  it("dado que falta no registro: diz que a base não tem, em vez de completar", () => {
    const semQtd = registro({ capacidadeComFiltroL: null, intervaloKm: null, intervaloMeses: null });
    expect(perguntar("quantos litros leva o gol 1.0 2010", [semQtd]).texto).toMatch(/a base não tem a quantidade/);
    expect(perguntar("quando trocar o oleo do gol 1.0 2010", [semQtd]).texto).toMatch(/a base não tem o intervalo/);
  });

  it("não reconheceu o carro: pede o modelo, sem resposta de óleo", () => {
    const r = montarResposta(interpretar("qual o melhor oleo do mundo", catalogo), null, catalogo);
    expect(r.tipo).toBe("NAO_ENTENDI");
    expect(r.registros).toHaveLength(0);
  });

  it("filtros: pede o ano, depois responde com a fonte do catálogo", () => {
    const f = (tipo: AplicacaoFiltro["tipo"], codigo: string): AplicacaoFiltro => ({
      fabricante: "Tecfil",
      motor: "1.0 12V 3cil 80cv",
      anoInicial: 2012,
      anoFinal: 2026,
      tipo,
      codigo,
      url: "https://catalogo.tecfil.com.br/search/HB20",
      consultadaEm: new Date("2026-11-18"),
      observacao: null,
    });
    const filtros = [f("OLEO", "PSL166"), f("AR", "ARL2338")];
    expect(perguntar("filtros do hb20", [], filtros).tipo).toBe("ESCLARECER");
    const r = perguntar("filtros do hb20 1.0 2015", [], filtros);
    expect(r.tipo).toBe("ENCONTRADO");
    expect(r.texto).toContain("óleo PSL166; ar do motor ARL2338");
    expect(r.texto).toContain("Fonte: catálogo Tecfil");
    expect(perguntar("filtros do tucson 2015", [], []).texto).toMatch(/não tenho essa informação/i);
  });
});
