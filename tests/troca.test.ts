import { describe, it, expect } from "vitest";
import { avaliarVencimento } from "@/lib/troca";
import { somarMeses } from "@/lib/datas";

const hoje = new Date(2026, 10, 16, 15, 30); // 16/11/2026

describe("próxima troca de óleo", () => {
  it("sem previsão cadastrada não está vencida", () => {
    const v = avaliarVencimento(null, 50000, hoje);
    expect(v.temPrevisao).toBe(false);
    expect(v.vencida).toBe(false);
  });

  it("vence por quilometragem ao atingir o valor previsto", () => {
    expect(avaliarVencimento({ proximaTrocaKm: 60000 }, 59999, hoje).vencida).toBe(false);
    expect(avaliarVencimento({ proximaTrocaKm: 60000 }, 60000, hoje).vencidaPorKm).toBe(true);
    expect(avaliarVencimento({ proximaTrocaKm: 60000 }, 61000, hoje).kmRestantes).toBe(-1000);
  });

  it("vence por data só depois do dia previsto", () => {
    const amanha = new Date(Date.UTC(2026, 10, 17));
    const hojeUtc = new Date(Date.UTC(2026, 10, 16));
    const ontem = new Date(Date.UTC(2026, 10, 15));
    expect(avaliarVencimento({ proximaTrocaData: amanha }, 1, hoje).vencida).toBe(false);
    expect(avaliarVencimento({ proximaTrocaData: hojeUtc }, 1, hoje).vencida).toBe(false);
    expect(avaliarVencimento({ proximaTrocaData: ontem }, 1, hoje).vencidaPorData).toBe(true);
  });

  it("basta um dos critérios (km ou data) para estar vencida", () => {
    const v = avaliarVencimento(
      { proximaTrocaKm: 70000, proximaTrocaData: new Date(Date.UTC(2026, 0, 1)) },
      50000,
      hoje,
    );
    expect(v.vencidaPorKm).toBe(false);
    expect(v.vencidaPorData).toBe(true);
    expect(v.vencida).toBe(true);
  });

  it("soma meses respeitando fim de mês", () => {
    expect(somarMeses(new Date(Date.UTC(2026, 0, 31)), 1).toISOString().slice(0, 10)).toBe("2026-02-28");
    expect(somarMeses(new Date(Date.UTC(2026, 10, 16)), 12).toISOString().slice(0, 10)).toBe("2027-11-16");
  });
});
