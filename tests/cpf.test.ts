import { describe, it, expect } from "vitest";
import { cpfValido, formatarCpf, normalizarCpf } from "@/lib/cpf";

describe("cpf", () => {
  it("normaliza só dígitos", () => {
    expect(normalizarCpf("529.982.247-25")).toBe("52998224725");
  });

  it("valida CPFs corretos com ou sem máscara", () => {
    expect(cpfValido("529.982.247-25")).toBe(true);
    expect(cpfValido("52998224725")).toBe(true);
    expect(cpfValido("111.444.777-35")).toBe(true);
  });

  it("rejeita dígito verificador errado, tamanho errado e sequências repetidas", () => {
    expect(cpfValido("529.982.247-24")).toBe(false);
    expect(cpfValido("1234567890")).toBe(false);
    expect(cpfValido("111.111.111-11")).toBe(false);
    expect(cpfValido("")).toBe(false);
  });

  it("formata", () => {
    expect(formatarCpf("52998224725")).toBe("529.982.247-25");
  });
});
