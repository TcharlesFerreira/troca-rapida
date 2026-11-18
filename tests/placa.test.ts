import { describe, it, expect } from "vitest";
import { formatarPlaca, normalizarPlaca, placaValida, tipoPlaca } from "@/lib/placa";

describe("placa", () => {
  it("normaliza maiúscula, sem hífen e sem espaços", () => {
    expect(normalizarPlaca("abc-1234")).toBe("ABC1234");
    expect(normalizarPlaca(" abc 1d23 ")).toBe("ABC1D23");
    expect(normalizarPlaca("ABC1D23")).toBe("ABC1D23");
  });

  it("aceita o formato antigo, com ou sem hífen, maiúscula ou minúscula", () => {
    for (const entrada of ["ABC1234", "abc1234", "ABC-1234", "abc-1234"]) {
      expect(placaValida(entrada)).toBe(true);
      expect(tipoPlaca(entrada)).toBe("ANTIGA");
      expect(normalizarPlaca(entrada)).toBe("ABC1234");
    }
  });

  it("aceita o formato Mercosul, com ou sem hífen, maiúscula ou minúscula", () => {
    for (const entrada of ["ABC1D23", "abc1d23", "ABC-1D23", "abc-1d23"]) {
      expect(placaValida(entrada)).toBe(true);
      expect(tipoPlaca(entrada)).toBe("MERCOSUL");
      expect(normalizarPlaca(entrada)).toBe("ABC1D23");
    }
  });

  it("rejeita placas inválidas", () => {
    for (const entrada of ["", "ABC123", "AB1234", "ABCD123", "ABC12345", "1234ABC", "ABC1DD3", "ABC1D2"]) {
      expect(placaValida(entrada)).toBe(false);
    }
  });

  it("formata para exibição", () => {
    expect(formatarPlaca("abc1234")).toBe("ABC-1234");
    expect(formatarPlaca("abc-1d23")).toBe("ABC1D23");
  });
});
