import { describe, expect, it } from "vitest";
import { filtrosDoRegistro } from "@/lib/filtros";

const linhas = [
  { motor: "1.0 12V Flex", anoInicial: 2012, anoFinal: 2019, codigo: "A" },
  { motor: "1.6 16V", anoInicial: 2012, anoFinal: 2019, codigo: "B" },
  { motor: "1.0 Turbo", anoInicial: 2020, anoFinal: 2024, codigo: "C" },
  { motor: "1.0", anoInicial: 2005, anoFinal: 2011, codigo: "D" },
];

describe("filtrosDoRegistro", () => {
  it("pega a mesma cilindrada com anos que se cruzam", () => {
    const r = filtrosDoRegistro({ motor: "1.0 12V", anoInicial: 2012, anoFinal: 2024 }, linhas);
    expect(r.map((l) => l.codigo)).toEqual(["A", "C"]);
  });

  it("deixa de fora anos que não se cruzam", () => {
    const r = filtrosDoRegistro({ motor: "1.0", anoInicial: 2008, anoFinal: 2010 }, linhas);
    expect(r.map((l) => l.codigo)).toEqual(["D"]);
  });

  it("motor sem cilindrada aceita qualquer motor nos anos", () => {
    const r = filtrosDoRegistro({ motor: "Kappa", anoInicial: 2015, anoFinal: 2015 }, linhas);
    expect(r.map((l) => l.codigo)).toEqual(["A", "B"]);
  });
});

describe("turbo e aspirado", () => {
  const hb20 = [
    { motor: "1.0 12V 3cil 80cv", observacao: "Tecfil: (Confort / S) (Flex)", anoInicial: 2012, anoFinal: 2026, codigo: "ASP" },
    { motor: "1.0 TGDI 12V 120cv", observacao: "Tecfil: (Sport)", anoInicial: 2020, anoFinal: 2026, codigo: "TGDI" },
    { motor: "1.0 12V 128cv", observacao: "Tecfil: 200 TSI - Highline", anoInicial: 2017, anoFinal: 2022, codigo: "TSI" },
  ];
  it("registro aspirado não pega versões turbo", () => {
    expect(filtrosDoRegistro({ motor: "1.0 aspirado (Kappa)", anoInicial: 2012, anoFinal: 2024 }, hb20).map((l) => l.codigo)).toEqual(["ASP"]);
  });
  it("registro turbo só pega versões turbo (inclusive pela observação)", () => {
    expect(filtrosDoRegistro({ motor: "1.0 turbo (TGDI)", anoInicial: 2019, anoFinal: 2024 }, hb20).map((l) => l.codigo)).toEqual(["TGDI", "TSI"]);
  });
  it("registro sem dizer o tipo pega todos", () => {
    expect(filtrosDoRegistro({ motor: "1.0 12V", anoInicial: 2020, anoFinal: 2020 }, hb20)).toHaveLength(3);
  });
});
