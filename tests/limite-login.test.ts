import { describe, it, expect } from "vitest";
import { MAX_ERROS_POR_EMAIL, MAX_ERROS_POR_IP, bloqueado, chaveEmail, inicioDaJanela, ipDaRequisicao } from "@/lib/limite-login";

describe("limite de tentativas de login", () => {
  it("bloqueia o e-mail depois de 5 erros e o endereço depois de 20", () => {
    expect(bloqueado(MAX_ERROS_POR_EMAIL - 1, 0)).toBe(false);
    expect(bloqueado(MAX_ERROS_POR_EMAIL, 0)).toBe(true);
    expect(bloqueado(0, MAX_ERROS_POR_IP - 1)).toBe(false);
    expect(bloqueado(0, MAX_ERROS_POR_IP)).toBe(true);
  });

  it("a conta pública de demonstração não é trancada pelo e-mail, só pelo endereço", () => {
    expect(bloqueado(50, 0, false)).toBe(false);
    expect(bloqueado(50, MAX_ERROS_POR_IP, false)).toBe(true);
  });

  it("lê o endereço de quem acessa e normaliza o e-mail", () => {
    expect(ipDaRequisicao(new Headers({ "x-forwarded-for": "200.1.2.3, 10.0.0.1" }))).toBe("200.1.2.3");
    expect(ipDaRequisicao(new Headers())).toBe("desconhecido");
    expect(chaveEmail("  Ana@Exemplo.COM ")).toBe("email:ana@exemplo.com");
  });

  it("conta só os últimos 15 minutos", () => {
    const agora = new Date("2026-11-20T12:00:00Z");
    expect(inicioDaJanela(agora).toISOString()).toBe("2026-11-20T11:45:00.000Z");
  });
});
