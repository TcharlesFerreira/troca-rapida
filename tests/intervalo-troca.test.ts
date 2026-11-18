import { describe, it, expect } from "vitest";
import { intervaloKmPorViscosidade, proximaTrocaKmSugerida } from "@/lib/intervalo-troca";

describe("intervalo da próxima troca por viscosidade", () => {
  it("segue a tabela da oficina", () => {
    const tabela: Array<[string, number]> = [
      ["0W-20", 10000], ["5W20", 10000], ["5W-30", 10000], ["5W-40", 10000],
      ["10W-30", 7000], ["10W40", 7000], ["15W-40", 7000],
      ["20W-50", 5000], ["25W50", 5000], ["25W-60", 5000],
    ];
    for (const [v, km] of tabela) expect(intervaloKmPorViscosidade(v)).toBe(km);
  });

  it("aceita variações de escrita", () => {
    expect(intervaloKmPorViscosidade("5w 30")).toBe(10000);
    expect(intervaloKmPorViscosidade(" SAE 15W-40 ")).toBe(7000);
    expect(intervaloKmPorViscosidade("5W-40 / 10W-40")).toBe(10000);
  });

  it("viscosidade fora da lista fica para preencher à mão", () => {
    expect(intervaloKmPorViscosidade("0W-30")).toBeNull();
    expect(intervaloKmPorViscosidade("")).toBeNull();
    expect(intervaloKmPorViscosidade("mineral")).toBeNull();
    expect(proximaTrocaKmSugerida(50000, "0W-30")).toBeNull();
  });

  it("soma o intervalo à quilometragem da entrada", () => {
    expect(proximaTrocaKmSugerida(86168, "5W-30")).toBe(96168);
    expect(proximaTrocaKmSugerida(86168, "20W-50")).toBe(91168);
  });
});
