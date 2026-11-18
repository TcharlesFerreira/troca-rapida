import { describe, it, expect } from "vitest";
import { cnpjValido, formatarCnpj, normalizarCnpj } from "@/lib/cnpj";

describe("CNPJ", () => {
  it("aceita CNPJ válido com ou sem pontuação", () => {
    expect(cnpjValido("11.222.333/0001-81")).toBe(true);
    expect(cnpjValido("11222333000181")).toBe(true);
  });

  it("recusa dígito verificador errado, tamanho errado e números repetidos", () => {
    expect(cnpjValido("11.222.333/0001-82")).toBe(false);
    expect(cnpjValido("1122233300018")).toBe(false);
    expect(cnpjValido("00000000000000")).toBe(false);
  });

  it("formata e normaliza", () => {
    expect(formatarCnpj("11222333000181")).toBe("11.222.333/0001-81");
    expect(formatarCnpj(null)).toBe("—");
    expect(normalizarCnpj("11.222.333/0001-81")).toBe("11222333000181");
  });
});
